import React, { useMemo } from 'react';
import { Zap, Clock, Wind, Activity } from 'lucide-react';

// Simplified Black-Scholes approximation for Greeks
function approxGreeks({ S, K, T, sigma = 0.3, r = 0.05, type = 'call' }) {
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  const N = (x) => (1 + Math.sign(x) * (1 - Math.exp(-0.7 * x * x - 0.04 * x ** 4))) / 2;
  const n = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

  const delta = type === 'call' ? N(d1) : N(d1) - 1;
  const gamma = n(d1) / (S * sigma * Math.sqrt(T));
  const theta = (-(S * n(d1) * sigma) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * (type === 'call' ? N(d2) : -N(-d2))) / 365;
  const vega = S * n(d1) * Math.sqrt(T) / 100;

  return {
    delta: parseFloat(delta.toFixed(3)),
    gamma: parseFloat(gamma.toFixed(4)),
    theta: parseFloat(theta.toFixed(3)),
    vega: parseFloat(vega.toFixed(3)),
  };
}

function GreekCard({ icon: Icon, label, value, description, color }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className={`text-[10px] font-mono uppercase tracking-wider ${color}`}>{label}</span>
      </div>
      <div className={`font-mono text-xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-600 mt-1 leading-relaxed">{description}</div>
    </div>
  );
}

export default function GreeksPanel({ setup }) {
  const { legs, currentPrice, dte } = setup;
  const T = dte / 365;

  const aggregateGreeks = useMemo(() => {
    let totals = { delta: 0, gamma: 0, theta: 0, vega: 0 };
    for (const leg of legs) {
      const g = approxGreeks({
        S: currentPrice,
        K: leg.strike,
        T,
        type: leg.contract.toLowerCase(),
      });
      const sign = leg.type === 'Buy' ? 1 : -1;
      totals.delta += sign * g.delta;
      totals.gamma += sign * g.gamma;
      totals.theta += sign * g.theta;
      totals.vega += sign * g.vega;
    }
    return {
      delta: totals.delta.toFixed(3),
      gamma: totals.gamma.toFixed(4),
      theta: totals.theta.toFixed(3),
      vega: totals.vega.toFixed(3),
    };
  }, [setup]);

  const ivRank = Math.round(30 + Math.random() * 40); // Placeholder until live IV feed
  const impliedMove = parseFloat((currentPrice * 0.3 * Math.sqrt(dte / 365))).toFixed(2);

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-200">Greeks & IV</span>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="text-slate-500">IV Rank</span>
          <span className={`font-bold ${ivRank > 50 ? 'text-red-400' : ivRank > 30 ? 'text-amber-400' : 'text-emerald-400'}`}>{ivRank}%</span>
          <span className="text-slate-600">· ±${impliedMove} implied move</span>
        </div>
      </div>
      <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <GreekCard icon={Activity} label="Δ Delta" value={aggregateGreeks.delta} color="text-blue-400"
          description="Price sensitivity. How much P&L changes per $1 move." />
        <GreekCard icon={Zap} label="Γ Gamma" value={aggregateGreeks.gamma} color="text-indigo-400"
          description="Rate of delta change. High near expiry." />
        <GreekCard icon={Clock} label="Θ Theta" value={`${aggregateGreeks.theta}/d`} color="text-red-400"
          description="Daily time decay. Negative = you pay daily." />
        <GreekCard icon={Wind} label="ν Vega" value={aggregateGreeks.vega} color="text-emerald-400"
          description="IV sensitivity. P&L per 1% IV change." />
      </div>
      <div className="px-4 pb-4">
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-3 text-[10px] font-mono text-slate-500">
          <span className="text-slate-400">Note: </span>
          Greeks calculated using Black-Scholes with σ=30% implied vol. Connect a live options feed for real-time data.
        </div>
      </div>
    </div>
  );
}