import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Loader2, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const MARKETS = [
  { name: 'NYSE',   tz: 'America/New_York', open: 9.5,  close: 16,   flag: '🇺🇸', color: 'text-blue-400' },
  { name: 'NASDAQ', tz: 'America/New_York', open: 9.5,  close: 16,   flag: '🇺🇸', color: 'text-indigo-400' },
  { name: 'LSE',    tz: 'Europe/London',    open: 8,    close: 16.5, flag: '🇬🇧', color: 'text-red-400' },
  { name: 'TSE',    tz: 'Asia/Tokyo',       open: 9,    close: 15.5, flag: '🇯🇵', color: 'text-pink-400' },
  { name: 'SSE',    tz: 'Asia/Shanghai',    open: 9.5,  close: 15,   flag: '🇨🇳', color: 'text-amber-400' },
  { name: 'NSE',    tz: 'Asia/Kolkata',     open: 9.25, close: 15.5, flag: '🇮🇳', color: 'text-orange-400' },
  { name: 'Crypto', tz: null,               open: 0,    close: 24,   flag: '₿',   color: 'text-yellow-400' },
  { name: 'Forex',  tz: null,               open: 0,    close: 24,   flag: '💱',  color: 'text-cyan-400' },
];

const TICKER_SYMBOLS = ['SPY', 'QQQ', 'DIA', 'IWM', 'VIX', 'GLD', 'TLT', 'USO'];
const TICKER_NAMES = { SPY: 'S&P 500', QQQ: 'NASDAQ', DIA: 'Dow', IWM: 'Russell', VIX: 'VIX', GLD: 'Gold', TLT: 'Bonds', USO: 'Oil' };

function isMarketOpen(market) {
  if (!market.tz) return true;
  const now = new Date();
  const dayName = new Intl.DateTimeFormat('en-US', { timeZone: market.tz, weekday: 'short' }).format(now);
  if (dayName === 'Sat' || dayName === 'Sun') return false;
  const timeStr = new Intl.DateTimeFormat('en-US', { timeZone: market.tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  const [h, m] = timeStr.split(':').map(Number);
  const localTime = h + m / 60;
  return localTime >= market.open && localTime < market.close;
}

function getLocalTime(tz) {
  if (!tz) return '24/7';
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
}

export default function MarketPriceTicker() {
  const [now, setNow] = useState(new Date());
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('fetchMarketPrices', { symbols: TICKER_SYMBOLS });
      const data = res.data?.prices || res.data || {};
      const parsed = TICKER_SYMBOLS.map(sym => {
        const q = data[sym] || {};
        return {
          symbol: sym,
          name: TICKER_NAMES[sym],
          price: q.price ?? null,
          change: q.change_pct ?? null,
        };
      }).filter(q => q.price != null);
      setQuotes(parsed);
    } catch (e) {
      console.error('fetchMarketPrices error:', e);
    }
    setLoading(false);
  };

  // Clock tick every 30s
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Fetch prices on mount and every 60s
  useEffect(() => {
    fetchQuotes();
    const t = setInterval(fetchQuotes, 60_000);
    return () => clearInterval(t);
  }, []);

  const marketStatuses = useMemo(() => MARKETS.map(m => ({
    ...m,
    isOpen: isMarketOpen(m),
    localTime: getLocalTime(m.tz),
  })), [now]);

  const openCount  = marketStatuses.filter(m => m.isOpen).length;
  const closeCount = marketStatuses.filter(m => !m.isOpen).length;

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="text-sm font-bold text-slate-100">Market Price Ticker</h2>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            {openCount} OPEN
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block" />
            {closeCount} CLOSED
          </span>
          <button onClick={fetchQuotes} disabled={loading}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Market status grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 border-b border-slate-800">
        {marketStatuses.map((m) => (
          <div key={m.name} className="flex flex-col items-center justify-center py-3 px-2 border-r border-slate-800/60 last:border-0 gap-1">
            <div className="text-base">{m.flag}</div>
            <div className={`text-[10px] font-bold font-mono ${m.color}`}>{m.name}</div>
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-mono font-bold border ${
              m.isOpen
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}>
              <span className={`w-1 h-1 rounded-full ${m.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              {m.isOpen ? 'OPEN' : 'CLOSED'}
            </div>
            <div className="text-[8px] font-mono text-slate-600">{m.localTime}</div>
          </div>
        ))}
      </div>

      {/* Live index quotes */}
      <div className="py-3 px-1">
        {loading && quotes.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-4 text-slate-500 text-xs font-mono">
            <Loader2 className="w-4 h-4 animate-spin" /> Fetching live prices…
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto scrollbar-none px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
            {quotes.map((q) => {
              const pos = q.change == null ? true : q.change >= 0;
              return (
                <div key={q.symbol} className="flex items-center gap-3 shrink-0 bg-slate-800/40 border border-slate-700/50 rounded-xl px-4 py-2.5 min-w-[130px]">
                  <div>
                    <div className="font-mono text-[10px] text-slate-500 uppercase">{q.name}</div>
                    <div className="font-mono text-sm font-bold text-slate-100">
                      ${q.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  {q.change != null && (
                    <div className={`flex items-center gap-0.5 text-xs font-mono font-bold ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {pos ? '+' : ''}{q.change.toFixed(2)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}