import React from 'react';
import { TrendingUp, TrendingDown, Zap, Activity, DollarSign } from 'lucide-react';

function fmtM(n) {
  if (n == null) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${(n / 1e3).toFixed(0)}K`;
}

export default function DarkPoolSummaryBar({ results }) {
  if (!results?.length) return null;

  const valid = results.filter(r => !r.error);
  const totalNotional = valid.reduce((s, r) => s + (r.dp_notional || 0), 0);
  const totalPrints   = valid.reduce((s, r) => s + (r.dp_print_count || 0), 0);
  const massiveTotal  = valid.reduce((s, r) => s + (r.prints?.filter(p => p.intensity === 'massive').length || 0), 0);
  const bullishTickers = valid.filter(r => r.overall_bias === 'bullish').length;
  const bearishTickers = valid.filter(r => r.overall_bias === 'bearish').length;
  const avgDpPct = valid.length > 0
    ? (valid.reduce((s, r) => s + (r.dp_vol_pct || 0), 0) / valid.length).toFixed(1)
    : '—';

  const stats = [
    { icon: DollarSign,   label: 'Total DP Notional', value: fmtM(totalNotional), color: 'text-purple-400' },
    { icon: Activity,     label: 'Total Prints',       value: totalPrints,         color: 'text-blue-400'   },
    { icon: Zap,          label: 'Massive Prints',     value: massiveTotal,        color: 'text-red-400'    },
    { icon: TrendingUp,   label: 'Bullish Tickers',    value: bullishTickers,      color: 'text-emerald-400' },
    { icon: TrendingDown, label: 'Bearish Tickers',    value: bearishTickers,      color: 'text-red-400'    },
    { icon: Activity,     label: 'Avg DP Vol %',       value: `${avgDpPct}%`,      color: 'text-amber-400'  },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
      {stats.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 flex flex-col items-center text-center">
          <Icon className={`w-4 h-4 mb-1 ${color}`} />
          <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
          <div className="text-[9px] font-mono uppercase tracking-widest text-slate-600 mt-0.5">{label}</div>
        </div>
      ))}
    </div>
  );
}