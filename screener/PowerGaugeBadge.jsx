import React from 'react';

const RATING_CONFIG = {
  BULLISH:  { color: 'text-emerald-300', bg: 'bg-emerald-500/15 border-emerald-500/30', bar: 'bg-emerald-400' },
  POSITIVE: { color: 'text-emerald-500', bg: 'bg-emerald-500/8 border-emerald-500/20',  bar: 'bg-emerald-500' },
  NEUTRAL:  { color: 'text-slate-400',   bg: 'bg-slate-700/40 border-slate-600/30',     bar: 'bg-slate-500' },
  NEGATIVE: { color: 'text-orange-400',  bg: 'bg-orange-500/8 border-orange-500/20',    bar: 'bg-orange-400' },
  BEARISH:  { color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/25',         bar: 'bg-red-400' },
};

// Compact row badge
export function PowerGaugeBadge({ rating, score }) {
  const cfg = RATING_CONFIG[rating] || RATING_CONFIG.NEUTRAL;
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold ${cfg.bg} ${cfg.color}`}>
      <div className="w-8 h-1 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${(score / 10) * 100}%` }} />
      </div>
      {score?.toFixed(1)}
    </div>
  );
}

// Expanded detail widget (4 sub-buckets)
export function PowerGaugeDetail({ result }) {
  const rating = result.pg_rating;
  const cfg = RATING_CONFIG[rating] || RATING_CONFIG.NEUTRAL;

  const buckets = [
    { label: 'Technical',    val: result.pg_technical,   max: 2.5, color: 'bg-blue-400' },
    { label: 'Fundamental',  val: result.pg_fundamental, max: 2.5, color: 'bg-purple-400' },
    { label: 'Analyst',      val: result.pg_analyst,     max: 2.5, color: 'bg-amber-400' },
    { label: 'Short Ratio',  val: result.pg_short,       max: 2.5, color: 'bg-teal-400' },
  ];

  const rmLabel = (rm) => {
    if (rm == null) return '—';
    if (rm <= 1.5) return 'Strong Buy';
    if (rm <= 2.0) return 'Buy';
    if (rm <= 2.5) return 'Overweight';
    if (rm <= 3.0) return 'Hold';
    if (rm <= 3.5) return 'Underweight';
    if (rm <= 4.0) return 'Sell';
    return 'Strong Sell';
  };

  return (
    <div className={`rounded-xl border p-3 ${cfg.bg}`}>
      <div className="flex items-center justify-between mb-2.5">
        <span className={`text-xs font-bold font-mono ${cfg.color}`}>POWER GAUGE</span>
        <span className={`text-lg font-mono font-bold ${cfg.color}`}>{result.power_gauge?.toFixed(1)}<span className="text-[10px] text-slate-600">/10</span></span>
      </div>

      {/* Master bar */}
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
        <div className={`h-full rounded-full transition-all ${cfg.bar}`} style={{ width: `${(result.power_gauge / 10) * 100}%` }} />
      </div>

      {/* 4 sub-buckets */}
      <div className="space-y-1.5">
        {buckets.map(b => (
          <div key={b.label} className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-slate-500 w-20 shrink-0">{b.label}</span>
            <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${b.color}`} style={{ width: `${((b.val ?? 0) / b.max) * 100}%` }} />
            </div>
            <span className="text-[9px] font-mono text-slate-400 w-5 text-right">{b.val?.toFixed(1) ?? '—'}</span>
          </div>
        ))}
      </div>

      {/* Fundamentals row */}
      <div className="mt-2.5 pt-2 border-t border-slate-700/40 grid grid-cols-3 gap-1 text-[9px] font-mono">
        <div>
          <span className="text-slate-600">EPS Growth </span>
          <span className={result.earnings_growth > 0 ? 'text-emerald-400' : 'text-red-400'}>
            {result.earnings_growth != null ? `${(result.earnings_growth * 100).toFixed(0)}%` : '—'}
          </span>
        </div>
        <div>
          <span className="text-slate-600">ROE </span>
          <span className={result.roe > 0.15 ? 'text-emerald-400' : 'text-slate-400'}>
            {result.roe != null ? `${(result.roe * 100).toFixed(0)}%` : '—'}
          </span>
        </div>
        <div>
          <span className="text-slate-600">Analysts </span>
          <span className="text-amber-400">{rmLabel(result.recommendation_mean)}</span>
        </div>
        <div>
          <span className="text-slate-600">Rev Growth </span>
          <span className={result.revenue_growth > 0 ? 'text-emerald-400' : 'text-red-400'}>
            {result.revenue_growth != null ? `${(result.revenue_growth * 100).toFixed(0)}%` : '—'}
          </span>
        </div>
        <div>
          <span className="text-slate-600">Short Days </span>
          <span className={result.short_ratio < 4 ? 'text-emerald-400' : result.short_ratio > 8 ? 'text-red-400' : 'text-slate-400'}>
            {result.short_ratio != null ? result.short_ratio.toFixed(1) : '—'}
          </span>
        </div>
        <div>
          <span className="text-slate-600">Rating </span>
          <span className={cfg.color}>{result.pg_rating}</span>
        </div>
      </div>
    </div>
  );
}