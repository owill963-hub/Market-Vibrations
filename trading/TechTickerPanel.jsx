import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';

function MiniBar({ value, min, max, color }) {
  const pct = max > min ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 50;
  return (
    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function SignalPill({ signal }) {
  const map = {
    uptrend:              { label: '↑ UPTREND',   cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    downtrend:            { label: '↓ DOWNTREND', cls: 'text-red-400 bg-red-500/10 border-red-500/20' },
    above_ema20:          { label: '↑ EMA20',      cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    below_ema20:          { label: '↓ EMA20',      cls: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
    bullish_crossover:    { label: 'MACD ✓',       cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    bearish_crossover:    { label: 'MACD ✗',       cls: 'text-red-400 bg-red-500/10 border-red-500/20' },
    bullish:              { label: 'MACD +',       cls: 'text-emerald-500/70 bg-emerald-500/5 border-emerald-500/15' },
    bearish:              { label: 'MACD -',       cls: 'text-red-500/70 bg-red-500/5 border-red-500/15' },
    overbought:           { label: 'RSI OB',       cls: 'text-red-400 bg-red-500/10 border-red-500/20' },
    oversold:             { label: 'RSI OS',       cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    approaching_overbought: { label: 'RSI ~OB',   cls: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
    approaching_oversold: { label: 'RSI ~OS',     cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    neutral:              { label: 'NEUTRAL',      cls: 'text-slate-500 bg-slate-800 border-slate-700' },
  };
  const c = map[signal] || map.neutral;
  return (
    <span className={`text-[8px] font-mono font-bold px-1 py-0.5 rounded border ${c.cls}`}>{c.label}</span>
  );
}

function TickerCard({ item }) {
  const [expanded, setExpanded] = useState(false);
  const hasEdge = item.belief_price > 0 && item.current_price > 0;
  const edge = hasEdge ? ((item.belief_price - item.current_price) / item.current_price) * 100 : null;
  const isBuy = edge > 0;
  const edgeTriggered = edge != null && Math.abs(edge) >= (item.edge_threshold || 5);

  const macdPositive = item.macd_signal === 'bullish_crossover' || item.macd_signal === 'bullish';
  const rsiColor = item.rsi >= 70 ? 'bg-red-400' : item.rsi <= 30 ? 'bg-emerald-400' : 'bg-slate-500';

  return (
    <div
      className={`bg-slate-900/60 border rounded-xl p-3 cursor-pointer transition-all hover:border-slate-700 ${
        edgeTriggered ? (isBuy ? 'border-emerald-500/30' : 'border-red-500/30') : 'border-slate-800'
      }`}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-1.5">
            {edgeTriggered
              ? (isBuy ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-red-400" />)
              : <Minus className="w-3 h-3 text-slate-600" />
            }
            <span className="font-mono text-sm font-bold text-slate-100">{item.symbol?.replace('-USD', '')}</span>
            {edgeTriggered && (
              <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${isBuy ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                {isBuy ? 'BUY' : 'SELL'}
              </span>
            )}
          </div>
          <div className="text-[9px] text-slate-600 truncate max-w-[100px]">{item.name}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm text-slate-100">
            {item.current_price > 0 ? `$${item.current_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
          </div>
          {edge != null && (
            <div className={`text-[10px] font-mono font-bold ${isBuy ? 'text-emerald-400' : 'text-red-400'}`}>
              {isBuy ? '+' : ''}{edge.toFixed(1)}% edge
            </div>
          )}
        </div>
      </div>

      {/* RSI bar */}
      {item.rsi != null && (
        <div className="mb-2">
          <div className="flex justify-between text-[9px] font-mono text-slate-600 mb-1">
            <span>RSI</span>
            <span className={item.rsi >= 70 ? 'text-red-400' : item.rsi <= 30 ? 'text-emerald-400' : 'text-slate-400'}>
              {item.rsi.toFixed(1)}
            </span>
          </div>
          <MiniBar value={item.rsi} min={0} max={100} color={rsiColor} />
        </div>
      )}

      {/* Signal pills */}
      <div className="flex flex-wrap gap-1 mt-1">
        {item.ema_signal && <SignalPill signal={item.ema_signal} />}
        {item.macd_signal && <SignalPill signal={item.macd_signal} />}
        {item.rsi_signal && item.rsi_signal !== 'neutral' && <SignalPill signal={item.rsi_signal} />}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-[9px] font-mono">
          <div>
            <span className="text-slate-600">EMA 20 </span>
            <span className="text-slate-300">{item.ema20 ? `$${item.ema20.toFixed(2)}` : '—'}</span>
          </div>
          <div>
            <span className="text-slate-600">EMA 50 </span>
            <span className="text-slate-300">{item.ema50 ? `$${item.ema50.toFixed(2)}` : '—'}</span>
          </div>
          <div>
            <span className="text-slate-600">MACD </span>
            <span className={macdPositive ? 'text-emerald-400' : 'text-red-400'}>
              {item.macd != null ? (item.macd > 0 ? '+' : '') + item.macd.toFixed(3) : '—'}
            </span>
          </div>
          <div>
            <span className="text-slate-600">Hist </span>
            <span className={item.macd_histogram >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {item.macd_histogram != null ? (item.macd_histogram > 0 ? '+' : '') + item.macd_histogram.toFixed(3) : '—'}
            </span>
          </div>
          {item.belief_price > 0 && (
            <>
              <div>
                <span className="text-slate-600">Belief </span>
                <span className="text-slate-300">${item.belief_price.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-600">Threshold </span>
                <span className="text-slate-300">{item.edge_threshold || 5}%</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function TechTickerPanel() {
  const [filter, setFilter] = useState('all'); // all | buy | sell | triggered

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['watchlist-tech'],
    queryFn: () => base44.entities.WatchlistItem.list('-last_technical_update', 50),
    refetchInterval: 120_000,
  });

  // Only show items that have been technically scanned
  const scanned = items.filter(i => i.rsi != null || i.ema20 != null);

  const filtered = scanned.filter(item => {
    const hasEdge = item.belief_price > 0 && item.current_price > 0;
    const edge = hasEdge ? (item.belief_price - item.current_price) / item.current_price * 100 : null;
    const triggered = edge != null && Math.abs(edge) >= (item.edge_threshold || 5);
    if (filter === 'buy') return edge > 0 && triggered;
    if (filter === 'sell') return edge < 0 && triggered;
    if (filter === 'triggered') return triggered;
    return true;
  });

  if (isLoading) return (
    <div className="flex justify-center py-6">
      <div className="w-4 h-4 border-2 border-slate-700 border-t-blue-400 rounded-full animate-spin" />
    </div>
  );

  if (scanned.length === 0) return (
    <div className="text-center py-6 text-slate-600 text-xs">
      <Activity className="w-6 h-6 mx-auto mb-2 text-slate-700" />
      Run technicals on the Edge Scanner to populate tickets
      <div className="mt-2">
        <Link to="/Watchlist" className="text-purple-400 hover:text-purple-300 text-[10px] font-mono">→ Go to Edge Scanner</Link>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-1">
        {[
          { val: 'all',       label: `All (${scanned.length})` },
          { val: 'triggered', label: 'Triggered' },
          { val: 'buy',       label: 'BUY' },
          { val: 'sell',      label: 'SELL' },
        ].map(f => (
          <button
            key={f.val}
            onClick={() => setFilter(f.val)}
            className={`px-2 py-1 rounded text-[9px] font-mono uppercase transition-colors ${
              filter === f.val ? 'bg-slate-700 text-slate-100' : 'text-slate-600 hover:text-slate-400'
            }`}
          >{f.label}</button>
        ))}
      </div>

      {/* Ticker cards */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-0.5">
        {filtered.length === 0 ? (
          <div className="text-center py-4 text-slate-700 text-xs">No assets match filter</div>
        ) : (
          filtered.map(item => <TickerCard key={item.id} item={item} />)
        )}
      </div>

      <Link
        to="/Watchlist"
        className="block text-center text-[10px] font-mono text-purple-400/60 hover:text-purple-400 transition-colors"
      >
        → Full Edge Scanner
      </Link>
    </div>
  );
}