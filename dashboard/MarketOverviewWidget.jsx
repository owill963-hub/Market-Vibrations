import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import TickerCard from '@/components/marketoverview/TickerCard';
import MoverRow from '@/components/marketoverview/MoverRow';
import ForexRow from '@/components/marketoverview/ForexRow';
import { RefreshCw, TrendingUp, TrendingDown, Globe, Loader2 } from 'lucide-react';

function Panel({ title, icon: Icon, iconColor, children }) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800 bg-slate-900/60">
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        <span className="text-xs font-semibold text-slate-200">{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function ListSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-2 animate-pulse">
      {[...Array(rows)].map((_, i) => <div key={i} className="h-7 bg-slate-800/60 rounded-lg" />)}
    </div>
  );
}

function GridSkeleton({ count = 10 }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-2 animate-pulse">
      {[...Array(count)].map((_, i) => <div key={i} className="h-20 bg-slate-800/60 rounded-xl" />)}
    </div>
  );
}

function Empty() {
  return <p className="text-slate-600 text-xs font-mono py-2">No data available</p>;
}

export default function MarketOverviewWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('fetchMarketOverview', {});
      setData(res.data);
      setLastFetch(new Date());
    } catch (e) {
      console.error('MarketOverviewWidget:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const stocks = data?.stocks || [];
  const gainers = data?.gainers || [];
  const losers = data?.losers || [];
  const crypto = data?.crypto || [];
  const forex = data?.forex || [];

  return (
    <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <h2 className="text-sm font-bold text-slate-100">Market Overview</h2>
          {lastFetch && (
            <span className="text-[10px] font-mono text-slate-600 hidden sm:inline">
              · {lastFetch.toLocaleTimeString()}
            </span>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Stock Tickers Grid */}
        <section>
          <div className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-2">Key Stocks &amp; ETFs</div>
          {loading && !data
            ? <GridSkeleton count={20} />
            : stocks.length
              ? <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-2">
                  {stocks.map(t => <TickerCard key={t.ticker} t={t} />)}
                </div>
              : <Empty />
          }
        </section>

        {/* Movers + Forex */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Panel title="Top Gainers" icon={TrendingUp} iconColor="text-emerald-400">
            {loading && !data ? <ListSkeleton /> : gainers.length ? gainers.map((t, i) => <MoverRow key={i} t={t} type="gainer" />) : <Empty />}
          </Panel>
          <Panel title="Top Losers" icon={TrendingDown} iconColor="text-red-400">
            {loading && !data ? <ListSkeleton /> : losers.length ? losers.map((t, i) => <MoverRow key={i} t={t} type="loser" />) : <Empty />}
          </Panel>
          <Panel title="Forex Pairs" icon={Globe} iconColor="text-sky-400">
            {loading && !data ? <ListSkeleton rows={6} /> : forex.length ? forex.map((t, i) => <ForexRow key={i} t={t} />) : <Empty />}
          </Panel>
        </div>

        {/* Crypto Ticker Grid */}
        <section>
          <div className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-2">Crypto</div>
          {loading && !data
            ? <GridSkeleton count={10} />
            : crypto.length
              ? <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-2">
                  {crypto.map(t => <TickerCard key={t.ticker} t={t} />)}
                </div>
              : <Empty />
          }
        </section>
      </div>
    </div>
  );
}