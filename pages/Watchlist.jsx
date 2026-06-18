import React, { useState } from 'react';
import PageShell from '@/components/layout/PageShell';
import PullToRefresh from '@/components/layout/PullToRefresh';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Bell, TrendingUp, TrendingDown, Activity, Landmark, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';

import WatchlistTable from '@/components/watchlist/WatchlistTable';
import AlertFeed from '@/components/watchlist/AlertFeed';
import AddAssetDialog from '@/components/watchlist/AddAssetDialog';
import AiBuddy from '@/components/ai/AiBuddy';
import PortfolioChart from '@/components/watchlist/PortfolioChart';

export default function Watchlist() {
  const [addOpen, setAddOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingTech, setIsLoadingTech] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allItems = [], isLoading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => base44.entities.WatchlistItem.list('-created_date', 200),
  });

  const items = allItems;

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => base44.entities.Alert.list('-created_date', 100),
    refetchInterval: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const item = await base44.entities.WatchlistItem.create({
        ...data,
        owner_email: user?.email,
      });
      return item;
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      refreshSinglePrice(item);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WatchlistItem.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['watchlist'] });
      const previous = queryClient.getQueryData(['watchlist']);
      queryClient.setQueryData(['watchlist'], (old = []) =>
        old.map(item => item.id === id ? { ...item, ...data } : item)
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['watchlist'], ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WatchlistItem.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['watchlist'] });
      const previous = queryClient.getQueryData(['watchlist']);
      queryClient.setQueryData(['watchlist'], (old = []) =>
        old.filter(item => item.id !== id)
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['watchlist'], ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  });

  const refreshSinglePrice = async (item) => {
    try {
      const res = await base44.functions.invoke('fetchMarketPrices', { symbols: [item.symbol] });
      const price = res.data?.prices?.[item.symbol]?.price;
      if (price) {
        await base44.entities.WatchlistItem.update(item.id, {
          current_price: price,
          last_price_update: new Date().toISOString(),
        });
        queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      }
    } catch (e) {
      console.error('Price fetch failed:', e);
    }
  };

  const handleRefreshTechnicals = async () => {
    if (!items.length) return;
    setIsLoadingTech(true);
    try {
      const symbols = [...new Set(items.map(i => i.symbol))];
      const batches = [];
      for (let i = 0; i < symbols.length; i += 10) batches.push(symbols.slice(i, i + 10));
      for (const batch of batches) {
        const res = await base44.functions.invoke('fetchTechnicals', { symbols: batch });
        const tech = res.data?.technicals || {};
        await Promise.all(
          items
            .filter(item => batch.includes(item.symbol) && tech[item.symbol])
            .map(item => {
              const t = tech[item.symbol];
              return base44.entities.WatchlistItem.update(item.id, {
                rsi: t.rsi, rsi_signal: t.rsi_signal,
                ema20: t.ema20, ema50: t.ema50, ema_signal: t.ema_signal,
                macd: t.macd, macd_signal_line: t.macd_signal_line,
                macd_histogram: t.macd_histogram, macd_signal: t.macd_signal,
                last_technical_update: new Date().toISOString(),
              });
            })
        );
      }
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      toast.success('Technicals updated');
    } catch (e) {
      toast.error('Technicals fetch failed');
    }
    setIsLoadingTech(false);
  };

  const handleRefreshAll = async () => {
    if (!items.length) return;
    setIsRefreshing(true);
    try {
      const symbols = [...new Set(items.map(i => i.symbol))];
      const res = await base44.functions.invoke('fetchMarketPrices', { symbols });
      const prices = res.data?.prices || {};
      await Promise.all(
        items.map(item => {
          const p = prices[item.symbol];
          if (p?.price) {
            return base44.entities.WatchlistItem.update(item.id, {
              current_price: p.price,
              open_price: p.open_price ?? undefined,
              close_price: p.close_price ?? undefined,
              last_price_update: new Date().toISOString(),
            });
          }
        }).filter(Boolean)
      );
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      toast.success(`Refreshed ${Object.keys(prices).length} prices`);
    } catch (e) {
      toast.error('Price refresh failed');
    }
    setIsRefreshing(false);
  };

  const overboughtCount = items.filter(i => i.rsi_signal === 'overbought').length;
  const oversoldCount   = items.filter(i => i.rsi_signal === 'oversold').length;

  const triggered = items.filter(item => {
    if (!item.current_price || !item.belief_price) return false;
    const edge = Math.abs((item.belief_price - item.current_price) / item.current_price * 100);
    return edge >= (item.edge_threshold || 5);
  });
  const buySignals   = triggered.filter(item => item.belief_price > item.current_price).length;
  const sellSignals  = triggered.filter(item => item.belief_price < item.current_price).length;
  const unreadAlerts = alerts.filter(a => !a.is_read && (!a.owner_email || a.owner_email === user?.email)).length;

  const existingSymbols = items.map(i => i.symbol);

  return (
    <PageShell
      navProps={{ onAddToWatchlist: (data) => createMutation.mutate(data), watchlistSymbols: existingSymbols }}
      glowLeft="bg-purple-600/4"
      glowRight="bg-blue-600/4"
    >
    <PullToRefresh onRefresh={handleRefreshAll}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Landmark className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Edge Scanner</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Market Watchlist</h1>
          <p className="text-xs text-slate-600 mt-0.5 font-mono">
            Stocks · ETFs · Crypto — scanner runs every 15 min
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshTechnicals}
            disabled={isLoadingTech || !items.length}
            className="border-slate-800 bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-slate-100 text-xs"
          >
            <BarChart2 className={`w-3.5 h-3.5 mr-1.5 ${isLoadingTech ? 'animate-pulse' : ''}`} />
            Run Technicals
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={isRefreshing || !items.length}
            className="border-slate-800 bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-slate-100 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Prices
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white text-xs">
            <Plus className="w-3.5 h-3.5 mr-1.5" />Add Asset
          </Button>
        </div>
      </div>

      {/* Stat bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Watching',     value: items.length,   icon: Activity,    color: 'text-slate-400',   bg: 'border-slate-800' },
          { label: 'BUY Signals',  value: buySignals,     icon: TrendingUp,  color: 'text-emerald-400', bg: 'border-emerald-500/15' },
          { label: 'SELL Signals', value: sellSignals,    icon: TrendingDown,color: 'text-red-400',     bg: 'border-red-500/15' },
          { label: 'Overbought',   value: overboughtCount,icon: BarChart2,   color: 'text-red-400',     bg: 'border-red-500/15' },
          { label: 'Oversold',     value: oversoldCount,  icon: BarChart2,   color: 'text-emerald-400', bg: 'border-emerald-500/15' },
          { label: 'Unread Alerts',value: unreadAlerts,   icon: Bell,        color: 'text-amber-400',   bg: 'border-amber-500/15' },
        ].map((s, i) => (
          <div key={i} className={`bg-slate-900/40 border ${s.bg} rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</span>
            </div>
            <div className={`font-mono text-2xl font-bold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Portfolio Chart */}
      <PortfolioChart items={items} />

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Watchlist table */}
        <div className="lg:col-span-8">
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200">
                Monitored Assets
                <span className="ml-2 text-xs text-slate-600 font-normal">({items.length})</span>
              </span>
              <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-0">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-slate-800/50 animate-pulse">
                    <div className="w-16 h-4 bg-slate-800 rounded" />
                    <div className="flex-1 h-3 bg-slate-800/60 rounded" />
                    <div className="w-20 h-4 bg-slate-800 rounded" />
                    <div className="w-14 h-5 bg-slate-800 rounded-full" />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/60 flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-7 h-7 text-slate-600" />
                </div>
                <h3 className="text-slate-300 font-semibold mb-1">Nothing here yet</h3>
                <p className="text-sm text-slate-600 mb-5 max-w-xs mx-auto">Search any stock, ETF, or crypto across all global exchanges and track it here</p>
                <Button onClick={() => setAddOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />Add Asset
                </Button>
              </div>
            ) : (
              <WatchlistTable
                items={items}
                onUpdate={(id, data) => updateMutation.mutate({ id, data })}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            )}
          </div>
        </div>

        {/* Alert sidebar */}
        <div className="lg:col-span-4">
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 sticky top-20 max-h-[70vh] flex flex-col">
            <AlertFeed alerts={alerts} userEmail={user?.email} />
          </div>

          {/* Congress badge legend */}
          <div className="mt-4 bg-amber-500/5 border border-amber-500/10 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs">🏛</span>
              <span className="text-[10px] text-amber-400/70 uppercase tracking-wider font-mono">Congress Badge</span>
            </div>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              Assets flagged with 🏛 have known congressional trading activity on record (STOCK Act disclosures). Pelosi, Kennedy, and other members have traded these.
            </p>
          </div>
        </div>
      </div>

      <AddAssetDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={(data) => createMutation.mutate(data)}
        existingSymbols={existingSymbols}
      />

      <AiBuddy
        screenerResults={items.map(i => ({
          symbol: i.symbol,
          price: i.current_price,
          rsi: i.rsi,
          rsi_signal: i.rsi_signal,
          ema_signal: i.ema_signal,
          macd_signal: i.macd_signal,
          macd_histogram: i.macd_histogram,
          change_pct: i.current_price && i.belief_price
            ? ((i.current_price - i.belief_price) / i.belief_price) * 100
            : null,
          confluence: [i.rsi_signal !== 'neutral', i.ema_signal === 'uptrend', i.macd_signal === 'bullish_crossover'].filter(Boolean).length,
          signal: i.rsi_signal === 'oversold' ? 'BUY' : i.rsi_signal === 'overbought' ? 'SELL' : 'NEUTRAL',
          belief_price: i.belief_price,
          edge_threshold: i.edge_threshold,
        }))}
        markets={[]}
      />
    </PullToRefresh>
    </PageShell>
  );
}