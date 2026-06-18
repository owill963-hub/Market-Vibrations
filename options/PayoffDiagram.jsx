import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';

function fmt(n) {
  if (n == null || !isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const pnl = payload[0]?.value;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono">
      <div className="text-slate-400 mb-1">Price: ${fmt(label)}</div>
      <div className={pnl >= 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
        P&L: {pnl >= 0 ? '+' : ''}${fmt(pnl)}
      </div>
    </div>
  );
}

export default function PayoffDiagram({ setup }) {
  const { legs, currentPrice, maxProfit, maxLoss, breakeven, strategy } = setup;

  const data = useMemo(() => {
    const low = currentPrice * 0.75;
    const high = currentPrice * 1.25;
    const steps = 60;
    const step = (high - low) / steps;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const price = low + i * step;
      let pnl = 0;

      for (const leg of legs) {
        const isLong = leg.type === 'Buy';
        const isCall = leg.contract === 'Call';
        const intrinsic = isCall ? Math.max(0, price - leg.strike) : Math.max(0, leg.strike - price);
        const legPnl = (isLong ? intrinsic - leg.premium : leg.premium - intrinsic) * 100;
        pnl += legPnl;
      }

      return { price: parseFloat(price.toFixed(2)), pnl: parseFloat(pnl.toFixed(2)) };
    });
  }, [setup]);

  const maxVal = Math.max(...data.map(d => d.pnl));
  const minVal = Math.min(...data.map(d => d.pnl));
  const range = maxVal - minVal;

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-200">Payoff Diagram — {strategy?.label}</span>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="text-emerald-400">Max Profit: {isFinite(maxProfit) ? `$${fmt(maxProfit)}` : '∞'}</span>
          <span className="text-red-400">Max Loss: -${fmt(maxLoss)}</span>
        </div>
      </div>

      <div className="p-4">
        {/* Breakeven info */}
        <div className="flex flex-wrap gap-3 mb-3 text-[10px] font-mono">
          <span className="text-slate-500">Breakeven{breakeven.length > 1 ? 's' : ''}:</span>
          {breakeven.map((b, i) => (
            <span key={i} className="text-amber-400 font-bold">${fmt(b)}</span>
          ))}
          <span className="text-slate-500 ml-auto">Current: <span className="text-slate-300">${fmt(currentPrice)}</span></span>
        </div>

        {/* Legs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {legs.map((leg, i) => (
            <div key={i} className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-mono ${
              leg.type === 'Buy'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-red-500/10 border-red-500/20 text-red-300'
            }`}>
              {leg.type} {leg.contract} ${leg.strike} @ ${leg.premium}
            </div>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="pnlGradientNeg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.0} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="#1e293b" />
            <XAxis dataKey="price" tickFormatter={v => `$${v}`} tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 9, fill: '#475569' }} tickLine={false} axisLine={false} width={55} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#334155" strokeWidth={1.5} />
            <ReferenceLine x={currentPrice} stroke="#6366f1" strokeWidth={1.5} strokeDasharray="4 2" label={{ value: 'Now', position: 'top', fill: '#6366f1', fontSize: 9 }} />
            {breakeven.map((b, i) => (
              <ReferenceLine key={i} x={b} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" />
            ))}
            <Area type="monotone" dataKey="pnl" stroke="#10b981" strokeWidth={2}
              fill="url(#pnlGradient)"
              dot={false}
              activeDot={{ r: 3, fill: '#10b981' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}