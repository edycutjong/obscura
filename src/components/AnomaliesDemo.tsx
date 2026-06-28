'use client';

interface AnomaliesDemoProps {
  // Empty
}

export default function AnomaliesDemo({}: AnomaliesDemoProps) {
  const trigger = (type: 'credit' | 'double_spend' | 'due_date') => {
    if (typeof window !== 'undefined' && (window as any).triggerBuyerAnomaly) {
      (window as any).triggerBuyerAnomaly(type);
    } else {
      alert('Buyer Console is not fully mounted yet.');
    }
  };

  return (
    <div className="glass-card p-6 flex flex-col gap-6" id="anomalies-demo">
      <div>
        <h3 className="font-display text-lg font-bold text-white tracking-wider glow-text">
          COMPLIANCE &amp; EXPLOIT TESTING
        </h3>
        <p className="text-xs text-gray-400 font-mono mt-1">
          Simulate anomalies to trigger contract and circuit rejections
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Case 1: Credit Line exploit */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-rose-950/10 border border-rose-900/20 rounded-xl gap-4">
          <div className="grow">
            <h4 className="text-sm font-bold text-white font-mono">
              1. Credit Line Exploit Attempt
            </h4>
            <p className="text-xs text-gray-400 mt-1">
              Attempt to settle an invoice of $120,000 when approved credit limit is $100,000.
            </p>
            <div className="text-[10px] text-rose-400 font-mono mt-2 uppercase tracking-wider">
              Expected: Witness Range-Check Assertion Error
            </div>
          </div>
          <button
            onClick={() => trigger('credit')}
            className="w-full md:w-auto bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-mono text-xs font-semibold px-4 py-2 rounded-lg transition-all whitespace-nowrap"
          >
            TRIGGER EXPLOIT
          </button>
        </div>

        {/* Case 2: Double factoring */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-rose-950/10 border border-rose-900/20 rounded-xl gap-4">
          <div className="grow">
            <h4 className="text-sm font-bold text-white font-mono">2. Double-Factoring Fraud</h4>
            <p className="text-xs text-gray-400 mt-1">
              Attempt to reuse the same invoice ID (INV-4029) to borrow against or settle a second
              time.
            </p>
            <div className="text-[10px] text-rose-400 font-mono mt-2 uppercase tracking-wider">
              Expected: On-Chain Nullifier Registry Revert
            </div>
          </div>
          <button
            onClick={() => trigger('double_spend')}
            className="w-full md:w-auto bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-mono text-xs font-semibold px-4 py-2 rounded-lg transition-all whitespace-nowrap"
          >
            TRIGGER FRAUD
          </button>
        </div>

        {/* Case 3: Post due date */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-rose-950/10 border border-rose-900/20 rounded-xl gap-4">
          <div className="grow">
            <h4 className="text-sm font-bold text-white font-mono">
              3. Expired Payment Term Settlement
            </h4>
            <p className="text-xs text-gray-400 mt-1">
              Submit an invoice with a due date of 1 hour in the past. Ledger rejects terms
              compliance.
            </p>
            <div className="text-[10px] text-rose-400 font-mono mt-2 uppercase tracking-wider">
              Expected: Ledger Time-Constraint Violation
            </div>
          </div>
          <button
            onClick={() => trigger('due_date')}
            className="w-full md:w-auto bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-mono text-xs font-semibold px-4 py-2 rounded-lg transition-all whitespace-nowrap"
          >
            TRIGGER VIOLATION
          </button>
        </div>
      </div>
    </div>
  );
}
