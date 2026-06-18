import React from 'react';
import { TrendingUp, TrendingDown, Zap, AlertTriangle, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  if (n == null) return '—';
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}

const INTENSITY_CONFIG = {
  massive:     { color: 'text-red-400',    bg: 'bg-red-950/40 border-red-800/60',    icon: Zap,           label: 'MASSIVE' },
  significant: { color: 'text-amber-400',  bg: 'bg-amber-950/40 border-amber-800/60', icon: AlertTriangle, label: 'SIGNIFICANT' },
  notable:     { color: 'text-blue-400',   bg: 'bg-blue-950/30 border-blue-800/50',  icon: Activity,      label: 'NOTABLE' },
};

export default function DarkPoolPrintRow({ print, index }) {
  const cfg = INTENSITY_CONFIG[print.intensity] || INTENSITY_CONFIG.notable;
  const Icon = cfg.icon;
  const isBull = print.bias === 'bullish';

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${cfg.bg} text-xs font-mono`}>
      {/* Rank */}
      <span className="text-slate-600 w-4 text-right shrink-0">#{index + 1}</span>

      {/* Intensity icon */}
      <Icon className={`w-3.5 h-3.5 shrink-0 ${cfg.color}`} />

      {/* Time */}
      <span className="text-slate-300 w-14 shrink-0">{print.time_label}</span>

      {/* Intensity badge */}
      <span className={`text-[9px] font-bold tracking-widest uppercase w-20 shrink-0 ${cfg.color}`}>
        {cfg.label}
      </span>

      {/* Bias */}
      <div className={`flex items-center gap-1 w-20 shrink-0 ${isBull ? 'text-emerald-400' : 'text-red-400'}`}>
        {isBull ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        <span className="text-[10px] font-bold uppercase">{print.bias}</span>
      </div>

      {/* Volume */}
      <div className="flex-1 min-w-0">
        <span className="text-slate-200">{fmtVol(print.volume)}</span>
        <span className="text-slate-600 mx-1">·</span>
        <span className={`font-bold ${cfg.color}`}>{print.vol_ratio}× avg</span>
      </div>

      {/* Price */}
      <span className="text-slate-300 w-16 text-right shrink-0">${fmt(print.close)}</span>

      {/* Notional */}
      <span className={`w-20 text-right shrink-0 font-bold ${cfg.color}`}>{fmtM(print.notional)}</span>

      {/* Range */}
      <span className="text-slate-500 w-14 text-right shrink-0">{print.range_pct}% rng</span>
    </div>
  );
}