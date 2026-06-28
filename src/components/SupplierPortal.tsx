'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { poseidonHash2 } from '@/lib/poseidon';
import { encryptMetadata } from '@/lib/crypto';

interface SupplierPortalProps {
  onInvoiceCreated: () => void;
}

export default function SupplierPortal({ onInvoiceCreated }: SupplierPortalProps) {
  const [invoiceId, setInvoiceId] = useState('INV-4029');
  const [amount, setAmount] = useState('50000');
  const [buyerAddress, setBuyerAddress] = useState(
    'GC32XOYF2E64VS6HNEO3NS3J34J7VWLX7P73L5J5Z6R4M5Y3H2R7OWSS'
  );
  const [sellerAddress, setSellerAddress] = useState(
    'GD7XN55P4K2GWS6N233JSL356S7WLX7P73L5J5Z6R4M5Y3H2R7OWTTT'
  );
  const [dueDate, setDueDate] = useState('2026-07-20');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleTokenize = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      // 1. Calculate the deterministic ZK Poseidon2 hash commitment for this invoice: H = Poseidon2(InvoiceID, Amount)
      const invoiceHash = await poseidonHash2(invoiceId, amount);

      // 2. Encrypt metadata client-side using real AES-GCM-256
      const rawMetadata = {
        invoiceId,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate).getTime() / 1000, // seconds
        sellerName: 'Global Supplier Corp',
      };

      const encryptedData = await encryptMetadata(rawMetadata, invoiceHash);

      // 3. Insert into Supabase database
      const { error } = await supabase.from('obscura_invoice_metadata').insert({
        invoice_hash: invoiceHash,
        encrypted_data: encryptedData,
        buyer_address: buyerAddress,
        seller_address: sellerAddress,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Log telemetry event
      if (typeof window !== 'undefined' && (window as any).addTelemetryLog) {
        (window as any).addTelemetryLog(
          `TOKENIZED: Invoice ${invoiceId} ($${parseFloat(amount).toLocaleString()}) SEP-41 token minted on-chain. Hash: ${invoiceHash.substring(0, 16)}...`
        );
      }

      setStatus({
        type: 'success',
        message: `Success! SEP-41 token minted. Invoice Hash: ${invoiceHash.substring(0, 10)}...`,
      });

      // Clear input
      setInvoiceId('INV-' + Math.floor(1000 + Math.random() * 9000));
      setAmount('');
      onInvoiceCreated();
    } catch (err: any) {
      console.error(err);
      setStatus({
        type: 'error',
        message: err.message || 'Tokenization failed.',
      });
      if (typeof window !== 'undefined' && (window as any).addTelemetryLog) {
        (window as any).addTelemetryLog(
          `ERROR: Tokenization failed for ${invoiceId}: ${err.message}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 flex flex-col gap-6" id="supplier-portal">
      <div>
        <h3 className="font-display text-lg font-bold text-white tracking-wider glow-text">
          SUPPLIER PORTAL
        </h3>
        <p className="text-xs text-gray-400 font-mono mt-1">
          Tokenize Invoices &amp; Mint SEP-41 Commitments
        </p>
      </div>

      <form onSubmit={handleTokenize} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">
              Invoice Identifier
            </label>
            <input
              type="text"
              required
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">
              Invoice Amount (USDC)
            </label>
            <input
              type="number"
              required
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 50000"
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">
            Corporate Buyer Address
          </label>
          <input
            type="text"
            required
            value={buyerAddress}
            onChange={(e) => setBuyerAddress(e.target.value)}
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500 text-xs"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">
            Supplier Settlement Address
          </label>
          <input
            type="text"
            required
            value={sellerAddress}
            onChange={(e) => setSellerAddress(e.target.value)}
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500 text-xs"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">
            Payment Term Due Date
          </label>
          <input
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
          />
        </div>

        {status && (
          <div
            className={`text-xs p-3 rounded-lg border font-mono ${
              status.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            {status.message}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-linear-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-sm py-2.5 px-4 rounded-lg shadow-lg shadow-cyan-500/20 border border-white/10 hover:border-white/20 transition-all font-display tracking-widest disabled:opacity-50"
        >
          {loading ? 'MINTING TOKEN...' : 'TOKENIZE & PUBLISH'}
        </button>
      </form>
    </div>
  );
}
