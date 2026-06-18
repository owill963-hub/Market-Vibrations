import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Activity, Target, X } from 'lucide-react';

function SignalModal({ outcomes, type, onClose }) {
  const filtered = outcomes.filter(o =>
    type === 'buy' ? o.belief_price - o.market_price > 0.02 : o.market_price - o.belief_price > 0.02
  ).sort((a, b) =>
    type === 'buy'
      ? (b.belief_price - b.market_price) - (a.belief_price - a.market_price)
      : (a.belief_price - a.market_price) - (b.belief_price - b.market_price)
  );

  const isBuy = type === 'buy';
  const color = isBuy ? 'emerald' : 'red';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`bg-slate-900 border border-${color}-500/20 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-5 py-4 border-b border-${color}-500/10`}>
          <div className="flex items-center gap-2">
            {isBuy ? <TrendingUp className={`w-4 h-4 text-${color}-400`} /> : <TrendingDown className={`w-4 h-4 text-${color}-400`} />}
            <span className={`text-sm font-bold text-${color}-400`}>{isBuy ? 'BUY' : 'SELL'} Signals</span>
            <span className="text-xs text-slate-600">({filtered.length})</span>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-3 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-600 text-sm">No signals at this threshold</div>
          ) : filtered.map((o, i) => {
            const ev = o.belief_price - o.market_price;
            const edgePct = o.market_price > 0 ? (ev / o.market_price) * 100 : 0;
            return (
              <div key={i} className={`bg-${color}-500/5 border border-${color}-500/10 rounded-xl p-3`}>
                <div className="flex items-center justify-between">
                  <span className={`font-semibold text-sm text-${color}-400`}>{o.name}</span>
                  <span className={`font-mono text-xs font-bold text-${color}-400`}>
                    {ev > 0 ? '+' : ''}{edgePct.toFixed(1)}%
                  </span>
                </div>
                <div className="text-[10px] text-slate-600 mt-0.5 truncate">{o.marketTitle}</div>
                <div className="flex items-center gap-3 mt-2 font-mono text-[10px]">
                  <span className="text-slate-500">MKT {(o.market_price * 100).toFixed(1)}¢</span>
                  <span className="text-slate-700">→</span>
                  <span className={`text-${color}-400`}>YOU {(o.belief_price * 100).toFixed(1)}¢</span>
                  <span className={`ml-auto text-${color}-400 font-bold`}>EV {ev > 0 ? '+' : ''}{(ev * 100).toFixed(1)}¢</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function PortfolioSummary({ markets }) {
  const [modal, setModal] = useState(null); // null | 'buy' | 'sell'

  const allOutcomes = markets.flatMap(m => (m.outcomes || []).map(o => ({ ...o, marketTitle: m.title })));
  
  const positiveEdge = allOutcomes.filter(o => o.belief_price - o.market_price > 0.02);
  const negativeEdge = allOutcomes.filter(o => o.market_price - o.belief_price > 0.02);
  
  const avgEdge = allOutcomes.length > 0
    ? allOutcomes.reduce((sum, o) => sum + Math.abs(o.belief_price - o.market_price), 0) / allOutcomes.length
    : 0;

  const bestBuy = allOutcomes.reduce((best, o) => {
    const ev = o.belief_price - o.market_price;
    return ev > (best?.ev || 0) ? { ...o, ev } : best;
  }, null);

  return (
    <>
      {modal && (
        <SignalModal outcomes={allOutcomes} type={modal} onClose={() => setModal(null)} />
      )}

      <div className="space-y-2">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => positiveEdge.length > 0 && setModal('buy')}
            className={`border rounded-xl p-3 text-left transition-all ${
              positiveEdge.length > 0
                ? 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 cursor-pointer'
                : 'border-slate-800 bg-slate-900/30 cursor-default'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span className="text-[9px] text-slate-500 uppercase tracking-wider">Buy</span>
            </div>
            <div className="font-mono text-2xl font-bold text-emerald-400 leading-none">{positiveEdge.length}</div>
            {positiveEdge.length > 0 && <div className="text-[9px] text-slate-600 mt-1 font-mono">tap to view</div>}
          </button>

          <button
            onClick={() => negativeEdge.length > 0 && setModal('sell')}
            className={`border rounded-xl p-3 text-left transition-all ${
              negativeEdge.length > 0
                ? 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10 cursor-pointer'
                : 'border-slate-800 bg-slate-900/30 cursor-default'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingDown className="w-3 h-3 text-red-400" />
              <span className="text-[9px] text-slate-500 uppercase tracking-wider">Sell</span>
            </div>
            <div className="font-mono text-2xl font-bold text-red-400 leading-none">{negativeEdge.length}</div>
            {negativeEdge.length > 0 && <div className="text-[9px] text-slate-600 mt-1 font-mono">tap to view</div>}
          </button>

          <div className="border border-slate-800 bg-slate-900/30 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Activity className="w-3 h-3 text-blue-400" />
              <span className="text-[9px] text-slate-500 uppercase tracking-wider">Avg Spread</span>
            </div>
            <div className="font-mono text-2xl font-bold text-blue-400 leading-none">{(avgEdge * 100).toFixed(1)}¢</div>
          </div>

          <div className="border border-slate-800 bg-slate-900/30 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Target className="w-3 h-3 text-slate-500" />
              <span className="text-[9px] text-slate-500 uppercase tracking-wider">Markets</span>
            </div>
            <div className="font-mono text-2xl font-bold text-slate-300 leading-none">{markets.length}</div>
          </div>
        </div>

        {bestBuy && bestBuy.ev > 0 && (
          <div className="border border-emerald-500/15 bg-emerald-500/5 rounded-xl p-3">
            <div className="text-[9px] text-emerald-600 uppercase tracking-widest mb-1.5 font-mono">Top Opportunity</div>
            <div className="text-sm font-semibold text-slate-200 truncate">{bestBuy.name}</div>
            <div className="text-[9px] text-slate-600 mt-0.5 truncate">{bestBuy.marketTitle}</div>
            <div className="flex items-center gap-2 mt-2 font-mono text-[10px]">
              <span className="text-slate-600">{(bestBuy.market_price * 100).toFixed(1)}¢</span>
              <span className="text-slate-700">→</span>
              <span className="text-emerald-400">{(bestBuy.belief_price * 100).toFixed(1)}¢</span>
              <span className="text-emerald-400 font-bold ml-auto">+{(bestBuy.ev * 100).toFixed(1)}¢ EV</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}