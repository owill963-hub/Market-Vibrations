import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Bell, BellOff, CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AlertFeed({ alerts = [], userEmail }) {
  const queryClient = useQueryClient();

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Alert.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = alerts.filter(a => !a.is_read);
      await Promise.all(unread.map(a => base44.entities.Alert.update(a.id, { is_read: true })));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const myAlerts = userEmail
    ? alerts.filter(a => a.owner_email === userEmail || !a.owner_email)
    : alerts;

  const unreadCount = myAlerts.filter(a => !a.is_read).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Alert Feed</span>
          {unreadCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            className="h-6 text-[10px] text-slate-500 hover:text-slate-300 px-2"
          >
            <CheckCheck className="w-3 h-3 mr-1" />
            All read
          </Button>
        )}
      </div>

      <div className="space-y-2 overflow-y-auto flex-1">
        {myAlerts.length === 0 ? (
          <div className="text-center py-8">
            <BellOff className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="text-xs text-slate-600">No alerts yet</p>
            <p className="text-[10px] text-slate-700 mt-1">Scanner runs every 15 min</p>
          </div>
        ) : (
          myAlerts.map(alert => {
            const isBuy = alert.direction === 'BUY';
            const edgePct = Math.abs(alert.edge_pct || 0);

            return (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border transition-opacity ${
                  alert.is_read ? 'opacity-50' : ''
                } ${isBuy
                  ? 'bg-emerald-500/5 border-emerald-500/15'
                  : 'bg-red-500/5 border-red-500/15'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1 rounded ${isBuy ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                      {isBuy
                        ? <TrendingUp className="w-3 h-3 text-emerald-400" />
                        : <TrendingDown className="w-3 h-3 text-red-400" />
                      }
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm font-bold text-slate-100">{alert.symbol?.replace('-USD', '')}</span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] py-0 px-1.5 ${isBuy
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}
                        >
                          {alert.direction}
                        </Badge>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">{alert.name}</div>
                    </div>
                  </div>
                  {!alert.is_read && (
                    <button
                      onClick={() => markReadMutation.mutate(alert.id)}
                      className="text-slate-600 hover:text-slate-400 shrink-0 mt-0.5"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span>MKT <span className="text-slate-300">${alert.market_price?.toFixed(2)}</span></span>
                    <span className="text-slate-600">→</span>
                    <span>BELIEF <span className="text-slate-300">${alert.belief_price?.toFixed(2)}</span></span>
                  </div>
                  <span className={`font-bold ${isBuy ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isBuy ? '+' : ''}{alert.edge_pct?.toFixed(1)}%
                  </span>
                </div>

                <div className="mt-1 text-[9px] text-slate-700">
                  {alert.triggered_at
                    ? formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true })
                    : formatDistanceToNow(new Date(alert.created_date), { addSuffix: true })
                  }
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}