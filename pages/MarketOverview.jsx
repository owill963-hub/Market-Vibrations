import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/layout/PageShell';
import TickerCard from '@/components/marketoverview/TickerCard';
import MoverRow from '@/components/marketoverview/MoverRow';
import ForexRow from '@/components/marketoverview/ForexRow';
import { RefreshCw, TrendingUp, TrendingDown, Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function Panel({ title, icon: Icon, iconColor, children, className = '' }) {
  return (
    <div className={`bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900/60">
        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        <span className="text-xs font-semibold text-slate-200">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function GridSkeleton({ count }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-10 gap-2 animate-pulse">
      {[...Array(count)].map((_, i) => <div key={i} className="h-20 bg-slate-800/60 rounded-xl" />)}
    </div>
  );
}

function ListSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-2 animate-pulse">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-7 bg-slate-800/60 rounded-lg" />
      ))}
    </div>
  );
}

function Empty() {
  return <p className="text-slate-600 text-xs font-mono py-2">No data — check Massive plan access</p>;
}

export default function MarketOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('fetchMarketOverview', {});
      setData(res.data);
      setLastFetch(new Date());
    } catch (e) {
      setError(e.message || 'Failed to load market data');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const stocks = data?.stocks || [];
  const gainers = data?.gainers || [];
  const losers = data?.losers || [];
  const crypto = data?.crypto || [];
  const cryptoGainers = data?.crypto_gainers || [];
  const cryptoLosers = data?.crypto_losers || [];
  const forex = data?.forex || [];

  return (
    <PageShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Market Overview</h1>
          <p className="text-[11px] text-slate-600 font-mono mt-0.5">
            Powered by Massive API ·{' '}
            {lastFetch ? `Updated ${lastFetch.toLocaleTimeString()}` : loading ? 'Loading…' : '—'}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={load}
          disabled={loading}
          className="border-slate-700 text-slate-400 hover:text-slate-200 bg-slate-900/40 text-xs"
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 text-sm font-mono">
          {error}
        </div>
      )}

      {/* ── Stock Tickers Grid ───────────────────────────────────────── */}
      <section className="mb-6">
        <div className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-3">
          Key Stocks &amp; ETFs
        </div>
        {loading && !data
          ? <GridSkeleton count={20} />
          : stocks.length
            ? <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-2">
                {stocks.map(t => <TickerCard key={t.ticker} t={t} />)}
              </div>
            : <Empty />
        }
      </section>

      {/* ── Stock Movers + Forex ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
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

      {/* ── Crypto ──────────────────────────────────────────────────── */}
      <section className="mb-6">
        <div className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mb-3">Crypto</div>
        {loading && !data
          ? <GridSkeleton count={10} />
          : crypto.length
            ? <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-10 gap-2">
                {crypto.map(t => <TickerCard key={t.ticker} t={t} />)}
              </div>
            : <Empty />
        }
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Top Crypto Gainers" icon={TrendingUp} iconColor="text-violet-400">
          {loading && !data ? <ListSkeleton rows={8} /> : cryptoGainers.length ? cryptoGainers.map((t, i) => <MoverRow key={i} t={t} type="gainer" />) : <Empty />}
        </Panel>
        <Panel title="Top Crypto Losers" icon={TrendingDown} iconColor="text-orange-400">
          {loading && !data ? <ListSkeleton rows={8} /> : cryptoLosers.length ? cryptoLosers.map((t, i) => <MoverRow key={i} t={t} type="loser" />) : <Empty />}
        </Panel>
      </div>
    </PageShell>
  );
}