import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown, Loader2, RefreshCw } from 'lucide-react';

function fmt(n, digits = 2) {
  if (n == null) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtPrice(p) {
  if (p == null) return '—';
  if (p >= 1000) return '$' + p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 1)    return '$' + fmt(p, 2);
  if (p >= 0.01) return '$' + fmt(p, 4);
  return '$' + p.toFixed(6);
}

function fmtVol(v) {
  if (v == null) return null;
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
  return String(Math.round(v));
}

function CryptoRow({ coin, type }) {
  const isUp = type === 'gainer';
  const pct = coin.changePct;
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-slate-800/40 last:border-0 hover:bg-slate-800/20 px-1 -mx-1 rounded transition-colors">
      {coin.image && (
        <img src={coin.image} alt={coin.ticker} className="w-4 h-4 rounded-full shrink-0" onError={e => { e.target.style.display='none'; }} />
      )}
      <div className="min-w-0 flex-1 flex items-center gap-2">
        <span className="font-mono text-xs font-semibold text-slate-200 shrink-0">{coin.ticker?.replace('-USD','')}</span>
        <span className="text-[9px] text-slate-600 truncate hidden sm:block">{coin.name}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
        {coin.volume && <span className="text-[9px] text-slate-600 hidden md:block">{fmtVol(coin.volume)}</span>}
        <span className="text-slate-400 text-[10px]">{fmtPrice(coin.price)}</span>
        {pct != null && (
          <span className={`font-bold w-14 text-right text-[10px] ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {isUp ? '+' : ''}{fmt(pct)}%
          </span>
        )}
      </div>
    </div>
  );
}

function Skeleton({ rows = 10 }) {
  return (
    <div className="space-y-2 animate-pulse">
      {[...Array(rows)].map((_, i) => <div key={i} className="h-7 bg-slate-800/60 rounded-lg" />)}
    </div>
  );
}

export default function CryptoGainersLosers() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(null);
  const [tab, setTab] = useState('gainers'); // 'gainers' | 'losers'

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('fetchMarketOverview', {});
      setData(res.data);
      setLastFetch(new Date());
    } catch (e) {
      console.error('CryptoGainersLosers:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const gainers = data?.crypto_gainers || [];
  const losers  = data?.crypto_losers  || [];
  const list = tab === 'gainers' ? gainers : losers;

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg overflow-hidden border border-slate-700">
            <button
              onClick={() => setTab('gainers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold transition-colors ${
                tab === 'gainers' ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <TrendingUp className="w-3 h-3" /> Gainers
              {gainers.length > 0 && <span className="text-[9px]">({gainers.length})</span>}
            </button>
            <button
              onClick={() => setTab('losers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold transition-colors border-l border-slate-700 ${
                tab === 'losers' ? 'bg-red-500/15 text-red-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <TrendingDown className="w-3 h-3" /> Losers
              {losers.length > 0 && <span className="text-[9px]">({losers.length})</span>}
            </button>
          </div>
          <span className="text-[9px] font-mono text-slate-700 hidden sm:inline">24h · CoinGecko Top 100</span>
        </div>
        <div className="flex items-center gap-3">
          {lastFetch && <span className="text-[9px] font-mono text-slate-700">{lastFetch.toLocaleTimeString()}</span>}
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </button>
        </div>
      </div>

      <div className="px-5 py-3">
        {loading && !data
          ? <Skeleton rows={10} />
          : list.length
            ? list.map((c, i) => <CryptoRow key={i} coin={c} type={tab} />)
            : <p className="text-slate-600 text-xs font-mono py-4 text-center">No data</p>
        }
      </div>
    </div>
  );
}