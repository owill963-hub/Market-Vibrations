import React, { useMemo } from 'react';
import SignalBadge from './SignalBadge';
import { SCREENER_ASSET_MAP } from '@/lib/screenerAssets';
import { Flame } from 'lucide-react';

function TickerItem({ r }) {
  const meta = SCREENER_ASSET_MAP[r.symbol] || {};
  const isUp = r.change_pct >= 0;
  return (
    <div className="flex items-center gap-2 px-4 shrink-0 border-r border-slate-800/60">
      <Flame className="w-3 h-3 text-amber-400 shrink-0" />
      <span className="font-mono text-xs font-bold text-slate-100">{r.symbol.replace('-USD', '')}</span>
      <SignalBadge signal={r.signal} size="xs" />
      <span className="text-[10px] font-mono text-slate-500">
        RSI <span className={r.rsi >= 70 ? 'text-red-400' : r.rsi <= 30 ? 'text-emerald-400' : 'text-slate-400'}>{r.rsi?.toFixed(0) ?? '—'}</span>
      </span>
      {r.rr != null && (
        <span className={`text-[10px] font-mono font-bold ${r.rr >= 2 ? 'text-emerald-400' : 'text-yellow-400'}`}>1:{r.rr}</span>
      )}
      <span className={`text-[10px] font-mono ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
        {isUp ? '+' : ''}{r.change_pct?.toFixed(2)}%
      </span>
      <span className="font-mono text-[10px] text-slate-600">
        {r.confluence}/3 conf
      </span>
    </div>
  );
}

export default function ConfluenceTicker({ results }) {
  const picks = useMemo(() => {
    if (!results?.length) return [];
    return results
      .filter(r => r.confluence >= 2 && (r.signal === 'STRONG_BUY' || r.signal === 'BUY' || r.signal === 'STRONG_SELL' || r.signal === 'SELL'))
      .sort((a, b) => (b.confluence - a.confluence) || (Math.abs(b.score ?? 0) - Math.abs(a.score ?? 0)))
      .slice(0, 40);
  }, [results]);

  if (!picks.length) {
    return (
      <div className="h-7 bg-slate-900/50 flex items-center px-4 gap-2">
        <Flame className="w-2.5 h-2.5 text-slate-800" />
        <span className="text-[9px] font-mono text-slate-800 uppercase tracking-widest">Scanning for high-confluence signals…</span>
      </div>
    );
  }

  // Duplicate for seamless loop
  const doubled = [...picks, ...picks];

  return (
    <div className="h-7 bg-slate-900/50 overflow-hidden flex items-center relative">
      <div className="absolute left-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-r from-slate-950 to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 z-10 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none" />
      <div className="flex items-center h-full ticker-animate">
        {doubled.map((r, i) => <TickerItem key={`${r.symbol}-${i}`} r={r} />)}
      </div>
    </div>
  );
}