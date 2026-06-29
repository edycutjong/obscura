'use client';

import { useEffect, useState } from 'react';

interface TelemetryData {
  status: string;
  network: string;
  contracts: {
    settlement: string;
    verifier: string;
    usdc: string;
  };
  active_nullifiers: number;
  protocol_version: number;
}

export default function TelemetryConsole() {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // Load initial config
    fetch('/api/integrations/verify')
      .then((res) => res.json())
      .then((config) => {
        setData(config);
        setLoading(false);
        setLogs([
          `[${new Date().toLocaleTimeString()}] Systems initialized. Network: ${config.network.toUpperCase()}`,
          `[${new Date().toLocaleTimeString()}] Deployed verifier: ${config.contracts.verifier.substring(0, 10)}...`,
          `[${new Date().toLocaleTimeString()}] Deployed settlement: ${config.contracts.settlement.substring(0, 10)}...`,
          `[${new Date().toLocaleTimeString()}] Protocol version ${config.protocol_version} host functions ready.`,
        ]);
      })
      .catch((err) => {
        console.error('Failed to load telemetry:', err);
        setLoading(false);
      });
  }, []);

  const addLog = (message: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev.slice(0, 19)]);
  };

  // Expose addLog to window for simulation testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).addTelemetryLog = addLog;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).addTelemetryLog;
      }
    };
  }, []);

  if (loading || !data) {
    return (
      <div className="glass-card p-6 flex flex-col gap-4 animate-pulse">
        <div className="h-6 w-32 bg-gray-700 rounded"></div>
        <div className="h-4 w-48 bg-gray-700 rounded"></div>
        <div className="h-32 bg-gray-800 rounded"></div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 flex flex-col gap-6" id="telemetry-console">
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <div>
          <h3 className="font-display text-lg font-bold text-white tracking-wider glow-text">
            SYSTEM TELEMETRY
          </h3>
          <p className="text-xs text-gray-400 font-mono mt-1">
            Stellar Protocol 26 Network Diagnostics
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
          <div className="pulse-green"></div>
          <span className="text-xs font-mono text-emerald-400 font-semibold tracking-widest uppercase">
            ONLINE
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
        <div className="bg-black/20 p-3 rounded-lg border border-white/5">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest">Target Network</div>
          <div className="text-sm font-bold text-white mt-1 uppercase">{data.network}</div>
        </div>
        <div className="bg-black/20 p-3 rounded-lg border border-white/5">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest">
            Protocol Version
          </div>
          <div className="text-sm font-bold text-white mt-1">v{data.protocol_version} (MSM)</div>
        </div>
        <div className="bg-black/20 p-3 rounded-lg border border-white/5">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest">
            Verifier Gas Limit
          </div>
          <div className="text-sm font-bold text-cyan-400 mt-1">30M CPU Inst.</div>
        </div>
        <div className="bg-black/20 p-3 rounded-lg border border-white/5">
          <div className="text-[10px] text-gray-500 uppercase tracking-widest">
            Active Nullifiers
          </div>
          <div className="text-sm font-bold text-purple-400 mt-1">
            {data.active_nullifiers} registered
          </div>
        </div>
      </div>

      <div className="font-mono text-xs flex flex-col gap-2">
        <div className="text-[10px] text-gray-500 uppercase tracking-widest">
          Deployed Smart Contracts
        </div>
        <div className="bg-black/30 p-3 rounded-lg flex flex-col gap-3.5 border border-white/5">
          <div className="flex flex-col gap-1">
            <span className="text-gray-500 text-[10px] uppercase tracking-wider">Verifier:</span>
            <span className="text-cyan-400 select-all break-all font-mono text-[10px] leading-normal">{data.contracts.verifier}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-gray-500 text-[10px] uppercase tracking-wider">Settlement:</span>
            <span className="text-cyan-400 select-all break-all font-mono text-[10px] leading-normal">{data.contracts.settlement}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-gray-500 text-[10px] uppercase tracking-wider">USDC Token:</span>
            <span className="text-cyan-400 select-all break-all font-mono text-[10px] leading-normal">{data.contracts.usdc}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 grow">
        <div className="text-[10px] text-gray-500 uppercase tracking-widest">
          Verification Transaction stream
        </div>
        <div className="bg-black/40 p-4 rounded-lg border border-white/5 h-48 overflow-y-auto font-mono text-[11px] leading-relaxed text-gray-300 flex flex-col gap-1.5 scrollbar-thin">
          {logs.map((log, idx) => (
            <div
              key={idx}
              className={
                log.includes('ERROR')
                  ? 'text-rose-400'
                  : log.includes('SUCCESS')
                    ? 'text-emerald-400'
                    : 'text-gray-300'
              }
            >
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
