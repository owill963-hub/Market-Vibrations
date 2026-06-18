import React, { useState, useMemo, useCallback } from 'react';
import NavBar from '@/components/NavBar';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, TrendingDown, Search, Play, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { SCREENER_ASSETS, SCREENER_ASSET_MAP } from '@/lib/screenerAssets';
import SignalBadge from '@/components/screener/SignalBadge';

const BATCH_SIZE = 30;
const SIGNAL_FILTERS = ['ALL', 'STRONG_BUY', 'BUY', 'DCA', 'NEUTRAL', 'REDUCE', 'SELL', 'STRONG_SELL'];
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
        <div className={`h-full rounded-full ${rsi >= 70 ? 'bg-red-400' : rsi <= 30 ? 'bg-emerald-400' : 'bg-slate-500'}`}
          style={{ width: `${rsi}%` }} />
      </div>
      <span className={`text-xs font-mono ${color}`}>{rsi.toFixed(0)}</span>
    </div>
  );
}

function ConfluenceDots({ score }) {
  if (score == null) return <span className="text-slate-700 text-xs">—</span>;
  const colors = ['bg-slate-700', 'bg-yellow-500', 'bg-orange-400', 'bg-emerald-400'];
  return (
    <div className="flex items-center gap-1" title={`${score}/3 indicators confirm`}>
      {[0,1,2].map(i => (
        <span key={i} className={`w-2 h-2 rounded-full ${i < score ? colors[score] : 'bg-slate-800'}`} />
      ))}
      <span className={`text-[9px] font-mono ml-0.5 ${score === 3 ? 'text-emerald-400' : score === 2 ? 'text-orange-400' : score === 1 ? 'text-yellow-500' : 'text-slate-600'}`}>
        {score}/3
      </span>
    </div>
  );
}

function DcaCell({ result, type }) {
  if (type === 'buy') {
    return (
      <div className="text-[10px] font-mono space-y-0.5">
        <div><span className="text-slate-600">Z1 </span><span className="text-blue-300">${fmt(result.dca_z1)}</span></div>
        <div><span className="text-slate-600">Z2 </span><span className="text-blue-300">${fmt(result.dca_z2)}</span></div>
        <div><span className="text-slate-600">Z3 </span><span className="text-blue-300">${fmt(result.dca_z3)}</span></div>
      </div>
    );
  }
  if (type === 'sell') {
    return (
      <div className="text-[10px] font-mono space-y-0.5">
        <div><span className="text-slate-600">TP1 </span><span className="text-emerald-400">${fmt(result.tp1)}</span></div>
        <div><span className="text-slate-600">TP2 </span><span className="text-emerald-400">${fmt(result.tp2)}</span></div>
        <div><span className="text-slate-600">TP3 </span><span className="text-emerald-400">${fmt(result.tp3)}</span></div>
      </div>
    );
  }
  // stop-loss
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

function ResultRow({ result }) {
  const [expanded, setExpanded] = useState(false);
  const meta = SCREENER_ASSET_MAP[result.symbol] || {};
  const isUp = result.change_pct >= 0;
  const edgeIsPositive = result.edge_pct >= 0;

  return (
    <>
      <tr
        className="border-b border-slate-800/50 hover:bg-slate-800/20 cursor-pointer transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Symbol */}
        <td className="py-2.5 pl-4 pr-2">
          <div className="flex items-center gap-1.5">
            {expanded ? <ChevronUp className="w-3 h-3 text-slate-600 shrink-0" /> : <ChevronDown className="w-3 h-3 text-slate-600 shrink-0" />}
            <div>
              <span className="font-mono text-sm font-bold text-slate-100">{result.symbol.replace('-USD', '')}</span>
              <div className="text-[9px] text-slate-600 font-mono">{meta.exchange}</div>
            </div>
          </div>
        </td>
        {/* Name */}
        <td className="py-2.5 px-2 hidden sm:table-cell">
          <div className="text-xs text-slate-400 truncate max-w-[140px]">{meta.name || result.symbol}</div>
          <div className="text-[9px] text-slate-700">{meta.sector}</div>
        </td>
        {/* Price */}
        <td className="py-2.5 px-2 text-right">
          <div className="font-mono text-sm text-slate-100">${fmt(result.price)}</div>
          <div className={`text-[10px] font-mono ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {isUp ? '+' : ''}{fmt(result.change_pct)}%
          </div>
        </td>
        {/* RSI */}
        <td className="py-2.5 px-2 hidden md:table-cell">
          <RsiBar rsi={result.rsi} />
        </td>
        {/* Signal */}
        <td className="py-2.5 px-2">
          <SignalBadge signal={result.signal} size="xs" />
        </td>
        {/* Confluence */}
        <td className="py-2.5 px-2 hidden lg:table-cell">
          <ConfluenceDots score={result.confluence} />
        </td>
        {/* R:R */}
        <td className="py-2.5 px-2 hidden lg:table-cell">
          <span className={`font-mono text-xs font-bold ${result.rr >= 2 ? 'text-emerald-400' : result.rr >= 1 ? 'text-yellow-400' : 'text-slate-600'}`}>
            {result.rr != null ? `1:${result.rr}` : '—'}
          </span>
          <div className="text-[9px] text-slate-700 font-mono">risk:reward</div>
        </td>
        {/* DCA Entries */}
        <td className="py-2.5 px-2 hidden xl:table-cell">
          <DcaCell result={result} type="buy" />
        </td>
        {/* Stop Loss */}
        <td className="py-2.5 px-2 hidden xl:table-cell">
          <DcaCell result={result} type="stop" />
        </td>
        {/* Take Profit */}
        <td className="py-2.5 pr-4 hidden xl:table-cell">
          <DcaCell result={result} type="sell" />
        </td>
      </tr>

      {expanded && (
        <tr className="bg-slate-800/20 border-b border-slate-800">
          <td colSpan={10} className="px-4 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-[10px] font-mono">
              <div className="bg-slate-900/50 rounded-lg p-2">
                <div className="text-slate-600 mb-1">EMA 20</div>
                <div className="text-slate-200">${fmt(result.ema20)}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2">
                <div className="text-slate-600 mb-1">EMA 50</div>
                <div className="text-slate-200">${fmt(result.ema50)}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2">
                <div className="text-slate-600 mb-1">MACD Hist</div>
                <div className={result.macd_histogram >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {result.macd_histogram != null ? (result.macd_histogram > 0 ? '+' : '') + fmt(result.macd_histogram, 3) : '—'}
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2">
                <div className="text-slate-600 mb-1">ATR%</div>
                <div className="text-slate-300">{result.atr_pct != null ? result.atr_pct.toFixed(2) + '%' : '—'}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2">
                <div className="text-slate-600 mb-1">Score / Conf</div>
                <div className={result.score >= 2 ? 'text-emerald-400' : result.score <= -2 ? 'text-red-400' : 'text-slate-400'}>
                  {result.score > 0 ? '+' : ''}{result.score} · {result.confluence ?? '—'}/3
                </div>
              </div>
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-2">
                <div className="text-slate-600 mb-1">DCA Entries</div>
                <div className="text-blue-300">${fmt(result.dca_z1)} · ${fmt(result.dca_z2)} · ${fmt(result.dca_z3)}</div>
              </div>
              <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2">
                <div className="text-slate-600 mb-1">Stop-Loss</div>
                <div className="text-red-400">${fmt(result.sl1)}</div>
                <div className="text-red-500 text-[9px]">Hard: ${fmt(result.sl2)}</div>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2">
                <div className="text-slate-600 mb-1">TP / R:R</div>
                <div className="text-emerald-400">${fmt(result.tp1)} · ${fmt(result.tp2)}</div>
                <div className={`text-[9px] mt-0.5 ${result.rr >= 2 ? 'text-emerald-400' : result.rr >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                  R:R = 1:{result.rr ?? '—'}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function Screener() {
  const [results, setResults] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [signalFilter, setSignalFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('signal');

  const handleScan = useCallback(async () => {
    setScanning(true);
    setResults([]);
    setProgress(0);

    const symbols = SCREENER_ASSETS.map(a => a.symbol);
    const batches = [];
    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      batches.push(symbols.slice(i, i + BATCH_SIZE));
    }

    let accumulated = [];
    for (let i = 0; i < batches.length; i++) {
      try {
        const res = await base44.functions.invoke('runScreener', { symbols: batches[i] });
        const batch = res.data?.results || [];
        accumulated = [...accumulated, ...batch];
        setResults([...accumulated]);
        setProgress(Math.round(((i + 1) / batches.length) * 100));
      } catch (e) {
        console.error('Screener batch error:', e);
      }
    }
    setScanning(false);
  }, []);

  const filteredSorted = useMemo(() => {
    let list = results;
    if (signalFilter !== 'ALL') list = list.filter(r => r.signal === signalFilter);
    if (typeFilter !== 'ALL') {
      list = list.filter(r => {
        const meta = SCREENER_ASSET_MAP[r.symbol];
        return meta?.asset_type === typeFilter.toLowerCase();
      });
    }
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
      if (sortBy === 'rr')         return (b.rr ?? 0) - (a.rr ?? 0);
      if (sortBy === 'score')      return b.score - a.score;
      if (sortBy === 'edge')       return b.edge_pct - a.edge_pct;
      if (sortBy === 'rsi_asc')    return (a.rsi ?? 50) - (b.rsi ?? 50);
      if (sortBy === 'rsi_desc')   return (b.rsi ?? 50) - (a.rsi ?? 50);
      if (sortBy === 'change')     return b.change_pct - a.change_pct;
      return 0;
    });
  }, [results, signalFilter, typeFilter, search, sortBy]);

  // Stats
  const counts = results.reduce((acc, r) => {
    acc[r.signal] = (acc[r.signal] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <NavBar />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-emerald-600/4 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-600/4 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Play className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-mono text-emerald-400/60 uppercase tracking-[0.2em]">LMSR + TECHNICAL SCREENER</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Market Screener</h1>
            <p className="text-sm text-slate-500 mt-1">
              {SCREENER_ASSETS.length} assets · RSI + MACD + EMA + ATR · Confluence scoring · DCA zones · Stop-Loss · Risk:Reward
            </p>
          </div>
          <Button
            onClick={handleScan}
            disabled={scanning}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
          >
            {scanning
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning {progress}%</>
              : <><Play className="w-4 h-4 mr-2" />Run Full Scan</>
            }
          </Button>
        </div>

        {/* Progress bar */}
        {scanning && (
          <div className="mb-4 bg-slate-900 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-2">
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
          <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 mb-5">
            {[
              { key: 'STRONG_BUY', label: '⬆⬆ S.BUY', color: 'text-emerald-300', bg: 'border-emerald-500/20 bg-emerald-500/5' },
              { key: 'BUY',        label: '⬆ BUY',    color: 'text-emerald-400', bg: 'border-emerald-500/15 bg-emerald-500/[0.03]' },
              { key: 'DCA',        label: '◎ DCA',    color: 'text-blue-400',    bg: 'border-blue-500/15 bg-blue-500/5' },
              { key: 'NEUTRAL',    label: '— NEUTRAL', color: 'text-slate-500',   bg: 'border-slate-700 bg-slate-800/20' },
              { key: 'REDUCE',     label: '⬇ REDUCE', color: 'text-orange-400',  bg: 'border-orange-500/15 bg-orange-500/5' },
              { key: 'SELL',       label: '⬇ SELL',   color: 'text-red-400',     bg: 'border-red-500/15 bg-red-500/[0.03]' },
              { key: 'STRONG_SELL',label: '⬇⬇ S.SELL', color: 'text-red-300',    bg: 'border-red-500/20 bg-red-500/5' },
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

        {/* Filters + Table */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
          {/* Filter bar */}
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
                  typeFilter === (t === 'ALL' ? 'ALL' : t.toUpperCase())
                    ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'
                }`}>{t}</button>
            ))}
            <div className="ml-auto flex items-center gap-1.5 text-[10px] font-mono text-slate-600">
              SORT:
              {[
                { val: 'signal',      label: 'Signal'     },
                { val: 'confluence',  label: '🔥 Conf'    },
                { val: 'rr',          label: 'R:R'        },
                { val: 'score',       label: 'Score'      },
                { val: 'edge',        label: 'Edge%'      },
                { val: 'rsi_asc',     label: 'RSI ↑'      },
                { val: 'change',      label: 'Chg%'       },
              ].map(s => (
                <button key={s.val}
                  onClick={() => setSortBy(s.val)}
                  className={`px-2 py-0.5 rounded transition-colors ${sortBy === s.val ? 'bg-slate-700 text-slate-200' : 'hover:text-slate-400'}`}
                >{s.label}</button>
              ))}
            </div>
          </div>

          {/* Table */}
          {results.length === 0 ? (
            <div className="text-center py-20 px-4">
              <Play className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <h3 className="text-slate-400 font-semibold mb-1">No scan results yet</h3>
              <p className="text-sm text-slate-600 mb-5">
                Click "Run Full Scan" to analyse {SCREENER_ASSETS.length} assets across stocks, ETFs, crypto & international markets
              </p>
              <Button onClick={handleScan} disabled={scanning} className="bg-emerald-600 hover:bg-emerald-700">
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
                    <th className="py-2 px-2 text-[10px] text-slate-500 uppercase tracking-wider font-medium hidden lg:table-cell">R:R</th>
                    <th className="py-2 px-2 text-[10px] text-slate-500 uppercase tracking-wider font-medium hidden xl:table-cell">DCA Entries</th>
                    <th className="py-2 px-2 text-[10px] text-slate-500 uppercase tracking-wider font-medium hidden xl:table-cell">Stop Loss</th>
                    <th className="py-2 pr-4 text-[10px] text-slate-500 uppercase tracking-wider font-medium hidden xl:table-cell">Take Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSorted.map(r => <ResultRow key={r.symbol} result={r} />)}
                </tbody>
              </table>
              {filteredSorted.length === 0 && (
                <div className="text-center py-10 text-slate-600 text-sm">No results match current filters</div>
              )}
            </div>
          )}
        </div>
        {results.length > 0 && (
          <div className="text-center text-[10px] text-slate-700 font-mono mt-3">
            Showing {filteredSorted.length} of {results.length} scanned · Click any row to expand DCA details
          </div>
        )}
      </div>
    </div>
  );
}