import React, { useState, useEffect } from 'react';

const MARKETS = [
  { id: 'US',   name: 'NYSE/NASDAQ', tz: 'America/New_York',   open: { h: 9, m: 30 }, close: { h: 16, m: 0 },  flag: '🇺🇸' },
  { id: 'LON',  name: 'London LSE',  tz: 'Europe/London',      open: { h: 8, m: 0  }, close: { h: 16, m: 30 }, flag: '🇬🇧' },
  { id: 'FFT',  name: 'Frankfurt',   tz: 'Europe/Berlin',      open: { h: 9, m: 0  }, close: { h: 17, m: 30 }, flag: '🇩🇪' },
  { id: 'TYO',  name: 'Tokyo TSE',   tz: 'Asia/Tokyo',         open: { h: 9, m: 0  }, close: { h: 15, m: 30 }, flag: '🇯🇵' },
  { id: 'HKG',  name: 'Hong Kong',   tz: 'Asia/Hong_Kong',     open: { h: 9, m: 30 }, close: { h: 16, m: 0 },  flag: '🇭🇰' },
  { id: 'SYD',  name: 'Sydney ASX',  tz: 'Australia/Sydney',   open: { h: 10, m: 0 }, close: { h: 16, m: 0 },  flag: '🇦🇺' },
  { id: 'SHA',  name: 'Shanghai',    tz: 'Asia/Shanghai',      open: { h: 9, m: 30 }, close: { h: 15, m: 0 },  flag: '🇨🇳' },
];

function isMarketOpen(market, now = new Date()) {
  const local = new Date(now.toLocaleString('en-US', { timeZone: market.tz }));
  const day = local.getDay();
  if (day === 0 || day === 6) return false;
  const mins = local.getHours() * 60 + local.getMinutes();
  const openMins = market.open.h * 60 + market.open.m;
  const closeMins = market.close.h * 60 + market.close.m;
  return mins >= openMins && mins < closeMins;
}

function localTime(tz) {
  return new Date().toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
}

export function useMarketStatus() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const statuses = MARKETS.map(m => ({ ...m, isOpen: isMarketOpen(m, now) }));
  const usOpen = statuses.find(m => m.id === 'US')?.isOpen ?? false;
  return { statuses, usOpen, now };
}

export default function MarketStatusBar() {
  const { statuses } = useMarketStatus();
  const openCount = statuses.filter(m => m.isOpen).length;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 items-center">
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`w-2 h-2 rounded-full ${openCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
        <span className="text-[10px] font-mono text-slate-500">
          {openCount}/{statuses.length} open
        </span>
      </div>
      <div className="w-px h-3 bg-slate-800 hidden sm:block" />
      {statuses.map(m => (
        <div key={m.id} className="flex items-center gap-1.5 shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${m.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-slate-800'}`} />
          <span className="text-[10px] font-mono">
            <span className="mr-0.5">{m.flag}</span>
            <span className={m.isOpen ? 'text-slate-200' : 'text-slate-600'}>{m.name}</span>
            <span className="text-slate-700 ml-1.5">{localTime(m.tz)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}