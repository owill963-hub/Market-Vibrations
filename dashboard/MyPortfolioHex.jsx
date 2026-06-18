import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

function HexShape({ children, className = '' }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}
      style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
      {children}
    </div>
  );
}

function MiniSparkline({ data, positive }) {
  const points = data || Array.from({ length: 12 }, (_, i) => ({ v: 50 + Math.sin(i * 0.8) * 10 + (Math.random() - 0.5) * 8 }));
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
        <defs>
          <linearGradient id={`sg-${positive ? 'up' : 'dn'}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={positive ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
            <stop offset="95%" stopColor={positive ? '#10b981' : '#ef4444'} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={positive ? '#10b981' : '#ef4444'} strokeWidth={1.5}
          fill={`url(#sg-${positive ? 'up' : 'dn'})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function AssetRow({ item }) {
  const price = item.current_price;
  const close = item.close_price;
  const change = price && close ? ((price - close) / close) * 100 : null;
  const positive = change == null ? true : change >= 0;

  const sparkData = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => ({
      v: (price || 100) * (1 + (Math.sin(i * 0.7 + (item.symbol?.charCodeAt(0) || 0)) * 0.03))
    })), [item.symbol, price]);

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20 transition-colors">
      {/* Symbol */}
      <div className="w-14 shrink-0">
        <div className="font-mono text-sm font-bold text-slate-100">{item.symbol}</div>
        <div className="text-[9px] text-slate-600 truncate max-w-[56px]">{item.exchange}</div>
      </div>

      {/* Price */}
      <div className="flex-1 min-w-0">
        <div className="font-mono text-sm font-semibold text-slate-200">
          {price ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
        </div>
        <div className={`flex items-center gap-0.5 text-[10px] font-mono font-bold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
          {change != null ? (
            <>
              {positive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {positive ? '+' : ''}{change.toFixed(2)}%
            </>
          ) : <><Minus className="w-2.5 h-2.5 text-slate-600" /><span className="text-slate-600">—</span></>}
        </div>
      </div>

      {/* Sparkline */}
      <div className="w-20 shrink-0">
        <MiniSparkline data={sparkData} positive={positive} />
      </div>

      {/* RSI pill */}
      {item.rsi != null && (
        <div className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
          item.rsi >= 70 ? 'bg-red-500/10 border-red-500/20 text-red-400' :
          item.rsi <= 30 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
          'bg-slate-800 border-slate-700 text-slate-500'
        }`}>
          RSI {item.rsi.toFixed(0)}
        </div>
      )}
    </div>
  );
}

export default function MyPortfolioHex() {
  const { data: items = [] } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => base44.entities.WatchlistItem.list('-created_date', 200),
  });

  const activeItems = items.filter(i => i.is_active !== false).slice(0, 8);

  const totalValue = activeItems.reduce((sum, i) => sum + (i.current_price || 0), 0);
  const buyCount   = activeItems.filter(i => i.rsi_signal === 'oversold').length;
  const sellCount  = activeItems.filter(i => i.rsi_signal === 'overbought').length;

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header with Hex accent */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-800 bg-slate-900/60">
        {/* Mini hexagon logo */}
        <HexShape className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 shrink-0">
          <span className="text-white text-[10px] font-bold z-10">MY</span>
        </HexShape>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-slate-100 tracking-tight">My Portfolio</h2>
          <p className="text-[10px] text-slate-500 font-mono">{activeItems.length} assets monitored</p>
        </div>
        {/* Stats */}
        <div className="flex items-center gap-4 text-[10px] font-mono shrink-0">
          <div className="text-center">
            <div className="text-emerald-400 font-bold text-sm">{buyCount}</div>
            <div className="text-slate-600">BUY</div>
          </div>
          <div className="text-center">
            <div className="text-red-400 font-bold text-sm">{sellCount}</div>
            <div className="text-slate-600">SELL</div>
          </div>
          <div className="text-center hidden sm:block">
            <div className="text-indigo-300 font-bold text-sm">{activeItems.length}</div>
            <div className="text-slate-600">TOTAL</div>
          </div>
        </div>
      </div>

      {/* Hexagon grid + asset list */}
      <div className="flex flex-col lg:flex-row">
        {/* Left: Hexagon visualization */}
        <div className="lg:w-52 shrink-0 flex items-center justify-center p-6 border-b lg:border-b-0 lg:border-r border-slate-800/60">
          <div className="relative flex flex-col items-center gap-2">
            {/* Row 1 */}
            <div className="flex gap-2">
              {[0, 1].map(i => (
                <HexShape key={i} className="w-14 h-14"
                  style={{ background: activeItems[i] ? 'linear-gradient(135deg,#1e293b,#0f172a)' : '#0f172a' }}>
                  <div className="text-center z-10 px-1">
                    <div className="text-[9px] font-bold text-slate-300 leading-tight">{activeItems[i]?.symbol || '·'}</div>
                    {activeItems[i]?.rsi && (
                      <div className={`text-[8px] font-mono ${activeItems[i].rsi >= 70 ? 'text-red-400' : activeItems[i].rsi <= 30 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {activeItems[i].rsi.toFixed(0)}
                      </div>
                    )}
                  </div>
                </HexShape>
              ))}
            </div>
            {/* Row 2 (center — larger) */}
            <div className="flex gap-2">
              {[2, 3, 4].map(i => (
                <HexShape key={i} className="w-14 h-14"
                  style={{ background: activeItems[i] ? 'linear-gradient(135deg,#312e81,#1e1b4b)' : '#0f172a' }}>
                  <div className="text-center z-10 px-1">
                    <div className="text-[9px] font-bold text-slate-300 leading-tight">{activeItems[i]?.symbol || '·'}</div>
                    {activeItems[i]?.rsi && (
                      <div className={`text-[8px] font-mono ${activeItems[i].rsi >= 70 ? 'text-red-400' : activeItems[i].rsi <= 30 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {activeItems[i].rsi.toFixed(0)}
                      </div>
                    )}
                  </div>
                </HexShape>
              ))}
            </div>
            {/* Row 3 */}
            <div className="flex gap-2">
              {[5, 6].map(i => (
                <HexShape key={i} className="w-14 h-14"
                  style={{ background: activeItems[i] ? 'linear-gradient(135deg,#1e293b,#0f172a)' : '#0f172a' }}>
                  <div className="text-center z-10 px-1">
                    <div className="text-[9px] font-bold text-slate-300 leading-tight">{activeItems[i]?.symbol || '·'}</div>
                    {activeItems[i]?.rsi && (
                      <div className={`text-[8px] font-mono ${activeItems[i].rsi >= 70 ? 'text-red-400' : activeItems[i].rsi <= 30 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {activeItems[i].rsi.toFixed(0)}
                      </div>
                    )}
                  </div>
                </HexShape>
              ))}
            </div>
            <div className="text-[9px] font-mono text-slate-600 mt-1">RSI shown in each hex</div>
          </div>
        </div>

        {/* Right: Asset rows */}
        <div className="flex-1 overflow-hidden">
          {activeItems.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-600 text-sm font-mono">
              Add assets to your Watchlist to see them here
            </div>
          ) : (
            <div>
              {activeItems.map(item => <AssetRow key={item.id} item={item} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}