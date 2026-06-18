import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { kellyFraction } from '@/lib/lmsr';

export default function TopEdgeOpportunities({ markets }) {
  // Flatten all outcomes with edge data
  const opportunities = markets.flatMap(m =>
    (m.outcomes || []).map(o => {
      const ev = o.belief_price - o.market_price;
      const edgePct = o.market_price > 0 ? (ev / o.market_price) * 100 : 0;
      const kelly = kellyFraction(o.belief_price, o.market_price);
      return { ...o, ev, edgePct, kelly, marketTitle: m.title, marketId: m.id };
    })
  ).filter(o => Math.abs(o.edgePct) > 2)
   .sort((a, b) => Math.abs(b.edgePct) - Math.abs(a.edgePct))
   .slice(0, 8);

  if (!opportunities.length) return null;

  return (
    <div className="border border-slate-800/80 rounded-xl overflow-hidden mb-6">
      <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Top Edge Opportunities</span>
        <span className="ml-auto text-[10px] font-mono text-slate-700">LMSR Mispricing</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-slate-800/60">
        {opportunities.map((o, i) => {
          const isBuy = o.ev > 0;
          return (
            <div key={i} className="p-3.5 bg-slate-900/20 hover:bg-slate-800/20 transition-colors">
              <div className="flex items-center gap-1.5 mb-2">
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  isBuy ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                }`}>
                  {isBuy ? '▲ BUY' : '▼ SELL'}
                </span>
                <span className={`text-[10px] font-mono font-bold ml-auto ${isBuy ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isBuy ? '+' : ''}{o.edgePct.toFixed(1)}%
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-200 truncate">{o.name}</div>
              <div className="text-[9px] text-slate-600 truncate mt-0.5 mb-2">{o.marketTitle}</div>
              <div className="flex items-center justify-between font-mono text-[9px] text-slate-600">
                <span>{(o.market_price * 100).toFixed(0)}¢ → <span className={isBuy ? 'text-emerald-400' : 'text-red-400'}>{(o.belief_price * 100).toFixed(0)}¢</span></span>
                <span className="text-amber-400">K:{(o.kelly * 100).toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}