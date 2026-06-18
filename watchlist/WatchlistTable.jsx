import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import TechnicalIndicators from './TechnicalIndicators';

const ExchangeColors = {
  NASDAQ: 'text-blue-400',
  NYSE: 'text-purple-400',
  CRYPTO: 'text-amber-400',
};

function EdgeBar({ edge, threshold }) {
  const pct = Math.min(100, Math.abs(edge));
  const isPositive = edge > 0;
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%`, opacity: Math.min(1, pct / threshold) }}
        />
      </div>
      <span className={`font-mono text-xs font-bold w-14 text-right ${
        Math.abs(edge) >= threshold
          ? isPositive ? 'text-emerald-400' : 'text-red-400'
          : 'text-slate-500'
      }`}>
        {edge > 0 ? '+' : ''}{edge.toFixed(1)}%
      </span>
    </div>
  );
}

function Row({ item, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [localBelief, setLocalBelief] = useState(item.belief_price || 0);
  const [localThreshold, setLocalThreshold] = useState(item.edge_threshold || 5);

  const hasPrice = item.current_price > 0;
  const edge = hasPrice && item.belief_price > 0
    ? ((item.belief_price - item.current_price) / item.current_price) * 100
    : 0;
  const threshold = item.edge_threshold || 5;
  const isTriggered = Math.abs(edge) >= threshold;
  const isBuy = edge > 0;
  const SignalIcon = isTriggered ? (isBuy ? TrendingUp : TrendingDown) : Minus;
  const signalColor = isTriggered ? (isBuy ? 'text-emerald-400' : 'text-red-400') : 'text-slate-600';

  const handleSave = () => {
    onUpdate(item.id, { belief_price: parseFloat(localBelief) || 0, edge_threshold: parseFloat(localThreshold) || 5 });
    setEditing(false);
  };

  return (
    <>
      <tr
        className={`border-b border-slate-800/50 transition-colors hover:bg-slate-800/20 cursor-pointer ${
          isTriggered ? (isBuy ? 'bg-emerald-500/[0.03]' : 'bg-red-500/[0.03]') : ''
        }`}
        onClick={() => setEditing(!editing)}
      >
        <td className="py-3 pl-4 pr-2">
          <div className="flex items-center gap-2">
            <SignalIcon className={`w-3.5 h-3.5 ${signalColor} shrink-0`} />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm font-bold text-slate-100">
                  {item.symbol?.replace('-USD', '')}
                </span>
                {item.congress_flagged && (
                  <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 rounded font-mono">🏛</span>
                )}
              </div>
              <span className={`text-[10px] font-mono ${ExchangeColors[item.exchange] || 'text-slate-600'}`}>
                {item.exchange}
              </span>
            </div>
          </div>
        </td>
        <td className="py-3 px-2">
          <div className="text-xs text-slate-400 truncate max-w-[120px]">{item.name}</div>
          <div className="text-[10px] text-slate-600">{item.sector}</div>
        </td>
        <td className="py-3 px-2 text-right">
          <span className="font-mono text-sm text-slate-200">
            {hasPrice ? `$${item.current_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
          </span>
        </td>
        <td className="py-3 px-2 text-right hidden md:table-cell">
          <div className="text-[10px] font-mono space-y-0.5">
            <div><span className="text-slate-600">O </span><span className="text-slate-300">{item.open_price ? `$${item.open_price.toFixed(2)}` : '—'}</span></div>
            <div><span className="text-slate-600">C </span><span className="text-slate-300">{item.close_price ? `$${item.close_price.toFixed(2)}` : '—'}</span></div>
          </div>
        </td>
        <td className="py-3 px-2 text-right">
          <span className="font-mono text-sm text-slate-400">
            {item.belief_price > 0
              ? `$${item.belief_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : <span className="text-slate-700 text-xs">set target</span>}
          </span>
        </td>
        <td className="py-3 pl-2 pr-2">
          {item.belief_price > 0 && hasPrice
            ? <EdgeBar edge={edge} threshold={threshold} />
            : <span className="text-[10px] text-slate-700 font-mono">needs belief price</span>
          }
        </td>
        <td className="py-3 px-2 hidden lg:table-cell">
          <TechnicalIndicators item={item} compact />
        </td>
        <td className="py-3 pr-4">
          <div className="flex items-center gap-1 justify-end">
            {editing ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-600" />}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-700 hover:text-red-400"
              onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </td>
      </tr>

      {editing && (
        <tr className="bg-slate-800/30 border-b border-slate-800">
          <td colSpan={6} className="px-4 py-3">
            <div className="mb-4 pb-4 border-b border-slate-700/50">
              <TechnicalIndicators item={item} />
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Belief / Target Price ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={localBelief}
                  onChange={e => setLocalBelief(e.target.value)}
                  className="h-8 w-36 bg-slate-900 border-slate-700 text-slate-100 font-mono text-sm"
                  onClick={e => e.stopPropagation()}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Alert Threshold (%)</label>
                <Input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={localThreshold}
                  onChange={e => setLocalThreshold(e.target.value)}
                  className="h-8 w-24 bg-slate-900 border-slate-700 text-slate-100 font-mono text-sm"
                  onClick={e => e.stopPropagation()}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Alert On</label>
                <select
                  value={item.alert_direction || 'both'}
                  onChange={e => { e.stopPropagation(); onUpdate(item.id, { alert_direction: e.target.value }); }}
                  onClick={e => e.stopPropagation()}
                  className="h-8 px-2 rounded-md bg-slate-900 border border-slate-700 text-slate-100 text-xs"
                >
                  <option value="both">Both BUY & SELL</option>
                  <option value="buy_only">BUY only</option>
                  <option value="sell_only">SELL only</option>
                </select>
              </div>
              <Button
                size="sm"
                onClick={e => { e.stopPropagation(); handleSave(); }}
                className="h-8 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={e => { e.stopPropagation(); setEditing(false); }}
                className="h-8 text-slate-500"
              >
                Cancel
              </Button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function WatchlistTable({ items, onUpdate, onDelete }) {
  if (!items.length) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="py-2 pl-4 pr-2 text-[10px] text-slate-500 uppercase tracking-wider font-medium">Symbol</th>
            <th className="py-2 px-2 text-[10px] text-slate-500 uppercase tracking-wider font-medium">Name</th>
            <th className="py-2 px-2 text-right text-[10px] text-slate-500 uppercase tracking-wider font-medium">Market</th>
            <th className="py-2 px-2 text-right text-[10px] text-slate-500 uppercase tracking-wider font-medium hidden md:table-cell">Open / Close</th>
            <th className="py-2 px-2 text-right text-[10px] text-slate-500 uppercase tracking-wider font-medium">Belief</th>
            <th className="py-2 pl-2 pr-2 text-[10px] text-slate-500 uppercase tracking-wider font-medium">Edge</th>
            <th className="py-2 px-2 text-[10px] text-slate-500 uppercase tracking-wider font-medium hidden lg:table-cell">Technicals</th>
            <th className="py-2 pr-4"></th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <Row
              key={item.id}
              item={item}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}