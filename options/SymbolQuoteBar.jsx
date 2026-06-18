import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

function Stat({ label, value, highlight }) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">{label}</span>
      <span className={`text-xs font-mono font-semibold ${highlight || 'text-slate-300'}`}>{value}</span>
    </div>
  );
}

export default function SymbolQuoteBar({ asset }) {
  if (!asset) {
    return (
      <div className="flex items-center gap-4 px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-xs text-slate-600 font-mono">
        <span>Search for a symbol above to view its quote and options chain</span>
      </div>
    );
  }

  const price = asset.current_price;
  const change = price && asset.close_price ? price - asset.close_price : null;
  const changePct = change && asset.close_price ? (change / asset.close_price) * 100 : null;
  const isUp = change >= 0;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl">
      {/* Symbol + price */}
      <div className="flex items-baseline gap-2.5">
        <span className="font-mono text-lg font-bold text-slate-100">{asset.symbol}</span>
        {price && (
          <>
            <span className="font-mono text-lg font-bold text-slate-100">${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            {changePct != null && (
              <div className={`flex items-center gap-1 text-sm font-mono font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {isUp ? '+' : ''}{change.toFixed(2)} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)
              </div>
            )}
          </>
        )}
      </div>

      <div className="h-6 w-px bg-slate-800 hidden sm:block" />

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <Stat label="Open"  value={asset.open_price  ? `$${asset.open_price.toFixed(2)}`  : '—'} />
        <Stat label="Prev Close" value={asset.close_price ? `$${asset.close_price.toFixed(2)}` : '—'} />
        {asset.rsi != null && (
          <Stat label="RSI(14)" value={asset.rsi.toFixed(1)}
            highlight={asset.rsi >= 70 ? 'text-red-400' : asset.rsi <= 30 ? 'text-emerald-400' : 'text-slate-300'} />
        )}
        <Stat label="Exchange" value={asset.exchange || '—'} />
        <Stat label="Sector"   value={asset.sector   || '—'} />
        {asset.signal && asset.signal !== 'NEUTRAL' && (
          <Stat label="Signal" value={asset.signal}
            highlight={asset.signal.includes('BUY') ? 'text-emerald-400' : 'text-red-400'} />
        )}
      </div>

      {asset.inWatchlist && (
        <span className="ml-auto text-[10px] font-mono text-purple-400 border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 rounded-full shrink-0">
          ★ Watchlist
        </span>
      )}
    </div>
  );
}