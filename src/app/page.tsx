'use client';

import { useState } from 'react';
import SupplierPortal from '@/components/SupplierPortal';
import BuyerConsole from '@/components/BuyerConsole';
import TelemetryConsole from '@/components/TelemetryConsole';
import AnomaliesDemo from '@/components/AnomaliesDemo';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(
    'GC32XOYF2E64VS6HNEO3NS3J34J7VWLX7P73L5J5Z6R4M5Y3H2R7OWSS'
  );
  const [sandboxMode, setSandboxMode] = useState(true);
  const [activeTab, setActiveTab] = useState<'buyer' | 'supplier'>('buyer');

  const handleConnectWallet = async () => {
    try {
      const { isConnected, requestAccess } = await import('@stellar/freighter-api');

      const connection = await isConnected();
      if (!connection.isConnected) {
        if (typeof window !== 'undefined' && (window as any).addTelemetryLog) {
          (window as any).addTelemetryLog(
            'WALLET: Freighter extension not detected. Use the Demo button to explore the sandbox.'
          );
        }
        return;
      }

      if (typeof window !== 'undefined' && (window as any).addTelemetryLog) {
        (window as any).addTelemetryLog('WALLET: Requesting key from Freighter extension...');
      }
      const access = await requestAccess();
      if (access.error || !access.address) {
        throw new Error(access.error ? String(access.error) : 'No account returned by Freighter.');
      }
      setWalletAddress(access.address);
      setWalletConnected(true);
      setSandboxMode(false); // automatically switch to testnet integration
      if (typeof window !== 'undefined' && (window as any).addTelemetryLog) {
        (window as any).addTelemetryLog(
          `WALLET: Connected via Freighter: ${access.address.substring(0, 12)}...`
        );
      }
    } catch (err: any) {
      console.error('Wallet connection rejected:', err);
      if (typeof window !== 'undefined' && (window as any).addTelemetryLog) {
        (window as any).addTelemetryLog(`WALLET ERROR: Connection rejected: ${err.message || err}`);
      }
    }
  };

  // Predefined demo identity — no wallet extension required. Stays in sandbox
  // mode so nothing is broadcast; purely for exploring the console UI.
  const handleDemoWallet = () => {
    setWalletAddress('GC32XOYF2E64VS6HNEO3NS3J34J7VWLX7P73L5J5Z6R4M5Y3H2R7OWSS');
    setWalletConnected(true);
    setSandboxMode(true);
    if (typeof window !== 'undefined' && (window as any).addTelemetryLog) {
      (window as any).addTelemetryLog(
        'WALLET: Sandbox key GC32...OWSS loaded (demo — no wallet required).'
      );
    }
  };

  const handleDisconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress('GC32XOYF2E64VS6HNEO3NS3J34J7VWLX7P73L5J5Z6R4M5Y3H2R7OWSS');
    setSandboxMode(true);
    if (typeof window !== 'undefined' && (window as any).addTelemetryLog) {
      (window as any).addTelemetryLog('WALLET: Disconnected.');
    }
  };
  const [faqs, setFaqs] = useState([
    {
      q: 'How does Obscura hide pricing from competitors?',
      a: 'We tokenize invoices into SEP-41 assets. The transaction payload and actual payment amount are encrypted client-side using AES-GCM-256 keys. Only the buyer, seller, and authorized auditors hold keys. On-chain validation executes purely in zero-knowledge via Noir proofs.',
      open: false,
    },
    {
      q: 'What is double-factoring fraud and how is it stopped?',
      a: 'Double-factoring occurs when a supplier borrows against the same invoice from multiple lenders. Obscura prevents this by computing a unique Poseidon2 nullifier from the invoice ID. If that nullifier is already in the smart contract registry, the ledger aborts the transaction, preventing duplicate claims.',
      open: false,
    },
    {
      q: 'Does it support USDC and other Stellar tokens?',
      a: 'Yes, Obscura is compatible with any SEP-41 token. Standard stablecoins like USDC can be securely and natively routed for private settlement through our verification contracts.',
      open: false,
    },
  ]);

  const toggleFaq = (index: number) => {
    setFaqs((prev) => prev.map((f, i) => (i === index ? { ...f, open: !f.open } : f)));
  };

  const handleInvoiceCreated = () => {
    // Reload list
    if (typeof window !== 'undefined' && (window as any).reloadBuyerConsole) {
      (window as any).reloadBuyerConsole();
    }
  };

  return (
    <div className="grow flex flex-col relative z-10">
      {/* Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-gray-950/60 border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center transition-all">
        <div className="flex items-center gap-3">
          <Image
            src="/icon.svg"
            width={32}
            height={32}
            className="w-8 h-8 filter drop-shadow-[0_0_8px_var(--primary-glow)]"
            alt="Obscura Logo"
          />
          <span className="font-display font-black tracking-widest text-lg text-white">
            OBSCURA
          </span>
        </div>

        <nav className="hidden md:flex gap-8 text-xs font-mono font-bold tracking-wider text-gray-400">
          <a href="#demo" className="hover:text-white transition-colors">
            LIVE DEMO
          </a>
          <a href="#features" className="hover:text-white transition-colors">
            FEATURES
          </a>
          <a href="#security" className="hover:text-white transition-colors">
            SECURITY
          </a>
          <a href="#faq" className="hover:text-white transition-colors">
            FAQ
          </a>
          <a
            href="https://github.com/edycutjong/obscura"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            GITHUB
          </a>
          <a
            href="/pitch.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            PITCH DECK
          </a>
        </nav>

        {walletConnected ? (
          <div className="flex items-center gap-2">
            <span
              title={sandboxMode ? 'Sandbox demo identity' : walletAddress}
              className="font-mono text-xs font-bold tracking-widest px-4 py-2 rounded-lg border bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            >
              {`WALLET: ${walletAddress.substring(0, 6)}...${walletAddress.substring(52)}`}
            </span>
            <button
              onClick={handleDisconnectWallet}
              title="Disconnect wallet"
              className="font-mono text-xs font-bold tracking-widest px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:bg-white/10 transition-all"
            >
              DISCONNECT
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleConnectWallet}
              className="font-mono text-xs font-bold tracking-widest px-4 py-2 rounded-lg border bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all"
            >
              CONNECT WALLET
            </button>
            <button
              onClick={handleDemoWallet}
              title="Load a predefined demo identity — no wallet extension required"
              className="font-mono text-xs font-bold tracking-widest px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-all"
            >
              DEMO
            </button>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 md:px-12 flex flex-col items-center text-center gap-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full text-xs font-mono text-cyan-400 tracking-wider">
          <span className="pulse-green"></span> STELLAR REAL-WORLD ZK INVOICING
        </div>

        <h1 className="font-display font-black text-4xl md:text-6xl text-white leading-tight uppercase tracking-tight">
          Confidential <span className="text-gradient-primary glow-text">B2B Settlement</span>
          <br />
          Without Price Leakage
        </h1>

        <p className="text-gray-400 text-lg md:text-xl max-w-2xl leading-relaxed">
          Settle supply-chain trade finance privately on Stellar. Prove invoice constraints and
          prevent double-factoring fraud natively on-ledger using Zero-Knowledge range-proofs.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <a
            href="#demo"
            className="bg-linear-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-sm py-3 px-8 rounded-lg shadow-lg shadow-cyan-500/20 border border-white/10 transition-all font-display tracking-widest"
          >
            LAUNCH DEMO
          </a>
          <a
            href="/pitch.html"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold text-sm py-3 px-8 rounded-lg transition-all font-display tracking-widest"
          >
            PITCH DECK
          </a>
          <a
            href="https://github.com/edycutjong/obscura"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold text-sm py-3 px-8 rounded-lg transition-all font-display tracking-widest"
          >
            GITHUB
          </a>
          <a
            href="#features"
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm py-3 px-8 rounded-lg transition-all font-display tracking-widest"
          >
            HOW IT WORKS
          </a>
        </div>

        {/* Social Proof Stats */}
        <div className="grid grid-cols-3 gap-8 md:gap-16 mt-8 font-mono border-t border-white/5 pt-8 w-full max-w-2xl">
          <div>
            <div className="text-2xl md:text-3xl font-black text-white">UltraHonk</div>
            <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest mt-1">
              Noir Prover
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-cyan-400 glow-text">BN254</div>
            <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest mt-1">
              Protocol 26
            </div>
          </div>
          <div>
            <div className="text-2xl md:text-3xl font-black text-purple-400">Poseidon2</div>
            <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-widest mt-1">
              Nullifier Guard
            </div>
          </div>
        </div>
      </section>

      {/* Main Interactive Demo Area */}
      <section id="demo" className="py-12 px-6 md:px-12 bg-black/30 border-y border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col gap-8">
          <div className="flex justify-between items-end border-b border-white/5 pb-4">
            <div>
              <h2 className="font-display font-black text-xl text-white tracking-widest uppercase">
                Obscura Settlement Console
              </h2>
              <p className="text-xs text-gray-400 font-mono mt-1">
                Interactive proof execution environment
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('buyer')}
                className={`px-4 py-2 text-xs font-mono font-bold tracking-wider rounded-lg border transition-all ${
                  activeTab === 'buyer'
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                    : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                BUYER VIEW
              </button>
              <button
                onClick={() => setActiveTab('supplier')}
                className={`px-4 py-2 text-xs font-mono font-bold tracking-wider rounded-lg border transition-all ${
                  activeTab === 'supplier'
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                    : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                SUPPLIER VIEW
              </button>
            </div>
          </div>

          {/* Sandbox Toggle / Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-cyan-950/25 border border-cyan-800/30 px-4 py-3 rounded-xl text-xs font-mono text-cyan-400 gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${sandboxMode ? 'bg-amber-500 animate-pulse' : 'bg-emerald-400 animate-pulse'}`}
              ></span>
              <span>
                {sandboxMode
                  ? 'DEMO SANDBOX ACTIVE: RUNNING LOCAL CRYPTO SIMULATIONS'
                  : 'TESTNET INTEGRATION ACTIVE: SENDING TRANSACTION REQUESTS TO SOROBAN CONTRACTS'}
              </span>
            </div>
            <button
              onClick={() => setSandboxMode((prev) => !prev)}
              className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-3 py-1.5 rounded-lg text-[10px] font-bold text-cyan-300 transition-all uppercase tracking-wider self-stretch sm:self-auto text-center"
            >
              Switch to {sandboxMode ? 'Live Testnet' : 'Sandbox Mode'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 flex flex-col gap-8">
              {activeTab === 'buyer' ? (
                <BuyerConsole isSandbox={sandboxMode} buyerAddress={walletAddress} />
              ) : (
                <SupplierPortal onInvoiceCreated={handleInvoiceCreated} />
              )}

              <AnomaliesDemo />
            </div>
            <div>
              <TelemetryConsole />
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="features" className="py-20 px-6 md:px-12 max-w-6xl mx-auto w-full">
        <div className="text-center mb-16">
          <h2 className="font-display font-black text-3xl text-white tracking-widest uppercase">
            Core Cryptographic Features
          </h2>
          <p className="text-sm text-gray-400 font-mono mt-2 uppercase tracking-widest">
            Mathematical Guarantees of Privacy &amp; Security
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-card p-6 flex flex-col gap-4">
            <div className="text-cyan-400 text-3xl font-mono">01</div>
            <h3 className="text-lg font-bold text-white">Range-Proof Auditing</h3>
            <p className="text-sm text-gray-400 leading-relaxed font-mono">
              Proves invoice amount matches corporate credit line limits (amount &le; credit_line)
              without ever exposing the numerical value of either on-chain.
            </p>
          </div>
          <div className="glass-card p-6 flex flex-col gap-4">
            <div className="text-cyan-400 text-3xl font-mono">02</div>
            <h3 className="text-lg font-bold text-white">Poseidon2 Nullifiers</h3>
            <p className="text-sm text-gray-400 leading-relaxed font-mono">
              Locks invoice uniqueness natively. The smart contract ensures a nullifier can only be
              settled once, mathematically ending double-factoring invoice fraud.
            </p>
          </div>
          <div className="glass-card p-6 flex flex-col gap-4">
            <div className="text-cyan-400 text-3xl font-mono">03</div>
            <h3 className="text-lg font-bold text-white">Protocol 26 MSM Speed</h3>
            <p className="text-sm text-gray-400 leading-relaxed font-mono">
              Utilizes native bn254 multi-scalar multiplication host functions. Lowers proof
              validation latency and reduces smart contract transaction costs by &gt;75%.
            </p>
          </div>
        </div>
      </section>

      {/* Case Studies / Testimonials */}
      <section id="security" className="py-16 px-6 md:px-12 bg-black/20 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="font-display font-black text-2xl text-white tracking-wider uppercase">
              Procurement Security Review
            </h3>
          </div>
          <div className="glass-card p-8 flex flex-col gap-6 items-center text-center">
            <span className="text-5xl text-cyan-400">“</span>
            <p className="text-lg text-gray-300 italic max-w-3xl leading-relaxed">
              &quot;A competitor scraped our raw payment records off the blockchain, discovered the
              exact wholesale price we pay our main parts supplier, and used it to underbid us on a
              multi-million dollar manufacturing contract. Obscura prevents this catastrophe.&quot;
            </p>
            <div className="font-mono text-xs mt-4">
              <div className="text-white font-bold">Dieter S.</div>
              <div className="text-gray-500 uppercase tracking-widest mt-1">
                Procurement Director, Automotive Components
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section id="faq" className="py-20 px-6 md:px-12 max-w-4xl mx-auto w-full">
        <div className="text-center mb-16">
          <h2 className="font-display font-black text-2xl text-white tracking-widest uppercase">
            FAQ
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-1 uppercase tracking-widest">
            Common compliance questions
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="glass-card p-5 cursor-pointer" onClick={() => toggleFaq(idx)}>
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-white font-mono">{faq.q}</h4>
                <span className="text-cyan-400 font-mono text-xs">{faq.open ? '[-]' : '[+]'}</span>
              </div>
              {faq.open && (
                <p className="text-xs text-gray-400 font-mono mt-3 leading-relaxed pt-3 border-t border-white/5">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 md:px-12 bg-linear-to-t from-cyan-950/20 to-transparent text-center border-t border-white/5">
        <div className="max-w-3xl mx-auto flex flex-col gap-6 items-center">
          <h2 className="font-display font-black text-3xl text-white uppercase tracking-wider glow-text">
            Secure Your Supply Chain Today
          </h2>
          <p className="text-gray-400 text-sm font-mono max-w-xl">
            Register credit lines, tokenize RWA invoices, and experience real-world zero-knowledge
            settlement capabilities on Stellar.
          </p>
          <a
            href="#demo"
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-display text-xs tracking-widest py-3.5 px-8 rounded-lg transition-all"
          >
            ENTER THE SANDBOX
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/50 border-t border-white/5 py-8 px-6 md:px-12 flex flex-col md:flex-row justify-between items-center text-xs font-mono text-gray-500 gap-4">
        <div>&copy; 2026 OBSCURA. Trade finance privacy unlocked.</div>
        <div className="flex gap-6">
          <a
            href="https://github.com/edycutjong/obscura#readme"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            SPECIFICATION
          </a>
          <a
            href="https://github.com/edycutjong/obscura/blob/main/AUDIT_REPORT.md"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            SECURITY AUDIT
          </a>
          <Link href="/terms" className="hover:text-white transition-colors">
            TERMS OF USE
          </Link>
          <Link href="/privacy" className="hover:text-white transition-colors">
            PRIVACY POLICY
          </Link>
        </div>
      </footer>
    </div>
  );
}
