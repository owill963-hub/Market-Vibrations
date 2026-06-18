import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShoppingCart } from 'lucide-react';

const BIAS_COLOR = {
  bullish:  'text-emerald-400',
  bearish:  'text-red-400',
  neutral:  'text-slate-400',
  volatile: 'text-amber-400',
};

const BIAS_BG = {
  bullish:  'bg-emerald-500/8 border-emerald-500/20',
  bearish:  'bg-red-500/8 border-red-500/20',
  neutral:  'bg-slate-800/40 border-slate-700/40',
  volatile: 'bg-amber-500/8 border-amber-500/20',
};

export default function StrategySelector({
  strategies, strategy, onStrategyChange,
  dte, onDteChange, dteOptions,
  strikeOffset, onStrikeOffsetChange,
  positionSize, onPositionSizeChange,
  selectedAsset, onBuild,
}) {
  const selected = strategies.find(s => s.id === strategy);

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Strategy Type</span>
      </div>

      <div className="p-4 space-y-5">
        {/* Strategy grid */}
        <div className="grid grid-cols-1 gap-1.5">
          {strategies.map(s => (
            <button key={s.id} onClick={() => onStrategyChange(s.id)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all ${
                strategy === s.id
                  ? 'bg-indigo-500/15 border-indigo-500/50 ring-1 ring-indigo-500/30'
                  : `${BIAS_BG[s.bias]} hover:border-slate-600`
              }`}>
              <div>
                <div className={`text-xs font-semibold ${strategy === s.id ? 'text-indigo-200' : 'text-slate-300'}`}>{s.label}</div>
                <div className={`text-[9px] font-mono mt-0.5 ${BIAS_COLOR[s.bias]}`}>{s.bias.toUpperCase()}</div>
              </div>
              {strategy === s.id && (
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
              )}
            </button>
          ))}
        </div>

        {selected && (
          <div className="text-[10px] text-slate-500 leading-relaxed bg-slate-800/30 rounded-lg px-3 py-2">
            {selected.desc}
          </div>
        )}

        <div className="h-px bg-slate-800" />

        {/* Expiration */}
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-2">Expiration (DTE)</label>
          <div className="flex gap-1.5 flex-wrap">
            {dteOptions.map(d => (
              <button key={d} onClick={() => onDteChange(d)}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-colors border ${
                  dte === d
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}>
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Strike Offset */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider">Strike OTM Offset</label>
            <span className="text-xs font-mono text-slate-300 font-semibold">{strikeOffset}%</span>
          </div>
          <input type="range" min={1} max={15} step={0.5} value={strikeOffset}
            onChange={e => onStrikeOffsetChange(parseFloat(e.target.value))}
            className="w-full accent-indigo-500 h-1.5" />
          <div className="flex justify-between text-[9px] font-mono text-slate-700 mt-1">
            <span>1% ATM</span><span>15% Deep OTM</span>
          </div>
        </div>

        {/* Max Risk */}
        <div>
          <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-2">Max Risk / Position ($)</label>
          <Input type="number" value={positionSize}
            onChange={e => onPositionSizeChange(parseFloat(e.target.value) || 0)}
            className="h-8 bg-slate-800 border-slate-700 text-slate-100 font-mono text-sm" />
        </div>

        {/* Review Order button (Schwab-style CTA) */}
        <Button onClick={onBuild} disabled={!selectedAsset}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-10 text-sm">
          <ShoppingCart className="w-4 h-4 mr-2" />
          Review Order
        </Button>

        {!selectedAsset && (
          <p className="text-center text-[10px] text-slate-600 font-mono -mt-2">Search for a symbol above first</p>
        )}
      </div>
    </div>
  );
}