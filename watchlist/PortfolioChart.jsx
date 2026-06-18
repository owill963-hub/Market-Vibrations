import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const RANGES = [
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
  { label: '2Y', value: '2y' },
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const portfolio = payload.find(p => p.dataKey === 'portfolio');
  const spy = payload.find(p => p.dataKey === 'spy');
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-xs font-mono shadow-xl">
      <div className="text-slate-400 mb-2">{label}</div>
      {portfolio && (
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
          <span className="text-slate-400">Portfolio</span>
          <span className={`ml-auto font-bold ${portfolio.value >= 100 ? 'text-emerald-400' : 'text-red-400'}`}>
            {portfolio.value >= 100 ? '+' : ''}{(portfolio.value - 100).toFixed(2)}%
          </span>
        </div>
      )}
      {spy && (
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
          <span className="text-slate-400">S&P 500</span>
          <span className={`ml-auto font-bold ${spy.value >= 100 ? 'text-emerald-400' : 'text-red-400'}`}>
            {spy.value >= 100 ? '+' : ''}{(spy.value - 100).toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value, color }) {
  const isPos = value >= 0;
  return (
    <div className="flex flex-col items-center sm:items-start">
      <span className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">{label}</span>
      <span className={`font-mono font-bold text-sm ${isPos ? color : 'text-red-400'}`}>
        {isPos ? '+' : ''}{value?.toFixed(2)}%
      </span>
    </div>
  );
}

export default function PortfolioChart({ items }) {
  const [range, setRange] = useState('3mo');

  const symbols = items
    .map(i => i.symbol)
    .filter(Boolean)
    .filter(s => s !== 'SPY');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['portfolio-history', symbols.join(','), range],
    queryFn: async () => {
      if (!symbols.length) return { series: [] };
      const res = await base44.functions.invoke('fetchPortfolioHistory', { symbols, range });
      return res.data;
    },
    enabled: symbols.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const series = data?.series || [];

  const firstPoint = series[0];
  const lastPoint = series[series.length - 1];
  const portfolioReturn = lastPoint ? (lastPoint.portfolio ?? 100) - 100 : null;
  const spyReturn = lastPoint ? (lastPoint.spy ?? 100) - 100 : null;
  const alpha = portfolioReturn != null && spyReturn != null ? portfolioReturn - spyReturn : null;

  // Format date labels
  const formatted = series.map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  const isEmpty = !symbols.length;
  const isPositive = portfolioReturn == null || portfolioReturn >= 0;

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden mb-6">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-200">Portfolio Performance</div>
            <div className="text-[10px] text-slate-600 font-mono">Equal-weighted · vs S&P 500 benchmark</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats */}
          {series.length > 0 && (
            <div className="hidden sm:flex items-center gap-4 mr-2 border-r border-slate-800 pr-4">
              <StatPill label="Portfolio" value={portfolioReturn} color="text-violet-400" />
              <StatPill label="S&P 500" value={spyReturn} color="text-blue-400" />
              <StatPill label="Alpha" value={alpha} color="text-emerald-400" />
            </div>
          )}

          {/* Range selector */}
          <div className="flex items-center gap-0.5 bg-slate-800/60 rounded-lg p-0.5">
            {RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-medium transition-all ${
                  range === r.value
                    ? 'bg-slate-700 text-slate-100'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(isLoading || isRefetching) ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile stats */}
      {series.length > 0 && (
        <div className="flex sm:hidden items-center gap-4 px-4 py-2 border-b border-slate-800/50">
          <StatPill label="Portfolio" value={portfolioReturn} color="text-violet-400" />
          <StatPill label="S&P 500" value={spyReturn} color="text-blue-400" />
          <StatPill label="Alpha" value={alpha} color="text-emerald-400" />
        </div>
      )}

      {/* Chart */}
      <div className="p-4">
        {isEmpty ? (
          <div className="h-48 flex items-center justify-center text-slate-600 text-sm font-mono">
            Add assets to see portfolio performance
          </div>
        ) : isLoading ? (
          <div className="h-48 flex items-center justify-center gap-2 text-slate-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-mono">Loading historical data…</span>
          </div>
        ) : series.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-600 text-sm font-mono">
            No data available for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={formatted} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="spyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: '#475569' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={v => `${v >= 100 ? '+' : ''}${(v - 100).toFixed(0)}%`}
                tick={{ fontSize: 9, fill: '#475569' }}
                tickLine={false}
                axisLine={false}
                width={46}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={100} stroke="#334155" strokeWidth={1} strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="spy"
                stroke="#3b82f6"
                strokeWidth={1.5}
                fill="url(#spyGrad)"
                dot={false}
                strokeDasharray="4 2"
                activeDot={{ r: 3, fill: '#3b82f6' }}
              />
              <Area
                type="monotone"
                dataKey="portfolio"
                stroke="#7c3aed"
                strokeWidth={2}
                fill="url(#portfolioGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#7c3aed' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* Legend */}
        {series.length > 0 && (
          <div className="flex items-center gap-4 mt-2 justify-end text-[10px] font-mono text-slate-500">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-0.5 bg-violet-500 rounded" />
              <span>Portfolio ({symbols.length} assets)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-0.5 bg-blue-500 rounded opacity-60 border-dashed" style={{ borderTop: '1px dashed #3b82f6', background: 'none', height: 0 }} />
              <span>S&P 500</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}