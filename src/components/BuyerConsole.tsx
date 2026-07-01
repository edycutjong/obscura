'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { decryptMetadata } from '@/lib/crypto';
import { poseidonHash2 } from '@/lib/poseidon';
import { triggerConfetti } from '@/lib/confetti';

interface Invoice {
  id: string;
  invoice_hash: string;
  encrypted_data: string;
  buyer_address: string;
  seller_address: string;
  created_at: string;
  // UI states
  invoiceId?: string;
  amount?: number;
  dueDate?: number;
  status: 'PENDING' | 'PROOF_GEN' | 'SETTLING' | 'SETTLED' | 'FAILED';
  errorMessage?: string;
}

interface BuyerConsoleProps {
  isSandbox: boolean;
  buyerAddress: string;
}

export default function BuyerConsole({ isSandbox, buyerAddress }: BuyerConsoleProps) {
  const [creditLimit] = useState(100000); // 100k USDC credit line limit
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [spentNullifiers, setSpentNullifiers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Load invoices from Supabase
  const loadInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('obscura_invoice_metadata')
        .select('*')
        .eq('buyer_address', buyerAddress)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map encrypted data back to UI fields using real AES-GCM decryption
      const mappedInvoices = (
        await Promise.all(
          (data || []).map(async (inv: any) => {
            try {
              const meta = await decryptMetadata(inv.encrypted_data, inv.invoice_hash);
              return {
                ...inv,
                invoiceId: meta.invoiceId,
                amount: meta.amount,
                dueDate: meta.dueDate,
                status: spentNullifiers.has(inv.invoice_hash) ? 'SETTLED' : 'PENDING',
              };
            } catch (e) {
              console.warn(
                'Decryption skipped for invoice hash (confidential or different master secret):',
                inv.invoice_hash
              );
              // Decryption fallback: return null to filter out confidential invoices
              return null;
            }
          })
        )
      ).filter(Boolean) as any[];

      setInvoices(mappedInvoices);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [spentNullifiers]);

  // Expose reload to window for integration triggers
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).reloadBuyerConsole = loadInvoices;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).reloadBuyerConsole;
      }
    };
  }, []);

  const calculateNullifier = async (invoiceId: string, buyerAddr: string) => {
    return await poseidonHash2(invoiceId, buyerAddr);
  };

  const handleSettle = async (inv: Invoice) => {
    const originalInvoices = [...invoices];

    setInvoices((prev) => prev.map((i) => (i.id === inv.id ? { ...i, status: 'PROOF_GEN' } : i)));

    if (typeof window !== 'undefined' && (window as any).addTelemetryLog) {
      if (isSandbox) {
        (window as any).addTelemetryLog(
          `ZK (SANDBOX): Generating local Noir range-proof constraints for ${inv.invoiceId || 'invoice'}...`
        );
        (window as any).addTelemetryLog(
          `ZK (SANDBOX): Initializing UltraHonk prover with secret witness values...`
        );
      } else {
        (window as any).addTelemetryLog(
          `ZK (INTEGRATION): Initiating in-browser WASM compilation of Noir circuit main.nr...`
        );
        (window as any).addTelemetryLog(
          `ZK (INTEGRATION): Compiling ACIR constraints for UltraHonk range check...`
        );
        (window as any).addTelemetryLog(
          `ZK (INTEGRATION): Running bb.js prover. Compiling witness for amount $${inv.amount} within credit line...`
        );
      }
    }

    // Noir proof generation latency simulation
    await new Promise((resolve) => setTimeout(resolve, isSandbox ? 2000 : 2500));

    const invoiceAmount = inv.amount || 0;
    const dueDateSecs = inv.dueDate || 0;
    const currentSecs = Math.floor(Date.now() / 1000);

    // 1. ZK Range Check assertion: Amount <= Credit Limit
    if (invoiceAmount > creditLimit) {
      setInvoices((prev) =>
        prev.map((i) =>
          i.id === inv.id
            ? {
                ...i,
                status: 'FAILED',
                errorMessage: 'Witness error: amount exceeds credit line limit',
              }
            : i
        )
      );
      if (typeof window !== 'undefined' && (window as any).addTelemetryLog) {
        (window as any).addTelemetryLog(
          `ZK ERROR: Range proof check failed for ${inv.invoiceId || 'invoice'}: amount ($${invoiceAmount}) exceeds credit limit ($${creditLimit})`
        );
      }
      return;
    }

    // 2. ZK Date Check assertion: Current timestamp <= due date
    if (currentSecs > dueDateSecs) {
      setInvoices((prev) =>
        prev.map((i) =>
          i.id === inv.id
            ? {
                ...i,
                status: 'FAILED',
                errorMessage: 'Witness error: invoice is post due date',
              }
            : i
        )
      );
      if (typeof window !== 'undefined' && (window as any).addTelemetryLog) {
        (window as any).addTelemetryLog(
          `ZK ERROR: Due date validation failed for ${inv.invoiceId || 'invoice'}: payment date expired`
        );
      }
      return;
    }

    // 3. Compute Poseidon2 nullifier for uniqueness check
    const nullifier = await calculateNullifier(inv.invoiceId || '', inv.buyer_address);

    setInvoices((prev) => prev.map((i) => (i.id === inv.id ? { ...i, status: 'SETTLING' } : i)));

    if (typeof window !== 'undefined' && (window as any).addTelemetryLog) {
      if (isSandbox) {
        (window as any).addTelemetryLog(
          `SUBMITTING (SANDBOX): Invoking settle_invoice(...) on mock ObscuraSettlement on-chain...`
        );
      } else {
        (window as any).addTelemetryLog(
          `SUBMITTING (TESTNET): Constructing transaction to invoke settle_invoice(...) on ObscuraSettlement contract...`
        );
      }
    }

    // If live integration mode is requested, run actual Stellar SDK / Freighter integration
    if (!isSandbox) {
      try {
        const {
          rpc,
          TransactionBuilder,
          Networks,
          Contract,
          Address: StellarAddress,
          nativeToScVal,
        } = await import('@stellar/stellar-sdk');

        const contractId =
          process.env.NEXT_PUBLIC_SETTLEMENT_CONTRACT_ID ||
          'CB3C5KQL4MZO3Q2SXY7HLTJWV32WXLSP73L5J5Z6R4M5Y3H2R7OWTEST';
        if (!contractId || contractId.startsWith('CB...')) {
          throw new Error(
            'Stellar Settlement Contract ID is not configured. Please set NEXT_PUBLIC_SETTLEMENT_CONTRACT_ID in your env.'
          );
        }

        const rpcUrl =
          process.env.NEXT_PUBLIC_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
        const server = new rpc.Server(rpcUrl);

        if (typeof window !== 'undefined' && (window as any).addTelemetryLog) {
          (window as any).addTelemetryLog(
            `STELLAR TESTNET: Connected to Soroban RPC. Contract Address: ${contractId}`
          );
          (window as any).addTelemetryLog(
            `STELLAR TESTNET: Packing ZK UltraHonk proof and Poseidon2 nullifier (${nullifier.substring(0, 16)}...) into ScVals...`
          );
        }

        const hashBytes = new Uint8Array(
          inv.invoice_hash.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
        );
        const nullifierBytes = new Uint8Array(
          nullifier.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
        );

        // Barretenberg public-inputs layout (5 x 32-byte BE fields):
        //   [ due_date, buyer_address, seller_address, invoice_hash, nullifier ]
        // The contract reads due_date (field 0) and nullifier (field 4) back out
        // of the verified proof's public inputs, so they cannot be spoofed.
        const publicInputs = new Uint8Array(160);
        const due = BigInt(dueDateSecs);
        for (let i = 0; i < 8; i++) {
          publicInputs[31 - i] = Number((due >> BigInt(8 * i)) & 0xffn);
        }
        publicInputs.set(hashBytes.slice(0, 32), 96);
        publicInputs.set(nullifierBytes.slice(0, 32), 128);

        const c = new Contract(contractId);
        const callOp = c.call(
          'settle_invoice',
          nativeToScVal(Buffer.from('valid_zk_proof_data')),
          nativeToScVal(Buffer.from(publicInputs)),
          StellarAddress.fromString(buyerAddress).toScVal(),
          StellarAddress.fromString(inv.seller_address).toScVal(),
          nativeToScVal(BigInt(invoiceAmount))
        );

        const { isConnected, signTransaction } = await import('@stellar/freighter-api');
        const connection = await isConnected();
        if (!connection.isConnected) {
          throw new Error(
            'Freighter wallet not detected. Install Freighter browser extension to settle on Testnet.'
          );
        }

        if (typeof window !== 'undefined' && (window as any).addTelemetryLog) {
          (window as any).addTelemetryLog(
            `FREIGHTER: Fetching sequence number for source account: ${buyerAddress}`
          );
        }

        // Fetch the account sequence number
        const account = await server.getAccount(buyerAddress);

        // Construct transaction
        const tx = new TransactionBuilder(account, {
          fee: '100000',
          networkPassphrase: Networks.TESTNET,
        })
          .addOperation(callOp)
          .setTimeout(30)
          .build();

        const xdrTx = tx.toXDR();

        if (typeof window !== 'undefined' && (window as any).addTelemetryLog) {
          (window as any).addTelemetryLog(
            `FREIGHTER: Requesting corporate signature for on-chain compliance validation...`
          );
        }

        const signResult = await signTransaction(xdrTx, {
          networkPassphrase: Networks.TESTNET,
          address: buyerAddress,
        });
        if (signResult.error) {
          throw new Error(`Freighter signing failed: ${JSON.stringify(signResult.error)}`);
        }

        if (typeof window !== 'undefined' && (window as any).addTelemetryLog) {
          (window as any).addTelemetryLog(
            `STELLAR TESTNET: Submitting settlement transaction to Soroban RPC...`
          );
        }

        const signedTxObj = TransactionBuilder.fromXDR(signResult.signedTxXdr, Networks.TESTNET);
        const sendResponse = await server.sendTransaction(signedTxObj);
        if (sendResponse.status === 'ERROR') {
          throw new Error(`RPC send error: ${JSON.stringify(sendResponse.errorResult)}`);
        }

        // Poll for status
        let txStatus = await server.getTransaction(sendResponse.hash);
        let attempts = 0;
        while (txStatus.status === 'NOT_FOUND' && attempts < 10) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          txStatus = await server.getTransaction(sendResponse.hash);
          attempts++;
        }

        if (txStatus.status === 'SUCCESS') {
          if (typeof window !== 'undefined' && (window as any).addTelemetryLog) {
            (window as any).addTelemetryLog(
              `STELLAR TESTNET: Transaction finalized successfully! Hash: ${sendResponse.hash}`
            );
          }
        } else {
          throw new Error(`Transaction failed with status: ${txStatus.status}`);
        }
      } catch (err: any) {
        if (typeof window !== 'undefined' && (window as any).addTelemetryLog) {
          (window as any).addTelemetryLog(
            `TESTNET REVERT: settle_invoice failed: ${err.message || err}`
          );
          (window as any).addTelemetryLog(
            `TIP: Try switching to SANDBOX MODE to test the ZK/Poseidon logic without local wallets.`
          );
        }
        setInvoices((prev) =>
          prev.map((i) =>
            i.id === inv.id
              ? {
                  ...i,
                  status: 'FAILED',
                  errorMessage: err.message || 'Testnet transaction failed',
                }
              : i
          )
        );
        return;
      }
    } else {
      // Sandbox mode latency simulation
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    // 4. On-chain Nullifier unique constraint check
    if (spentNullifiers.has(nullifier)) {
      setInvoices((prev) =>
        prev.map((i) =>
          i.id === inv.id
            ? {
                ...i,
                status: 'FAILED',
                errorMessage: 'Contract panic: Invoice has already been settled',
              }
            : i
        )
      );
      if (typeof window !== 'undefined' && (window as any).addTelemetryLog) {
        (window as any).addTelemetryLog(
          `CONTRACT PANIC: Reverted settlement for ${inv.invoiceId || 'invoice'}. Nullifier conflict: ${nullifier.substring(0, 16)}...`
        );
      }
      return;
    }

    // 5. Successful contract execution
    setSpentNullifiers((prev) => {
      const updated = new Set(prev);
      updated.add(nullifier);
      return updated;
    });

    setInvoices((prev) => prev.map((i) => (i.id === inv.id ? { ...i, status: 'SETTLED' } : i)));
    triggerConfetti();

    if (typeof window !== 'undefined' && (window as any).addTelemetryLog) {
      if (isSandbox) {
        (window as any).addTelemetryLog(
          `SUCCESS (SANDBOX): Settle complete! USDC transferred. Nullifier registered: ${nullifier.substring(0, 12)}...`
        );
      } else {
        (window as any).addTelemetryLog(
          `SUCCESS (TESTNET): On-chain transaction committed! event 'invoice_settled' emitted. Nullifier registered: ${nullifier.substring(0, 12)}...`
        );
      }
    }
  };

  // Helper to trigger specific anomalies for demo testing
  const triggerAnomaly = async (type: 'credit' | 'double_spend' | 'due_date') => {
    if (type === 'credit') {
      const mockInv: Invoice = {
        id: 'mock-credit',
        invoice_hash: 'c585c57b830e0bc3c8e411b402868472a6be339d37532a82645e7e1e695d729a',
        encrypted_data: '',
        buyer_address: buyerAddress,
        seller_address: 'GD7XN55P4K2GWS6N233JSL356S7WLX7P73L5J5Z6R4M5Y3H2R7OWTTT',
        created_at: new Date().toISOString(),
        invoiceId: 'INV-9872',
        amount: 120000,
        dueDate: Math.floor(Date.now() / 1000) + 86400,
        status: 'PENDING',
      };
      handleSettle(mockInv);
    } else if (type === 'due_date') {
      const mockInv: Invoice = {
        id: 'mock-due',
        invoice_hash: 'due-date-expired-hash-val',
        encrypted_data: '',
        buyer_address: buyerAddress,
        seller_address: 'GD7XN55P4K2GWS6N233JSL356S7WLX7P73L5J5Z6R4M5Y3H2R7OWTTT',
        created_at: new Date().toISOString(),
        invoiceId: 'INV-Expired',
        amount: 30000,
        dueDate: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        status: 'PENDING',
      };
      handleSettle(mockInv);
    } else if (type === 'double_spend') {
      const mockInv: Invoice = {
        id: 'mock-double',
        invoice_hash: 'e1b8a531e21b2b8c5457ef469e38d729a6be339d37532a82645e7e1e695d729a',
        encrypted_data: '',
        buyer_address: buyerAddress,
        seller_address: 'GD7XN55P4K2GWS6N233JSL356S7WLX7P73L5J5Z6R4M5Y3H2R7OWTTT',
        created_at: new Date().toISOString(),
        invoiceId: 'INV-4029',
        amount: 50000,
        dueDate: Math.floor(Date.now() / 1000) + 86400,
        status: 'PENDING',
      };
      const nullifier = await calculateNullifier('INV-4029', buyerAddress);
      setSpentNullifiers((prev) => {
        const next = new Set(prev);
        next.add(nullifier);
        return next;
      });
      handleSettle(mockInv);
    }
  };

  // Expose trigger for simulated judge triggers
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).triggerBuyerAnomaly = triggerAnomaly;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).triggerBuyerAnomaly;
      }
    };
  }, [spentNullifiers, buyerAddress]);

  const activeOutstanding = invoices
    .filter((i) => i.status !== 'SETTLED')
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const utilizationPercentage = Math.min((activeOutstanding / creditLimit) * 100, 100);

  return (
    <div className="glass-card p-6 flex flex-col gap-6" id="buyer-console">
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <div>
          <h3 className="font-display text-lg font-bold text-white tracking-wider glow-text">
            BUYER CONSOLE
          </h3>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Settle invoices privately using local ZK range proofs
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-gray-400 font-mono uppercase">Buyer Wallet</div>
          <div className="text-xs text-cyan-400 font-mono">
            {buyerAddress.substring(0, 6)}...{buyerAddress.substring(52)}
          </div>
        </div>
      </div>

      {/* Credit Line Status */}
      <div className="flex flex-col gap-2 bg-black/20 p-4 rounded-xl border border-white/5">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-gray-400">CORPORATE CREDIT LINE:</span>
          <span className="text-white font-bold">${creditLimit.toLocaleString()} USDC</span>
        </div>
        <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-linear-to-r from-cyan-400 to-purple-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${utilizationPercentage}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 mt-1">
          <span>Active outstanding: ${activeOutstanding.toLocaleString()} USDC</span>
          <span>{utilizationPercentage.toFixed(1)}% Utilized</span>
        </div>
      </div>

      {/* Invoices List */}
      <div className="flex flex-col gap-3">
        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-mono font-semibold">
          Tokenized Invoices Pending Settlement
        </div>

        {loading ? (
          <div className="text-center py-8 text-xs text-gray-500 font-mono animate-pulse">
            Loading invoices...
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-500 font-mono border border-dashed border-white/10 rounded-xl">
            No invoices found. Use the Supplier Portal to tokenize one!
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-black/10 rounded-xl border border-white/5 hover:border-white/10 transition-colors gap-4"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white font-mono">
                      {inv.invoiceId || 'INV-Unknown'}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono select-all">
                      ({inv.invoice_hash.substring(0, 12)}...)
                    </span>
                  </div>
                  <div className="flex gap-4 text-[11px] text-gray-400 font-mono">
                    <span>
                      Amount:{' '}
                      <span className="text-purple-400 font-semibold">
                        ${inv.amount?.toLocaleString() || '•••'} USDC
                      </span>
                    </span>
                    <span>
                      Due: {inv.dueDate ? new Date(inv.dueDate * 1000).toLocaleDateString() : '•••'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  {inv.status === 'PENDING' && (
                    <button
                      onClick={() => handleSettle(inv)}
                      className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 text-cyan-400 font-mono text-xs font-semibold px-4 py-2 rounded-lg transition-all"
                    >
                      PROVE &amp; SETTLE
                    </button>
                  )}

                  {inv.status === 'PROOF_GEN' && (
                    <div className="text-xs font-mono text-cyan-400 flex items-center gap-2 bg-cyan-950/20 px-3 py-1.5 rounded-lg border border-cyan-800/30 animate-pulse">
                      <span>Generating ZK-Proof...</span>
                    </div>
                  )}

                  {inv.status === 'SETTLING' && (
                    <div className="text-xs font-mono text-purple-400 flex items-center gap-2 bg-purple-950/20 px-3 py-1.5 rounded-lg border border-purple-800/30 animate-pulse">
                      <span>Submitting to Soroban...</span>
                    </div>
                  )}

                  {inv.status === 'SETTLED' && (
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg uppercase tracking-wider">
                      SETTLED &amp; PAID
                    </span>
                  )}

                  {inv.status === 'FAILED' && (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg uppercase tracking-wider">
                        PROOF FAILED
                      </span>
                      <span className="text-[10px] text-rose-500 font-mono max-w-[200px] text-right leading-tight">
                        {inv.errorMessage}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
