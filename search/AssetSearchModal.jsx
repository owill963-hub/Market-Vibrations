import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Search, Loader2, TrendingUp, TrendingDown, BarChart2, Plus, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSRLevels, SRPanel } from '@/components/screener/SRLevels';
import {
  ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine
} from 'recharts';

function fmt(n, d = 2) {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtBig(n) {
  if (n == null) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
}

function CandleBar({ x, y, width, height, open, close }) {
  const color = close >= open ? '#10b981' : '#ef4444';
  return <rect x={x} y={y} width={Math.max(width - 1, 1)} height={Math.max(height, 1)} fill={color} opacity={0.75} />;
}

function MiniTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-[9px] font-mono">
      <div className="text-slate-400 mb-0.5">{d.date}</div>
      <div className="text-emerald-400">H {d.high?.toFixed(2)}</div>
      <div className="text-red-400">L {d.low?.toFixed(2)}</div>
      <div className={d.close >= d.open ? 'text-emerald-300' : 'text-red-300'}>C {d.close?.toFixed(2)}</div>
    </div>
  );
}

function StatBox({ label, value, color = 'text-slate-200' }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-2.5 text-center">
      <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-0.5">{label}</div>
      <div className={`text-xs font-mono font-bold ${color}`}>{value}</div>
    </div>
  );
}

function AssetStats({ stats, onClose, onAddToWatchlist, existingSymbols = [] }) {
  const isUp = stats.change_pct >= 0;
  const ohlc = stats.ohlc || [];
  const srLevels = useSRLevels(ohlc, stats.price);
  const chartSlice = ohlc.map(d => ({
    ...d,
    candleBody: d.close >= d.open ? [d.open, d.close] : [d.close, d.open],
  }));
  const isInWatchlist = existingSymbols.includes(stats.symbol);
  const [added, setAdded] = useState(isInWatchlist);

  const recColor = {
    'strong_buy': 'text-emerald-300', 'buy': 'text-emerald-400',
    'hold': 'text-yellow-400', 'sell': 'text-red-400', 'strong_sell': 'text-red-300',
  }[stats.recommendation] || 'text-slate-400';

  const handleAdd = () => {
    if (onAddToWatchlist) {
      onAddToWatchlist({
        symbol: stats.symbol,
        name: stats.name,
        exchange: stats.exchange || '',
        sector: stats.sector || '',
        asset_type: stats.symbol.includes('-USD') ? 'crypto' : 'stock',
        belief_price: 0,
        current_price: stats.price || 0,
        edge_threshold: 5,
        alert_direction: 'both',
        is_active: true,
      });
      setAdded(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Asset header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xl font-bold text-slate-100">{stats.symbol}</span>
            <span className={`font-mono text-lg font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
              {stats.currency !== 'USD' ? stats.currency + ' ' : '$'}{fmt(stats.price)}
            </span>
            <span className={`text-sm font-mono ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
              {isUp ? '+' : ''}{fmt(stats.change_pct)}%
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{stats.name}</div>
          {(stats.sector || stats.industry || stats.exchange) && (
            <div className="text-[10px] text-slate-600 mt-0.5">
              {[stats.exchange, stats.sector, stats.industry].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onAddToWatchlist && (
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={added}
              className={`h-8 text-xs ${added ? 'bg-emerald-700/50 text-emerald-300 cursor-default' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
            >
              {added
                ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Watching</>
                : <><Plus className="w-3.5 h-3.5 mr-1" />Add to Watchlist</>
              }
            </Button>
          )}
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartSlice} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 8 }} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
            <YAxis domain={['auto', 'auto']} tick={{ fill: '#475569', fontSize: 8 }} />
            <Tooltip content={<MiniTooltip />} />
            {srLevels.traumaZones.slice(0, 2).map((z, i) => (
              <ReferenceLine key={`tz-${i}`} y={(z.low + z.high) / 2} stroke="#a855f7" strokeDasharray="3 3" strokeWidth={1} />
            ))}
            {srLevels.resistances.slice(0, 2).map((r, i) => (
              <ReferenceLine key={`r-${i}`} y={r.price} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1}
                label={{ value: `R${i + 1}`, fill: '#ef4444', fontSize: 7, position: 'insideTopRight' }} />
            ))}
            {srLevels.supports.slice(0, 2).map((s, i) => (
              <ReferenceLine key={`s-${i}`} y={s.price} stroke="#10b981" strokeDasharray="4 3" strokeWidth={1}
                label={{ value: `S${i + 1}`, fill: '#10b981', fontSize: 7, position: 'insideBottomRight' }} />
            ))}
            {stats.ema20 && <ReferenceLine y={stats.ema20} stroke="#3b82f6" strokeDasharray="3 3" strokeWidth={1} label={{ value: 'EMA20', fill: '#3b82f6', fontSize: 7 }} />}
            {stats.ema50 && <ReferenceLine y={stats.ema50} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} label={{ value: 'EMA50', fill: '#f59e0b', fontSize: 7 }} />}
            <Bar dataKey="candleBody" shape={<CandleBar />} fill="#10b981" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Key stats grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        <StatBox label="RSI" value={stats.rsi ? fmt(stats.rsi, 0) : '—'} color={stats.rsi >= 70 ? 'text-red-400' : stats.rsi <= 30 ? 'text-emerald-400' : 'text-slate-300'} />
        <StatBox label="Mkt Cap" value={fmtBig(stats.market_cap)} />
        <StatBox label="P/E Fwd" value={stats.pe_forward ? fmt(stats.pe_forward, 1) : '—'} />
        <StatBox label="EPS" value={stats.eps ? fmt(stats.eps) : '—'} />
        <StatBox label="Beta" value={stats.beta ? fmt(stats.beta, 2) : '—'} />
        <StatBox label="Div Yield" value={stats.dividend_yield ? (stats.dividend_yield * 100).toFixed(2) + '%' : '—'} />
        <StatBox label="52W High" value={`$${fmt(stats.high_52w)}`} color="text-emerald-400" />
        <StatBox label="52W Low"  value={`$${fmt(stats.low_52w)}`}  color="text-red-400" />
        <StatBox label="Earn Gr" value={stats.earnings_growth != null ? (stats.earnings_growth * 100).toFixed(1) + '%' : '—'} color={stats.earnings_growth > 0 ? 'text-emerald-400' : 'text-red-400'} />
        <StatBox label="Rev Gr"  value={stats.revenue_growth  != null ? (stats.revenue_growth  * 100).toFixed(1) + '%' : '—'} color={stats.revenue_growth > 0 ? 'text-emerald-400' : 'text-red-400'} />
        <StatBox label="ROE" value={stats.roe != null ? (stats.roe * 100).toFixed(1) + '%' : '—'} />
        <StatBox label="Analyst" value={stats.recommendation ? stats.recommendation.replace('_', ' ').toUpperCase() : '—'} color={recColor} />
      </div>

      {/* S/R + Trauma panel */}
      <SRPanel {...srLevels} currentPrice={stats.price} />

      {/* Description */}
      {stats.description && (
        <div className="text-[10px] text-slate-500 leading-relaxed line-clamp-4 border-t border-slate-800 pt-3">
          {stats.description}
        </div>
      )}
    </div>
  );
}

export default function AssetSearchModal({ onClose, onAddToWatchlist, existingSymbols = [] }) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  const search = useCallback((q) => {
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await base44.functions.invoke('fetchAssetStats', { query: q });
      setSearchResults(res.data?.results || []);
      setSearching(false);
    }, 350);
  }, []);

  const loadStats = async (sym) => {
    setSelected(sym);
    setStats(null);
    setLoadingStats(true);
    setSearchResults([]);
    setQuery('');
    const res = await base44.functions.invoke('fetchAssetStats', { symbol: sym });
    setStats(res.data);
    setLoadingStats(false);
  };

  const handleInput = (e) => {
    setQuery(e.target.value);
    search(e.target.value);
    if (stats) { setStats(null); setSelected(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-950/90 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 shrink-0">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={handleInput}
            placeholder="Search any stock, ETF, crypto, index across all exchanges…"
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-600 outline-none"
          />
          {searching && <Loader2 className="w-4 h-4 text-slate-500 animate-spin shrink-0" />}
          <button onClick={onClose} className="text-slate-600 hover:text-slate-200 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Search results list */}
          {searchResults.length > 0 && !stats && (
            <div className="py-1">
              {searchResults.map(r => {
                const inWatchlist = existingSymbols.includes(r.symbol);
                return (
                  <div key={r.symbol} className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-800/60 transition-colors">
                    <button
                      onClick={() => loadStats(r.symbol)}
                      className="flex items-center gap-3 flex-1 text-left min-w-0"
                    >
                      <div className="w-16 shrink-0">
                        <span className="font-mono text-sm font-bold text-slate-100">{r.symbol}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-300 truncate">{r.name}</div>
                        <div className="text-[10px] text-slate-600">{[r.exchange, r.type].filter(Boolean).join(' · ')}</div>
                      </div>
                      <BarChart2 className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    </button>
                    {onAddToWatchlist && (
                      <button
                        disabled={inWatchlist}
                        onClick={() => {
                          if (!inWatchlist) onAddToWatchlist({
                            symbol: r.symbol,
                            name: r.name,
                            exchange: r.exchange || '',
                            sector: r.sector || '',
                            asset_type: r.type === 'CRYPTOCURRENCY' ? 'crypto' : r.type === 'ETF' ? 'etf' : 'stock',
                            belief_price: 0, current_price: 0, edge_threshold: 5, alert_direction: 'both', is_active: true,
                          });
                        }}
                        className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono transition-colors border ${
                          inWatchlist
                            ? 'border-emerald-500/20 text-emerald-500/50 cursor-default'
                            : 'border-purple-500/30 text-purple-400 hover:bg-purple-500/10'
                        }`}
                      >
                        {inWatchlist ? <><CheckCircle2 className="w-3 h-3" />Added</> : <><Plus className="w-3 h-3" />Watch</>}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Loading stats */}
          {loadingStats && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
              <span className="text-sm text-slate-500 font-mono">Fetching stats for {selected}…</span>
            </div>
          )}

          {/* Asset stats */}
          {stats && !loadingStats && (
            <div className="p-4">
              <AssetStats
                stats={stats}
                onClose={onClose}
                onAddToWatchlist={onAddToWatchlist}
                existingSymbols={existingSymbols}
              />
            </div>
          )}

          {/* Empty state */}
          {!query && !stats && !loadingStats && (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Search className="w-10 h-10 text-slate-800" />
              <p className="text-slate-600 text-sm">Search any asset across all markets</p>
              <p className="text-[10px] text-slate-700">NYSE · NASDAQ · LSE · TSX · ASX · Crypto · ETFs · Indices</p>
              <div className="flex flex-wrap gap-1.5 mt-2 justify-center">
                {['AAPL', 'BTC-USD', 'SPY', 'NVDA', 'TSLA', 'GLD'].map(sym => (
                  <button key={sym} onClick={() => loadStats(sym)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-full text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors">
                    {sym}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}