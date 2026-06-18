import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import AssetDetailDrawer from '@/components/dashboard/AssetDetailDrawer';

const GENIUS_ASSETS = [
  { symbol: 'XRP-USD',  name: 'XRP',         tag: 'Payments',    act: 'GENIUS', reason: 'Payments' },
  { symbol: 'XLM-USD',  name: 'Stellar',      tag: 'Payments',    act: 'GENIUS', reason: 'Payments' },
  { symbol: 'HBAR-USD', name: 'Hedera',       tag: 'L1',          act: 'GENIUS', reason: 'Enterprise DLT' },
  { symbol: 'ALGO-USD', name: 'Algorand',     tag: 'L1',          act: 'GENIUS', reason: 'Stablecoin infra' },
  { symbol: 'ENA-USD',  name: 'Ethena',       tag: 'Stablecoin',  act: 'GENIUS', reason: 'Stablecoin protocol' },
  { symbol: 'ONDO-USD', name: 'Ondo Finance', tag: 'RWA',         act: 'GENIUS', reason: 'Tokenized assets' },
  { symbol: 'COIN',     name: 'Coinbase',     tag: 'STOCK',       act: 'GENIUS', reason: 'USDC co-issuer' },
  { symbol: 'HOOD',     name: 'Robinhood',    tag: 'STOCK',       act: 'GENIUS', reason: 'Crypto platform' },
];

const CLARITY_ASSETS = [
  { symbol: 'BTC-USD',  name: 'Bitcoin',      tag: 'L1',          act: 'CLARITY', reason: 'Digital commodity' },
  { symbol: 'ETH-USD',  name: 'Ethereum',     tag: 'L1',          act: 'CLARITY', reason: 'Digital commodity' },
  { symbol: 'SOL-USD',  name: 'Solana',       tag: 'L1',          act: 'CLARITY', reason: 'CFTC commodity path' },
  { symbol: 'ADA-USD',  name: 'Cardano',      tag: 'L1',          act: 'CLARITY', reason: 'CFTC commodity path' },
  { symbol: 'AVAX-USD', name: 'Avalanche',    tag: 'L1',          act: 'CLARITY', reason: 'CFTC commodity path' },
  { symbol: 'DOT-USD',  name: 'Polkadot',     tag: 'L0',          act: 'CLARITY', reason: 'Interoperability' },
  { symbol: 'LINK-USD', name: 'Chainlink',    tag: 'Oracle',      act: 'CLARITY', reason: 'Critical infra' },
  { symbol: 'UNI-USD',  name: 'Uniswap',      tag: 'DeFi DEX',    act: 'CLARITY', reason: 'DeFi exclusion clause' },
  { symbol: 'AAVE-USD', name: 'Aave',         tag: 'DeFi',        act: 'CLARITY', reason: 'DeFi exclusion clause' },
  { symbol: 'ARB-USD',  name: 'Arbitrum',     tag: 'L2',          act: 'CLARITY', reason: 'L2 settlement' },
  { symbol: 'OP-USD',   name: 'Optimism',     tag: 'L2',          act: 'CLARITY', reason: 'L2 settlement' },
  { symbol: 'INJ-USD',  name: 'Injective',    tag: 'DeFi L1',     act: 'CLARITY', reason: 'Onchain derivatives' },
  { symbol: 'GRT-USD',  name: 'The Graph',    tag: 'Indexing',    act: 'CLARITY', reason: 'Data infrastructure' },
  { symbol: 'MSTR',     name: 'MicroStrategy',tag: 'STOCK',       act: 'CLARITY', reason: 'BTC treasury proxy' },
];

const TAG_COLORS = {
  'L1':         'bg-blue-500/15 text-blue-300 border-blue-500/25',
  'L2':         'bg-indigo-500/15 text-indigo-300 border-indigo-500/25',
  'L0':         'bg-purple-500/15 text-purple-300 border-purple-500/25',
  'Payments':   'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  'Stablecoin': 'bg-teal-500/15 text-teal-300 border-teal-500/25',
  'RWA':        'bg-amber-500/15 text-amber-300 border-amber-500/25',
  'DeFi DEX':   'bg-violet-500/15 text-violet-300 border-violet-500/25',
  'DeFi':       'bg-violet-500/15 text-violet-300 border-violet-500/25',
  'DeFi L1':    'bg-violet-500/15 text-violet-300 border-violet-500/25',
  'Oracle':     'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
  'Indexing':   'bg-sky-500/15 text-sky-300 border-sky-500/25',
  'Enterprise DLT': 'bg-green-500/15 text-green-300 border-green-500/25',
  'Stablecoin infra': 'bg-teal-500/15 text-teal-300 border-teal-500/25',
  'STOCK':      'bg-slate-500/15 text-slate-300 border-slate-500/25',
};

function getSignal(d) {
  if (!d) return 'NEUTRAL';
  let c = 0;
  if (d.rsi != null) { if (d.rsi <= 40) c++; if (d.rsi >= 60) c--; }
  if (d.ema_signal === 'uptrend') c++;
  if (d.ema_signal === 'downtrend') c--;
  if (d.macd_histogram != null && d.macd_histogram > 0) c++;
  if (d.macd_histogram != null && d.macd_histogram < 0) c--;
  return c >= 2 ? 'BUY' : c <= -2 ? 'SELL' : 'NEUTRAL';
}

function AssetRow({ asset, data, onClick }) {
  const price = data?.price;
  const prevClose = data?.prev_close;
  const rsi = data?.rsi;
  const changePct = price && prevClose ? ((price - prevClose) / prevClose) * 100 : null;
  const signal = getSignal(data);
  const tagClass = TAG_COLORS[asset.tag] || 'bg-slate-700/40 text-slate-400 border-slate-600/30';

  return (
    <div onClick={onClick} className="flex items-center gap-2 py-1.5 border-b border-slate-800/40 last:border-0 hover:bg-slate-800/20 px-2 -mx-2 rounded transition-colors cursor-pointer group">
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${signal === 'BUY' ? 'bg-emerald-400' : signal === 'SELL' ? 'bg-red-400' : 'bg-slate-600'}`} />
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="font-mono text-xs font-semibold text-slate-200 shrink-0 group-hover:text-white transition-colors">{asset.name}</span>
        <span className={`hidden sm:inline text-[9px] font-mono px-1.5 py-0.5 rounded border ${tagClass} shrink-0`}>{asset.tag}</span>
      </div>
      {rsi != null
        ? <span className={`text-[10px] font-mono shrink-0 ${rsi <= 35 ? 'text-emerald-400' : rsi >= 65 ? 'text-red-400' : 'text-slate-500'}`}>RSI {rsi.toFixed(0)}</span>
        : <span className="text-[10px] font-mono text-slate-700 shrink-0">—</span>
      }
      {changePct != null
        ? <span className={`text-[10px] font-mono w-14 text-right shrink-0 ${changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%</span>
        : <span className="text-[10px] font-mono w-14 text-right text-slate-700 shrink-0">—</span>
      }
      <span className="font-mono text-xs text-slate-300 w-20 text-right shrink-0">
        {price ? (price >= 100 ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : `$${price.toFixed(price < 0.01 ? 6 : price < 1 ? 4 : 2)}`) : '—'}
      </span>
    </div>
  );
}

export default function LegislationCryptoPanel() {
  const [dataMap, setDataMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedData, setSelectedData] = useState(null);
  const [tab, setTab] = useState('CLARITY');

  const allSymbols = useMemo(() => {
    const all = [...GENIUS_ASSETS, ...CLARITY_ASSETS].map(a => a.symbol);
    return [...new Set(all)];
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('runScreener', { symbols: allSymbols });
      const map = {};
      (res.data?.results || []).forEach(r => { map[r.symbol] = r; });
      setDataMap(map);
      setLastUpdated(new Date());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const currentAssets = tab === 'GENIUS' ? GENIUS_ASSETS : CLARITY_ASSETS;
  const buyCount = currentAssets.filter(a => getSignal(dataMap[a.symbol]) === 'BUY').length;
  const sellCount = currentAssets.filter(a => getSignal(dataMap[a.symbol]) === 'SELL').length;

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-sm font-bold text-slate-100">Crypto Legislation Tracker</h2>
          <span className="text-[9px] font-mono text-slate-600">U.S. Digital Asset Bills · Live Signals</span>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && <span className="text-[9px] font-mono text-slate-700">{lastUpdated.toLocaleTimeString()}</span>}
          <button onClick={fetchData} disabled={loading} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        {[
          { key: 'CLARITY', label: 'CLARITY Act', sub: 'Digital Commodities · 14 assets', color: 'text-blue-400', dot: 'bg-blue-400' },
          { key: 'GENIUS',  label: 'GENIUS Act',  sub: 'Stablecoin Framework · 8 assets',  color: 'text-emerald-400', dot: 'bg-emerald-400' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex flex-col items-center gap-0.5 px-4 py-3 text-xs font-semibold transition-colors border-b-2 ${
              tab === t.key ? `border-current ${t.color} bg-slate-900/30` : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
              {t.label}
            </div>
            <span className="text-[9px] font-mono text-slate-600 font-normal">{t.sub}</span>
          </button>
        ))}
      </div>

      {/* Signal summary */}
      <div className="flex items-center gap-4 px-5 py-2 border-b border-slate-800/60 bg-slate-900/20">
        <span className="text-[10px] font-mono text-emerald-400">{buyCount} bullish</span>
        <span className="text-[10px] font-mono text-red-400">{sellCount} bearish</span>
        <span className="text-[10px] font-mono text-slate-600">{currentAssets.length - buyCount - sellCount} neutral</span>
      </div>

      {/* Asset list */}
      <div className="px-5 py-3">
        {loading
          ? <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
              <span className="text-xs text-slate-600 font-mono">Loading…</span>
            </div>
          : currentAssets.map(asset => (
              <AssetRow key={asset.symbol} asset={asset} data={dataMap[asset.symbol]} onClick={() => { setSelectedAsset(asset); setSelectedData(dataMap[asset.symbol]); }} />
            ))
        }
      </div>

      {selectedAsset && (
        <AssetDetailDrawer asset={selectedAsset} data={selectedData} onClose={() => { setSelectedAsset(null); setSelectedData(null); }} />
      )}
    </div>
  );
}