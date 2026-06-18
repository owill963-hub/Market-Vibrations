import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Play, Loader2, ChevronDown, ChevronUp, Bell, LineChart, Plus, Minus } from 'lucide-react';
import { SCREENER_ASSETS, SCREENER_ASSET_MAP } from '@/lib/screenerAssets';
import SignalBadge from './SignalBadge';
import AssetChartModal from './AssetChartModal';
import PriceAlertsPanel from './PriceAlertsPanel';
import { PowerGaugeBadge, PowerGaugeDetail } from './PowerGaugeBadge';
import { PO3Badge, SeekDestroyBadge, SDBadge, ICTDetail } from './ICTIndicators';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const SIGNAL_ORDER = { STRONG_BUY: 0, BUY: 1, DCA: 2, NEUTRAL: 3, REDUCE: 4, SELL: 5, STRONG_SELL: 6 };

function fmt(n, digits = 2) {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function RsiBar({ rsi }) {
  if (rsi == null) return <span className="text-slate-700 text-xs font-mono">—</span>;
  const color = rsi >= 70 ? 'text-red-400' : rsi <= 30 ? 'text-emerald-400' : 'text-slate-400';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${rsi >= 70 ? 'bg-red-400' : rsi <= 30 ? 'bg-emerald-400' : 'bg-slate-500'}`} style={{ width: `${rsi}%` }} />
      </div>
      <span className={`text-xs font-mono ${color}`}>{rsi.toFixed(0)}</span>
    </div>
  );
}

function ConfluenceDots({ score }) {
  if (score == null) return <span className="text-slate-700 text-xs">—</span>;
  const colors = ['bg-slate-700', 'bg-yellow-500', 'bg-orange-400', 'bg-emerald-400'];
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map(i => (
        <span key={i} className={`w-2 h-2 rounded-full ${i < score ? colors[score] : 'bg-slate-800'}`} />
      ))}
      <span className={`text-[9px] font-mono ml-0.5 ${score === 3 ? 'text-emerald-400' : score === 2 ? 'text-orange-400' : score === 1 ? 'text-yellow-500' : 'text-slate-600'}`}>
        {score}/3
      </span>
    </div>
  );
}

function DcaCell({ result, type }) {
  if (type === 'buy') return (
    <div className="text-[10px] font-mono space-y-0.5">
      <div><span className="text-slate-600">Z1 </span><span className="text-blue-300">${fmt(result.dca_z1)}</span></div>
      <div><span className="text-slate-600">Z2 </span><span className="text-blue-300">${fmt(result.dca_z2)}</span></div>
      <div><span className="text-slate-600">Z3 </span><span className="text-blue-300">${fmt(result.dca_z3)}</span></div>
    </div>
  );
  if (type === 'sell') return (
    <div className="text-[10px] font-mono space-y-0.5">
      <div><span className="text-slate-600">TP1 </span><span className="text-emerald-400">${fmt(result.tp1)}</span></div>
      <div><span className="text-slate-600">TP2 </span><span className="text-emerald-400">${fmt(result.tp2)}</span></div>
      <div><span className="text-slate-600">TP3 </span><span className="text-emerald-400">${fmt(result.tp3)}</span></div>
    </div>
  );
  return (
    <div className="text-[10px] font-mono space-y-0.5">
      <div><span className="text-slate-600">SL1 </span><span className="text-red-400">${fmt(result.sl1)}</span></div>
      <div><span className="text-slate-600">SL2 </span><span className="text-red-500">${fmt(result.sl2)}</span></div>
      <div>
        <span className="text-slate-600">R:R </span>
        <span className={result.rr >= 2 ? 'text-emerald-400' : result.rr >= 1 ? 'text-yellow-400' : 'text-red-400'}>
          {result.rr != null ? `1:${result.rr}` : '—'}
        </span>
      </div>
    </div>
  );
}

function ResultRow({ result, onOpen, watchlistSymbols, onAdd, onRemove, watchlistItems }) {
  const [expanded, setExpanded] = useState(false);
  const meta = SCREENER_ASSET_MAP[result.symbol] || {};
  const isUp = result.change_pct >= 0;
  const isWatched = watchlistSymbols.has(result.symbol);
  const watchlistItem = watchlistItems?.find(i => i.symbol === result.symbol);

  const handleWatchlistToggle = (e) => {
    e.stopPropagation();
    if (isWatched && watchlistItem) {
      onRemove(watchlistItem.id);
    } else {
      onAdd(result);
    }
  };

  return (
    <>
      <tr
        className="border-b border-slate-800/50 hover:bg-slate-800/20 cursor-pointer transition-colors group"
        onClick={() => setExpanded(e => !e)}
      >
        <td className="py-2.5 pl-4 pr-2">
          <div className="flex items-center gap-1.5">
            {expanded ? <ChevronUp className="w-3 h-3 text-slate-600 shrink-0" /> : <ChevronDown className="w-3 h-3 text-slate-600 shrink-0" />}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm font-bold text-slate-100">{result.symbol.replace('-USD', '')}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onOpen(result); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-200"
                  title="View chart"
                >
                  <LineChart className="w-3 h-3" />
                </button>
                <button
                  onClick={handleWatchlistToggle}
                  className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-xs ${
                    isWatched
                      ? 'hover:bg-red-900/40 text-red-400 hover:text-red-300'
                      : 'hover:bg-emerald-900/40 text-emerald-600 hover:text-emerald-400'
                  }`}
                  title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
                >
                  {isWatched ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                </button>
              </div>
              <div className="text-[9px] text-slate-600 font-mono">{meta.exchange}</div>
            </div>
          </div>
        </td>
        <td className="py-2.5 px-2 hidden sm:table-cell">
          <div className="text-xs text-slate-400 truncate max-w-[140px]">{meta.name || result.symbol}</div>
          <div className="text-[9px] text-slate-700">{meta.sector}</div>
        </td>
        <td className="py-2.5 px-2 text-right">
          <div className="font-mono text-sm text-slate-100">${fmt(result.price)}</div>
          <div className={`text-[10px] font-mono ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>{isUp ? '+' : ''}{fmt(result.change_pct)}%</div>
        </td>
        <td className="py-2.5 px-2 hidden md:table-cell"><RsiBar rsi={result.rsi} /></td>
        <td className="py-2.5 px-2"><SignalBadge signal={result.signal} size="xs" /></td>
        <td className="py-2.5 px-2 hidden lg:table-cell"><ConfluenceDots score={result.confluence} /></td>
        <td className="py-2.5 px-2 hidden lg:table-cell">
          {result.power_gauge != null
            ? <PowerGaugeBadge rating={result.pg_rating} score={result.power_gauge} />
            : <span className="text-slate-700 text-xs font-mono">—</span>
          }
        </td>
        <td className="py-2.5 px-2 hidden xl:table-cell"><PO3Badge po3={result.po3} /></td>
        <td className="py-2.5 px-2 hidden xl:table-cell"><SeekDestroyBadge sad={result.sad} /></td>
        <td className="py-2.5 px-2 hidden lg:table-cell">
          <span className={`font-mono text-xs font-bold ${result.rr >= 2 ? 'text-emerald-400' : result.rr >= 1 ? 'text-yellow-400' : 'text-slate-600'}`}>
            {result.rr != null ? `1:${result.rr}` : '—'}
          </span>
          <div className="text-[9px] text-slate-700 font-mono">risk:reward</div>
        </td>
        <td className="py-2.5 px-2 hidden xl:table-cell"><DcaCell result={result} type="buy" /></td>
        <td className="py-2.5 px-2 hidden xl:table-cell"><DcaCell result={result} type="stop" /></td>
        <td className="py-2.5 pr-4 hidden xl:table-cell"><DcaCell result={result} type="sell" /></td>
      </tr>
      {expanded && (
        <tr className="bg-slate-800/20 border-b border-slate-800">
          <td colSpan={10} className="px-4 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-[10px] font-mono">
              <div className="bg-slate-900/50 rounded-lg p-2"><div className="text-slate-600 mb-1">EMA 20</div><div className="text-slate-200">${fmt(result.ema20)}</div></div>
              <div className="bg-slate-900/50 rounded-lg p-2"><div className="text-slate-600 mb-1">EMA 50</div><div className="text-slate-200">${fmt(result.ema50)}</div></div>
              <div className="bg-slate-900/50 rounded-lg p-2">
                <div className="text-slate-600 mb-1">MACD Hist</div>
                <div className={result.macd_histogram >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {result.macd_histogram != null ? (result.macd_histogram > 0 ? '+' : '') + fmt(result.macd_histogram, 3) : '—'}
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2"><div className="text-slate-600 mb-1">ATR%</div><div className="text-slate-300">{result.atr_pct != null ? result.atr_pct.toFixed(2) + '%' : '—'}</div></div>
              <div className="bg-slate-900/50 rounded-lg p-2">
                <div className="text-slate-600 mb-1">Score / Conf</div>
                <div className={result.score >= 2 ? 'text-emerald-400' : result.score <= -2 ? 'text-red-400' : 'text-slate-400'}>
                  {result.score > 0 ? '+' : ''}{result.score} · {result.confluence ?? '—'}/3
                </div>
              </div>
              {result.power_gauge != null && (
                <div className="col-span-2 sm:col-span-4 lg:col-span-8">
                  <PowerGaugeDetail result={result} />
                </div>
              )}
              {(result.po3 || result.sad || result.sd) && (
                <div className="col-span-2 sm:col-span-4 lg:col-span-8">
                  <ICTDetail result={result} />
                </div>
              )}
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-2"><div className="text-slate-600 mb-1">DCA Entries</div><div className="text-blue-300">${fmt(result.dca_z1)} · ${fmt(result.dca_z2)} · ${fmt(result.dca_z3)}</div></div>
              <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2"><div className="text-slate-600 mb-1">Stop-Loss</div><div className="text-red-400">${fmt(result.sl1)}</div><div className="text-red-500 text-[9px]">Hard: ${fmt(result.sl2)}</div></div>
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2">
                <div className="text-slate-600 mb-1">TP / R:R</div>
                <div className="text-emerald-400">${fmt(result.tp1)} · ${fmt(result.tp2)}</div>
                <div className={`text-[9px] mt-0.5 ${result.rr >= 2 ? 'text-emerald-400' : result.rr >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>R:R = 1:{result.rr ?? '—'}</div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ScreenerPanel({ results, scanning, progress, onScan, lastScanned }) {
  const [signalFilter, setSignalFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('signal');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: watchlistItems = [] } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => base44.entities.WatchlistItem.list('-created_date', 200),
  });
  const watchlistSymbols = useMemo(() => new Set(watchlistItems.map(i => i.symbol)), [watchlistItems]);

  const addMutation = useMutation({
    mutationFn: async (result) => {
      const meta = SCREENER_ASSET_MAP[result.symbol] || {};
      return base44.entities.WatchlistItem.create({
        symbol: result.symbol,
        name: meta.name || result.symbol,
        exchange: meta.exchange || '',
        sector: meta.sector || '',
        asset_type: meta.asset_type || 'stock',
        current_price: result.price || 0,
        belief_price: 0,
        edge_threshold: 5,
        alert_direction: 'both',
        is_active: true,
        owner_email: user?.email,
        last_price_update: new Date().toISOString(),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id) => base44.entities.WatchlistItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
  });

  const filteredSorted = useMemo(() => {
    let list = results;
    if (signalFilter !== 'ALL') list = list.filter(r => r.signal === signalFilter);
    if (typeFilter !== 'ALL') list = list.filter(r => SCREENER_ASSET_MAP[r.symbol]?.asset_type === typeFilter.toLowerCase());
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => {
        const meta = SCREENER_ASSET_MAP[r.symbol];
        return r.symbol.toLowerCase().includes(q) || meta?.name?.toLowerCase().includes(q) || meta?.sector?.toLowerCase().includes(q);
      });
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'signal')     return (SIGNAL_ORDER[a.signal] ?? 3) - (SIGNAL_ORDER[b.signal] ?? 3);
      if (sortBy === 'confluence') return (b.confluence ?? 0) - (a.confluence ?? 0);
      if (sortBy === 'power')      return (b.power_gauge ?? 0) - (a.power_gauge ?? 0);
      if (sortBy === 'rr')         return (b.rr ?? 0) - (a.rr ?? 0);
      if (sortBy === 'score')      return b.score - a.score;
      if (sortBy === 'edge')       return b.edge_pct - a.edge_pct;
      if (sortBy === 'rsi_asc')    return (a.rsi ?? 50) - (b.rsi ?? 50);
      if (sortBy === 'change')     return b.change_pct - a.change_pct;
      return 0;
    });
  }, [results, signalFilter, typeFilter, search, sortBy]);

  const counts = results.reduce((acc, r) => { acc[r.signal] = (acc[r.signal] || 0) + 1; return acc; }, {});

  return (
    <div className="space-y-4">
      {selectedAsset && <AssetChartModal result={selectedAsset} onClose={() => setSelectedAsset(null)} />}

      {/* Alerts panel */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-mono text-amber-400/70 uppercase tracking-wider">Price Alerts</span>
        </div>
        <PriceAlertsPanel />
      </div>

      {/* Scan button + progress */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400 font-medium">{SCREENER_ASSETS.length} assets scanned</p>
          <p className="text-[10px] text-slate-600 font-mono mt-0.5">
            RSI · MACD · EMA · ATR · ICT · Power Gauge · Confluence · DCA · R:R
            {lastScanned && !scanning && (
              <span className="ml-2 text-slate-700">· last run {lastScanned.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </p>
        </div>
        <Button onClick={onScan} disabled={scanning} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
          {scanning
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning {progress}%</>
            : <><Play className="w-4 h-4 mr-2" />Run Full Scan</>
          }
        </Button>
      </div>

      {scanning && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-2">
            <span>Scanning {results.length} / {SCREENER_ASSETS.length} assets…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Stats bar */}
      {results.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
          {[
            { key: 'STRONG_BUY',  label: '⬆⬆ S.BUY',  color: 'text-emerald-300', bg: 'border-emerald-500/20 bg-emerald-500/5' },
            { key: 'BUY',         label: '⬆ BUY',      color: 'text-emerald-400', bg: 'border-emerald-500/15 bg-emerald-500/[0.03]' },
            { key: 'DCA',         label: '◎ DCA',      color: 'text-blue-400',    bg: 'border-blue-500/15 bg-blue-500/5' },
            { key: 'NEUTRAL',     label: '— NEUTRAL',  color: 'text-slate-500',   bg: 'border-slate-700 bg-slate-800/20' },
            { key: 'REDUCE',      label: '⬇ REDUCE',   color: 'text-orange-400',  bg: 'border-orange-500/15 bg-orange-500/5' },
            { key: 'SELL',        label: '⬇ SELL',     color: 'text-red-400',     bg: 'border-red-500/15 bg-red-500/[0.03]' },
            { key: 'STRONG_SELL', label: '⬇⬇ S.SELL',  color: 'text-red-300',     bg: 'border-red-500/20 bg-red-500/5' },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setSignalFilter(f => f === s.key ? 'ALL' : s.key)}
              className={`border rounded-xl p-2 text-center transition-all ${s.bg} ${signalFilter === s.key ? 'ring-1 ring-slate-400' : ''}`}
            >
              <div className={`font-mono text-xl font-bold ${s.color}`}>{counts[s.key] || 0}</div>
              <div className={`text-[8px] font-mono uppercase tracking-wider mt-0.5 ${s.color}`}>{s.label.replace(/[⬆⬇◎—] /, '')}</div>
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search symbol / sector…"
              className="pl-7 h-7 w-44 bg-slate-800/60 border-slate-700 text-slate-200 placeholder:text-slate-600 text-xs"
            />
          </div>
          {['ALL', 'stock', 'etf', 'crypto'].map(t => (
            <button key={t}
              onClick={() => setTypeFilter(t === 'ALL' ? 'ALL' : t.toUpperCase())}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase transition-colors ${
                typeFilter === (t === 'ALL' ? 'ALL' : t.toUpperCase()) ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'
              }`}>{t}</button>
          ))}
          <div className="ml-auto flex items-center gap-1 text-[10px] font-mono text-slate-600">
            SORT:
            {[
              { val: 'signal', label: 'Signal' }, { val: 'confluence', label: '🔥 Conf' }, { val: 'power', label: '⚡ Power' }, { val: 'rr', label: 'R:R' },
              { val: 'score', label: 'Score' }, { val: 'edge', label: 'Edge%' }, { val: 'rsi_asc', label: 'RSI↑' }, { val: 'change', label: 'Chg%' },
            ].map(s => (
              <button key={s.val}
                onClick={() => setSortBy(s.val)}
                className={`px-2 py-0.5 rounded transition-colors ${sortBy === s.val ? 'bg-slate-700 text-slate-200' : 'hover:text-slate-400'}`}
              >{s.label}</button>
            ))}
          </div>
        </div>

        {results.length === 0 ? (
          <div className="text-center py-20 px-4">
            <Play className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <h3 className="text-slate-400 font-semibold mb-1">No scan results yet</h3>
            <p className="text-sm text-slate-600 mb-5">Click "Run Full Scan" to analyse {SCREENER_ASSETS.length} assets</p>
            <Button onClick={onScan} disabled={scanning} className="bg-emerald-600 hover:bg-emerald-700">
              <Play className="w-4 h-4 mr-2" />Run Full Scan
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="py-2 pl-4 pr-2 text-[10px] text-slate-500 uppercase tracking-wider font-medium">Symbol</th>
                  <th className="py-2 px-2 text-[10px] text-slate-500 uppercase tracking-wider font-medium hidden sm:table-cell">Name</th>
                  <th className="py-2 px-2 text-right text-[10px] text-slate-500 uppercase tracking-wider font-medium">Price</th>
                  <th className="py-2 px-2 text-[10px] text-slate-500 uppercase tracking-wider font-medium hidden md:table-cell">RSI</th>
                  <th className="py-2 px-2 text-[10px] text-slate-500 uppercase tracking-wider font-medium">Signal</th>
                  <th className="py-2 px-2 text-[10px] text-slate-500 uppercase tracking-wider font-medium hidden lg:table-cell">Confluence</th>
                  <th className="py-2 px-2 text-[10px] text-slate-500 uppercase tracking-wider font-medium hidden lg:table-cell">Power ⚡</th>
                  <th className="py-2 px-2 text-[10px] text-slate-500 uppercase tracking-wider font-medium hidden xl:table-cell">PO3</th>
                  <th className="py-2 px-2 text-[10px] text-slate-500 uppercase tracking-wider font-medium hidden xl:table-cell">S&D 🎯</th>
                  <th className="py-2 px-2 text-[10px] text-slate-500 uppercase tracking-wider font-medium hidden lg:table-cell">R:R</th>
                  <th className="py-2 px-2 text-[10px] text-slate-500 uppercase tracking-wider font-medium hidden xl:table-cell">DCA Entries</th>
                  <th className="py-2 px-2 text-[10px] text-slate-500 uppercase tracking-wider font-medium hidden xl:table-cell">Stop Loss</th>
                  <th className="py-2 pr-4 text-[10px] text-slate-500 uppercase tracking-wider font-medium hidden xl:table-cell">Take Profit</th>
                </tr>
              </thead>
              <tbody>
                {filteredSorted.map(r => (
                  <ResultRow
                    key={r.symbol}
                    result={r}
                    onOpen={setSelectedAsset}
                    watchlistSymbols={watchlistSymbols}
                    watchlistItems={watchlistItems}
                    onAdd={(result) => addMutation.mutate(result)}
                    onRemove={(id) => removeMutation.mutate(id)}
                  />
                ))}
              </tbody>
            </table>
            {filteredSorted.length === 0 && <div className="text-center py-10 text-slate-600 text-sm">No results match current filters</div>}
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="text-center text-[10px] text-slate-700 font-mono">
          Showing {filteredSorted.length} of {results.length} scanned · Click row to expand · Hover for chart icon
        </div>
      )}
    </div>
  );
}