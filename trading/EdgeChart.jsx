import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function EdgeChart({ outcomes }) {
  const data = outcomes.map(o => ({
    name: o.name.length > 12 ? o.name.slice(0, 12) + '…' : o.name,
    edge: o.market_price > 0 ? ((o.belief_price - o.market_price) / o.market_price) * 100 : 0,
    ev: o.belief_price - o.market_price,
  }));

  return (
    <div className="w-full h-48">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 10, fill: '#64748b' }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
          />
          <YAxis 
            tick={{ fontSize: 10, fill: '#64748b' }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
            tickFormatter={v => `${v}%`}
          />
          <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
          <Tooltip
            contentStyle={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 8,
              fontSize: 12,
              color: '#e2e8f0'
            }}
            formatter={(value) => [`${value.toFixed(1)}%`, 'Edge']}
          />
          <Bar dataKey="edge" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell 
                key={i} 
                fill={entry.edge > 0 ? '#10b981' : '#ef4444'}
                fillOpacity={Math.min(1, Math.abs(entry.edge) / 20 + 0.3)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}