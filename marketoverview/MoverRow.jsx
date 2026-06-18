import React from 'react';

function fmt(n, digits = 2) {
  if (n == null) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtVol(v) {
  if (v == null) return null;
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
  return String(v);
}

export default function MoverRow({ t, type }) {
  if (!t) return null;
  const ticker = (t.ticker || '').replace(/^X:/, '').replace(/^C:/, '');
  const { price, changePct, volume } = t;
  const isGainer = type === 'gainer';

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50 last:border-0">
      <div className="min-w-0 flex items-center gap-2">
        <span className="font-mono text-xs font-semibold text-slate-200">{ticker}</span>
        {volume && <span className="text-[9px] font-mono text-slate-600">{fmtVol(volume)}</span>}
      </div>
      <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
        {price != null && <span className="text-slate-400">${fmt(price)}</span>}
        {changePct != null && (
          <span className={`font-semibold w-14 text-right ${isGainer ? 'text-emerald-400' : 'text-red-400'}`}>
            {isGainer ? '+' : ''}{fmt(changePct)}%
          </span>
        )}
      </div>
    </div>
  );
}