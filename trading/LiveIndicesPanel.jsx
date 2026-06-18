import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { useMarketStatus } from './MarketStatusBar';

const US_INDICES = [
  { symbol: 'SPY',  label: 'S&P 500',   flag: '🇺🇸' },
  { symbol: 'QQQ',  label: 'NASDAQ',    flag: '🇺🇸' },
  { symbol: 'DIA',  label: 'DOW',       flag: '🇺🇸' },
  { symbol: 'IWM',  label: 'Russell',   flag: '🇺🇸' },
  { symbol: 'VIX',  label: 'VIX',       flag: '📊' },
  { symbol: 'GLD',  label: 'Gold',      flag: '🥇' },
  { symbol: 'USO',  label: 'Oil (WTI)', flag: '🛢' },
  { symbol: 'BTC-USD', label: 'Bitcoin', flag: '₿' },
  { symbol: 'ETH-USD', label: 'Ethereum',flag: 'Ξ' },
];

const INTL_INDICES = [
  { symbol: 'EWU',  label: 'UK (FTSE)',      flag: '🇬🇧' },
  { symbol: 'EWG',  label: 'Germany (DAX)',  flag: '🇩🇪' },
  { symbol: 'EWJ',  label: 'Japan (Nikkei)', flag: '🇯🇵' },
  { symbol: 'FXI',  label: 'China (CSI)',    flag: '🇨🇳' },
  { symbol: 'EWH',  label: 'Hong Kong',      flag: '🇭🇰' },
  { symbol: 'EWA',  label: 'Australia',      flag: '🇦🇺' },
  { symbol: 'INDA', label: 'India',          flag: '🇮🇳' },
  { symbol: 'EWZ',  label: 'Brazil',         flag: '🇧🇷' },
  { symbol: 'EWC',  label: 'Canada',         flag: '🇨🇦' },
  { symbol: 'EEM',  label: 'Emerging Mkt',   flag: '🌎' },
  { symbol: 'EWY',  label: 'South Korea',    flag: '🇰🇷' },
  { symbol: 'EWI',  label: 'Italy',          flag: '🇮🇹' },
];

function PriceTile({ item, priceData }) {
  const p = priceData?.[item.symbol];
  const change = p?.change_pct ?? 0;
  const isUp = change >= 0;

  return (
    <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors ${
      isUp ? 'bg-emerald-500/[0.04] border-emerald-500/10' : 'bg-red-500/[0.04] border-red-500/10'
    }`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm">{item.flag}</span>
        <div className="min-w-0">
          <div className="text-xs font-mono font-bold text-slate-200 truncate">{item.label}</div>
          <div className="text-[9px] text-slate-600 font-mono">{item.symbol}</div>
        </div>
      </div>
      <div className="text-right shrink-0 ml-2">
        {p ? (
          <>
            <div className="font-mono text-sm font-bold text-slate-100">
              ${p.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div className={`text-[10px] font-mono flex items-center gap-0.5 justify-end ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
              {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {isUp ? '+' : ''}{change.toFixed(2)}%
            </div>
          </>
        ) : (
          <div className="text-slate-700 text-xs font-mono">—</div>
        )}
      </div>
    </div>
  );
}

export default function LiveIndicesPanel() {
  const { usOpen } = useMarketStatus();
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const allSymbols = [...US_INDICES, ...INTL_INDICES].map(i => i.symbol);

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('fetchMarketPrices', { symbols: allSymbols });
      setPrices(res.data?.prices || {});
      setLastUpdate(new Date());
    } catch (e) {
      console.error('LiveIndicesPanel fetch error:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, []);

  const primaryList = US_INDICES;
  const intlList = INTL_INDICES;

  return (
    <div className="space-y-4">
      {/* US + Core */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${usOpen ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              🇺🇸 US Markets · {usOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
          <button onClick={fetchPrices} className="text-slate-600 hover:text-slate-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {primaryList.map(item => (
            <PriceTile key={item.symbol} item={item} priceData={prices} />
          ))}
        </div>
      </div>

      {/* International */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            🌐 International Markets {!usOpen ? '· ACTIVE' : ''}
          </span>
          {!usOpen && <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono">FOCUS</span>}
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {intlList.map(item => (
            <PriceTile key={item.symbol} item={item} priceData={prices} />
          ))}
        </div>
      </div>

      {lastUpdate && (
        <div className="text-[9px] text-slate-700 font-mono text-center">
          Updated {lastUpdate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}