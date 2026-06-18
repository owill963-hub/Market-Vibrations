import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import DarkPoolPrintRow from './DarkPoolPrintRow';

function fmt(n, dec = 2) {
  if (n == null) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtM(n) {
  if (n == null) return '—';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${(n / 1e3).toFixed(0)}K`;
}

function fmtVol(n) {
  if (!n) return '—';
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}

const BIAS_CONFIG = {
  bullish: { color: 'text-emerald-400', bg: 'bg-emerald-900/20 border-emerald-700/40', Icon: TrendingUp },
  bearish: { color: 'text-red-400',     bg: 'bg-red-900/20 border-red-700/40',         Icon: TrendingDown },
  neutral: { color: 'text-slate-400',   bg: 'bg-slate-800/40 border-slate-700/40',     Icon: Minus },
};

export default function DarkPoolTickerCard({ result }) {
  const [expanded, setExpanded] = useState(false);
  const bCfg = BIAS_CONFIG[result.overall_bias] || BIAS_CONFIG.neutral;
  const BiasIcon = bCfg.Icon;
  const hasError = !!result.error;

  if (hasError) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between">
        <span className="text-slate-300 font-mono font-bold text-sm">{result.ticker}</span>
        <span className="text-red-400 text-xs font-mono">{result.error}</span>
      </div>
    );
  }

  const massiveCount     = result.prints?.filter(p => p.intensity === 'massive').length || 0;
  const significantCount = result.prints?.filter(p => p.intensity === 'significant').length || 0;

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/30 transition-colors text-left"
      >
        {/* Ticker */}
        <span className="font-mono font-bold text-slate-100 text-sm w-14 shrink-0">{result.ticker}</span>

        {/* Bias pill */}
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${bCfg.bg} ${bCfg.color} shrink-0`}>
          <BiasIcon className="w-2.5 h-2.5" />
          {result.overall_bias}
        </div>

        {/* DP % bar */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${result.overall_bias === 'bullish' ? 'bg-emerald-500' : result.overall_bias === 'bearish' ? 'bg-red-500' : 'bg-slate-500'}`}
              style={{ width: `${Math.min(100, (result.dp_vol_pct || 0) * 3)}%` }}
            />
          </div>
          <span className="text-slate-400 text-xs font-mono shrink-0">{result.dp_vol_pct}% DP vol</span>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-4 text-xs font-mono shrink-0">
          <div className="text-right">
            <div className="text-slate-400">Notional</div>
            <div className="text-slate-200 font-bold">{fmtM(result.dp_notional)}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-400">Prints</div>
            <div className="text-slate-200 font-bold">{result.dp_print_count}</div>
          </div>
          {massiveCount > 0 && (
            <div className="text-right">
              <div className="text-red-400">Massive</div>
              <div className="text-red-300 font-bold">{massiveCount}</div>
            </div>
          )}
        </div>

        {/* Price */}
        <span className="text-slate-300 text-sm font-mono w-16 text-right shrink-0">
          ${fmt(result.price)}
        </span>

        {/* Expand chevron */}
        <span className="text-slate-600 shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {/* Expanded prints */}
      {expanded && result.prints?.length > 0 && (
        <div className="border-t border-slate-800 p-3 space-y-1.5">
          {/* Column headers */}
          <div className="flex items-center gap-3 px-4 py-1 text-[9px] font-mono uppercase tracking-widest text-slate-600">
            <span className="w-4 shrink-0">#</span>
            <span className="w-3.5 shrink-0" />
            <span className="w-14 shrink-0">Time</span>
            <span className="w-20 shrink-0">Intensity</span>
            <span className="w-20 shrink-0">Bias</span>
            <span className="flex-1">Volume · Ratio</span>
            <span className="w-16 text-right shrink-0">Price</span>
            <span className="w-20 text-right shrink-0">Notional</span>
            <span className="w-14 text-right shrink-0">Range</span>
          </div>
          {result.prints.map((print, i) => (
            <DarkPoolPrintRow key={print.timestamp} print={print} index={i} />
          ))}
        </div>
      )}

      {expanded && (!result.prints || result.prints.length === 0) && (
        <div className="border-t border-slate-800 p-6 text-center text-slate-600 text-xs font-mono">
          No dark pool prints detected for this ticker.
        </div>
      )}
    </div>
  );
}