import React from 'react';

const PAIR_LABELS = {
  'C:EURUSD': 'EUR/USD', 'C:GBPUSD': 'GBP/USD', 'C:USDJPY': 'USD/JPY',
  'C:USDCAD': 'USD/CAD', 'C:AUDUSD': 'AUD/USD', 'C:USDCHF': 'USD/CHF',
  'C:NZDUSD': 'NZD/USD', 'C:USDMXN': 'USD/MXN',
};

function fmt(n, digits = 4) {
  if (n == null) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default function ForexRow({ t }) {
  if (!t) return null;
  const { ticker, price, changePct } = t;
  const label = PAIR_LABELS[ticker] || ticker.replace('C:', '');
  const isUp = changePct != null ? changePct >= 0 : null;

  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
      <span className="font-mono text-xs font-semibold text-slate-200">{label}</span>
      <div className="flex items-center gap-4 font-mono text-xs">
        <span className="text-slate-300">{fmt(price)}</span>
        {changePct != null && (
          <span className={`text-[10px] font-semibold w-16 text-right ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {isUp ? '+' : ''}{changePct.toFixed(4)}%
          </span>
        )}
      </div>
    </div>
  );
}