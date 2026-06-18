import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, CheckCircle2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PriceAlertsPanel() {
  const queryClient = useQueryClient();

  const { data: alerts = [] } = useQuery({
    queryKey: ['all-price-alerts'],
    queryFn: () => base44.entities.PriceAlert.list('-created_date', 100),
    refetchInterval: 30_000,
  });

  const deleteAlert = useMutation({
    mutationFn: (id) => base44.entities.PriceAlert.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-price-alerts'] }),
  });

  const active = alerts.filter(a => a.is_active && !a.is_triggered);
  const triggered = alerts.filter(a => a.is_triggered);

  if (!alerts.length) {
    return (
      <div className="text-center py-6 text-slate-600 text-xs font-mono">
        <Bell className="w-6 h-6 mx-auto mb-2 opacity-30" />
        No alerts set — click any asset to add one
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {triggered.length > 0 && (
        <div>
          <div className="text-[9px] text-emerald-400/70 uppercase tracking-wider font-mono mb-1.5">Triggered</div>
          <div className="space-y-1">
            {triggered.map(a => (
              <div key={a.id} className="flex items-center justify-between px-2.5 py-1.5 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-[10px] font-mono">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span className="text-slate-300 font-bold">{a.symbol}</span>
                  <span className="text-emerald-400">{a.direction === 'above' ? '↑' : '↓'} ${a.target_price?.toFixed(2)}</span>
                </div>
                <button onClick={() => deleteAlert.mutate(a.id)} className="text-slate-600 hover:text-red-400">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {active.length > 0 && (
        <div>
          <div className="text-[9px] text-amber-400/70 uppercase tracking-wider font-mono mb-1.5">Watching</div>
          <div className="space-y-1">
            {active.map(a => (
              <div key={a.id} className="flex items-center justify-between px-2.5 py-1.5 bg-amber-500/5 border border-amber-500/10 rounded-lg text-[10px] font-mono">
                <div className="flex items-center gap-1.5">
                  <Bell className="w-3 h-3 text-amber-400" />
                  <span className="text-slate-300 font-bold">{a.symbol}</span>
                  <span className="text-amber-300">{a.direction === 'above' ? '↑' : '↓'} ${a.target_price?.toFixed(2)}</span>
                </div>
                <button onClick={() => deleteAlert.mutate(a.id)} className="text-slate-600 hover:text-red-400">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}