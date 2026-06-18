import React, { useMemo, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown, Activity, Loader2, RefreshCw } from 'lucide-react';
import { DASHBOARD_ASSETS, DASHBOARD_ASSET_MAP } from '@/lib/dashboardAssets';
import AssetDetailDrawer from '@/components/dashboard/AssetDetailDrawer';

function TradeRow({ item, action, onClick }) {
  const price = item.current_price;
  const close = item.close_price;
  const change = price && close ? ((price - close) / close) * 100 : null;
  const isBuy = action === 'BUY';

  return (
    <div onClick={onClick} className="flex items-center justify-between py-2.5 border-b border-slate-800/50 last:border-0 cursor-pointer hover:bg-slate-800/20 px-2 -mx-2 rounded transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`text-[9px] font-mono font-bold w-6 ${isBuy ? 'text-emerald-500' : 'text-red-500'}`}>
          {action}
        </span>
        <div className="min-w-0">
          <span className="font-mono text-xs font-semibold text-slate-200">{item.symbol}</span>
          <span className="text-[10px] text-slate-600 ml-2 hidden sm:inline">{item.name}</span>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
        {item.rsi != null && (
          <span className={`text-[10px] ${isBuy ? 'text-emerald-500/70' : 'text-red-500/70'}`}>
            RSI {item.rsi.toFixed(0)}
          </span>
        )}
        {change != null && (
          <span className={`text-[10px] ${change >= 0 ? 'text-slate-400' : 'text-slate-500'}`}>
            {change >= 0 ? '+' : ''}{change.toFixed(2)}%
          </span>
        )}
        <span className="text-slate-300 w-16 text-right">
          {price ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
        </span>
      </div>
    </div>
  );
}

export default function BuySellPanel() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedData, setSelectedData] = useState(null);

  const runScan = async () => {
    setLoading(true);
    // Use S&P 500, Nasdaq, Dow, and CLARITY Act crypto assets
    const symbols = DASHBOARD_ASSETS.map(a => a.symbol);
    const assetMap = DASHBOARD_ASSET_MAP;
    let all = [];
    for (let i = 0; i < symbols.length; i += 30) {
      try {
        const res = await base44.functions.invoke('runScreener', { symbols: symbols.slice(i, i + 30) });
        all = [...all, ...(res.data?.results || [])];
      } catch (e) { console.error(e); }
    }
    // Merge with asset metadata
    const merged = all.map(r => ({
      ...r,
      name: assetMap[r.symbol]?.name || r.symbol,
      exchange: assetMap[r.symbol]?.exchange || '',
      sector: assetMap[r.symbol]?.sector || '',
    }));
    setResults(merged);
    setScanned(true);
    setLoading(false);
  };

  useEffect(() => { runScan(); }, []);

  const buyTargets = useMemo(() => results
    .filter(r => r.rsi != null && r.rsi <= 35)
    .sort((a, b) => a.rsi - b.rsi)
    .slice(0, 4)
    .map(r => ({ ...r, current_price: r.price, close_price: r.prev_close })),
    [results]);

  const sellTargets = useMemo(() => results
    .filter(r => r.rsi != null && r.rsi >= 65)
    .sort((a, b) => b.rsi - a.rsi)
    .slice(0, 4)
    .map(r => ({ ...r, current_price: r.price, close_price: r.prev_close })),
    [results]);

  const noSignals = !loading && scanned && buyTargets.length === 0 && sellTargets.length === 0;

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-200">Buy &amp; Sell</h2>
          <span className="text-[10px] text-slate-600 font-mono">RSI signals</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="text-emerald-400 font-bold">{buyTargets.length} BUY</span>
          <span className="text-slate-700">·</span>
          <span className="text-red-400 font-bold">{sellTargets.length} SELL</span>
          <button onClick={runScan} disabled={loading}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {loading && !scanned ? (
        <div className="flex items-center justify-center py-14 gap-3">
          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
          <span className="text-slate-500 text-sm font-mono">Scanning all tradable assets…</span>
        </div>
      ) : noSignals ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <Activity className="w-8 h-8 text-slate-700 mb-3" />
          <p className="text-slate-500 text-sm font-semibold">No active signals</p>
          <p className="text-slate-700 text-xs font-mono mt-1">
            No strong RSI signals found across the scanned universe right now.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800/40">
          {/* BUY column */}
          <div className="px-5 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-3 h-3 text-emerald-500/70" />
              <span className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">Oversold · RSI ≤ 35</span>
            </div>
            {buyTargets.length > 0
              ? buyTargets.map(item => <TradeRow key={item.id || item.symbol} item={item} action="BUY" onClick={() => { setSelectedAsset({ symbol: item.symbol, name: item.name, tag: item.sector }); setSelectedData({ rsi: item.rsi, price: item.current_price, prev_close: item.close_price, ema_signal: item.ema_signal, macd_signal: item.macd_signal, macd_histogram: item.macd_histogram }); }} />)
              : <div className="text-slate-700 text-[10px] font-mono py-3">No oversold assets</div>
            }
          </div>
          {/* SELL column */}
          <div className="px-5 py-3">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingDown className="w-3 h-3 text-red-500/70" />
              <span className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">Overbought · RSI ≥ 65</span>
            </div>
            {sellTargets.length > 0
              ? sellTargets.map(item => <TradeRow key={item.id || item.symbol} item={item} action="SELL" onClick={() => { setSelectedAsset({ symbol: item.symbol, name: item.name, tag: item.sector }); setSelectedData({ rsi: item.rsi, price: item.current_price, prev_close: item.close_price, ema_signal: item.ema_signal, macd_signal: item.macd_signal, macd_histogram: item.macd_histogram }); }} />)
              : <div className="text-slate-700 text-[10px] font-mono py-3">No overbought assets</div>
            }
          </div>
        </div>
      )}

      {selectedAsset && (
        <AssetDetailDrawer
          asset={selectedAsset}
          data={selectedData}
          onClose={() => { setSelectedAsset(null); setSelectedData(null); }}
        />
      )}
    </div>
  );
}