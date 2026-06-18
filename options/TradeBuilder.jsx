import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Info, ChevronRight, Lock } from 'lucide-react';
import { canTradeStrategy, STRATEGY_LEVEL_REQUIREMENTS } from '@/lib/optionsLevels';

const BIAS_PILL = {
  bullish:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  bearish:  'bg-red-500/10 text-red-400 border-red-500/20',
  neutral:  'bg-slate-700/60 text-slate-400 border-slate-600',
  volatile: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

function Tip({ children }) {
  return (
    <div className="flex items-start gap-1.5 mt-1.5">
      <Info className="w-3 h-3 text-slate-600 shrink-0 mt-0.5" />
      <p className="text-[10px] text-slate-600 leading-relaxed">{children}</p>
    </div>
  );
}

export default function TradeBuilder({
  strategies, strategy, onStrategyChange,
  dte, onDteChange, dteOptions,
  strikeOffset, onStrikeOffsetChange,
  positionSize, onPositionSizeChange,
  orderType, onOrderTypeChange,
  quantity, onQuantityChange,
  selectedAsset, onContinue,
  userLevel = 1,
}) {
  const selected = strategies.find(s => s.id === strategy);

  return (
    <div className="space-y-6">

      {/* ── Strategy Type ── */}
      <div>
        <label className="text-xs font-semibold text-slate-300 block mb-1">Strategy Type</label>
        <Tip>Pick a strategy that matches your outlook on the stock. "Bullish" = you think it goes up. "Bearish" = you think it goes down. "Neutral" = you think it stays in a range.</Tip>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
          {strategies.map(s => {
            const allowed = canTradeStrategy(s.id, userLevel);
            const reqLevel = STRATEGY_LEVEL_REQUIREMENTS[s.id] ?? 2;
            return (
              <button key={s.id}
                onClick={() => allowed && onStrategyChange(s.id)}
                disabled={!allowed}
                className={`text-left px-3 py-2.5 rounded-lg border transition-all relative ${
                  !allowed
                    ? 'bg-slate-900/40 border-slate-800 opacity-50 cursor-not-allowed'
                    : strategy === s.id
                      ? 'bg-indigo-500/15 border-indigo-500/50 ring-1 ring-indigo-500/30'
                      : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600'
                }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold ${!allowed ? 'text-slate-600' : strategy === s.id ? 'text-indigo-200' : 'text-slate-300'}`}>
                    {s.label}
                  </span>
                  {!allowed && (
                    <span className="flex items-center gap-0.5 text-[9px] font-mono text-slate-600">
                      <Lock className="w-2.5 h-2.5" />Lvl {reqLevel}
                    </span>
                  )}
                </div>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${BIAS_PILL[s.bias]}`}>{s.bias.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
        {selected && (
          <div className="mt-2 flex items-start gap-2 bg-indigo-500/5 border border-indigo-500/15 rounded-lg px-3 py-2">
            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 leading-relaxed">{selected.desc}</p>
          </div>
        )}
      </div>

      {/* ── Expiration (DTE) ── */}
      <div>
        <label className="text-xs font-semibold text-slate-300 block mb-1">Expiration Date (DTE)</label>
        <Tip>DTE = Days To Expiration. This is how long your contract lasts. Shorter = cheaper but less time for the trade to work. Longer = more expensive but more time. 30–45 days is the most popular range.</Tip>
        <div className="flex gap-2 flex-wrap mt-3">
          {dteOptions.map(d => (
            <button key={d} onClick={() => onDteChange(d)}
              className={`px-4 py-2 rounded-lg text-sm font-mono transition-colors border ${
                dte === d
                  ? 'bg-indigo-600 border-indigo-500 text-white font-bold'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}>
              {d} days
            </button>
          ))}
        </div>
      </div>

      {/* ── Strike OTM Offset ── */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-slate-300">Strike OTM Offset</label>
          <span className="text-sm font-mono font-bold text-indigo-300">{strikeOffset}%</span>
        </div>
        <Tip>OTM = "Out of The Money" — how far the strike price is from the current stock price. 1–3% is near the money (higher chance of profit, less reward). 10%+ is deep OTM (lower chance, higher reward).</Tip>
        <input type="range" min={1} max={15} step={0.5} value={strikeOffset}
          onChange={e => onStrikeOffsetChange(parseFloat(e.target.value))}
          className="w-full mt-3 accent-indigo-500" />
        <div className="flex justify-between text-[9px] font-mono text-slate-600 mt-1">
          <span>1% — Near the money (ATM)</span>
          <span>15% — Far out of the money</span>
        </div>
      </div>

      {/* ── Order Details ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Quantity (Contracts)</label>
          <Tip>1 contract = rights to 100 shares. Most beginners start with 1.</Tip>
          <Input type="number" min={1} value={quantity}
            onChange={e => onQuantityChange(parseInt(e.target.value) || 1)}
            className="mt-2 h-9 bg-slate-800 border-slate-700 text-slate-100 font-mono text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Max Risk ($)</label>
          <Tip>The maximum dollar amount you're willing to lose on this trade.</Tip>
          <Input type="number" value={positionSize}
            onChange={e => onPositionSizeChange(parseFloat(e.target.value) || 0)}
            className="mt-2 h-9 bg-slate-800 border-slate-700 text-slate-100 font-mono text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Order Type</label>
          <Tip>Limit = you set the price. Market = fills instantly at current price.</Tip>
          <select value={orderType} onChange={e => onOrderTypeChange(e.target.value)}
            className="mt-2 w-full h-9 px-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 text-sm font-mono">
            <option value="limit">Limit</option>
            <option value="market">Market</option>
            <option value="net_debit">Net Debit</option>
            <option value="net_credit">Net Credit</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Time in Force</label>
          <Tip>Day = order cancels if not filled today. GTC = stays open until filled.</Tip>
          <select className="mt-2 w-full h-9 px-2 rounded-md bg-slate-800 border border-slate-700 text-slate-100 text-sm font-mono">
            <option>Day</option>
            <option>GTC</option>
          </select>
        </div>
      </div>

      {/* ── Continue CTA ── */}
      {(() => {
        const allowed = canTradeStrategy(strategy, userLevel);
        const reqLevel = STRATEGY_LEVEL_REQUIREMENTS[strategy] ?? 2;
        return (
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <p className="text-xs text-slate-600">
              {!allowed
                ? <span className="flex items-center gap-1 text-amber-500/80"><Lock className="w-3 h-3" /> Requires Options Level {reqLevel}</span>
                : selectedAsset
                  ? `Ready to preview your ${strategy.replace(/_/g, ' ')} on ${selectedAsset.symbol}`
                  : 'Select a symbol above first'}
            </p>
            <Button onClick={onContinue} disabled={!selectedAsset || !allowed}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 disabled:opacity-40">
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        );
      })()}
    </div>
  );
}