import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Trash2, TrendingUp, TrendingDown, Minus, ClipboardList } from 'lucide-react';

export default function ActiveStrategies() {
  const queryClient = useQueryClient();

  const { data: strategies = [] } = useQuery({
    queryKey: ['option-strategies'],
    queryFn: () => base44.entities.OptionStrategy.list('-created_date', 50),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.OptionStrategy.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['option-strategies'] }),
  });

  const statusColor = {
    open:    'text-blue-400 bg-blue-500/10 border-blue-500/20',
    closed:  'text-slate-400 bg-slate-800 border-slate-700',
    expired: 'text-red-400 bg-red-500/10 border-red-500/20',
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-sm font-semibold text-slate-200">Saved Strategies</span>
          <span className="text-xs text-slate-600 font-mono">({strategies.length})</span>
        </div>
      </div>

      {strategies.length === 0 ? (
        <div className="text-center py-10">
          <ClipboardList className="w-8 h-8 text-slate-700 mx-auto mb-2" />
          <p className="text-slate-600 text-sm">No saved strategies yet</p>
          <p className="text-slate-700 text-xs font-mono mt-0.5">Build a strategy above and save it to track here</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="py-2 pl-4 pr-2 text-[10px] text-slate-500 uppercase tracking-wider">Symbol</th>
                <th className="py-2 px-2 text-[10px] text-slate-500 uppercase tracking-wider">Strategy</th>
                <th className="py-2 px-2 text-[10px] text-slate-500 uppercase tracking-wider">DTE</th>
                <th className="py-2 px-2 text-[10px] text-slate-500 uppercase tracking-wider text-right">Max Profit</th>
                <th className="py-2 px-2 text-[10px] text-slate-500 uppercase tracking-wider text-right">Max Loss</th>
                <th className="py-2 px-2 text-[10px] text-slate-500 uppercase tracking-wider">Status</th>
                <th className="py-2 pr-4" />
              </tr>
            </thead>
            <tbody>
              {strategies.map(s => (
                <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                  <td className="py-2.5 pl-4 pr-2 font-mono text-sm font-bold text-slate-100">{s.symbol}</td>
                  <td className="py-2.5 px-2 text-xs text-slate-300">{s.strategy_name}</td>
                  <td className="py-2.5 px-2 font-mono text-xs text-slate-400">{s.dte}d</td>
                  <td className="py-2.5 px-2 font-mono text-xs text-emerald-400 text-right">${(s.max_profit || 0).toFixed(0)}</td>
                  <td className="py-2.5 px-2 font-mono text-xs text-red-400 text-right">-${(s.max_loss || 0).toFixed(0)}</td>
                  <td className="py-2.5 px-2">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${statusColor[s.status] || statusColor.open}`}>
                      {s.status || 'open'}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-700 hover:text-red-400"
                      onClick={() => deleteMutation.mutate(s.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}