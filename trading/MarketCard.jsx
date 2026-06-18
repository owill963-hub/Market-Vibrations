import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import BeliefSlider from './BeliefSlider';
import EdgeChart from './EdgeChart';
import { kellyFraction } from '@/lib/lmsr';

export default function MarketCard({ market, onUpdate, onDelete }) {
  const outcomes = market.outcomes || [];
  
  const bestTrade = outcomes.reduce((best, o) => {
    const ev = o.belief_price - o.market_price;
    if (ev > (best?.ev || 0)) return { ...o, ev };
    return best;
  }, null);

  const totalEdge = outcomes.reduce((sum, o) => {
    return sum + Math.abs(o.belief_price - o.market_price);
  }, 0);

  const handleBeliefChange = (index, newBelief) => {
    const newOutcomes = [...outcomes];
    newOutcomes[index] = { ...newOutcomes[index], belief_price: newBelief };
    onUpdate({ ...market, outcomes: newOutcomes });
  };

  const statusColor = {
    watching: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    trading: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    closed: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };

  return (
    <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-sm overflow-hidden">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 mr-3">
            <h3 className="text-sm font-semibold text-slate-100 leading-snug">{market.title}</h3>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={`text-[10px] ${statusColor[market.status || 'watching']}`}>
                {market.status || 'watching'}
              </Badge>
              {bestTrade && bestTrade.ev > 0.02 && (
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +EV on {bestTrade.name}
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-600 hover:text-red-400 h-7 w-7"
            onClick={() => onDelete(market.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Edge Chart */}
        {outcomes.length > 0 && <EdgeChart outcomes={outcomes} />}

        {/* Belief Sliders */}
        <div className="space-y-4 mt-4">
          {outcomes.map((outcome, i) => (
            <BeliefSlider
              key={i}
              label={outcome.name}
              marketPrice={outcome.market_price}
              beliefPrice={outcome.belief_price}
              onBeliefChange={(v) => handleBeliefChange(i, v)}
            />
          ))}
        </div>

        {/* Trade Signals */}
        {outcomes.length > 0 && (
          <div className="mt-5 border-t border-slate-800 pt-4">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-3">TRADE SIGNALS</div>
            <div className="space-y-2">
              {outcomes.map((o, i) => {
                const ev = o.belief_price - o.market_price;
                const kelly = kellyFraction(o.belief_price, o.market_price);
                const edgePct = o.market_price > 0 ? (ev / o.market_price) * 100 : 0;
                const signal = edgePct > 5 ? 'STRONG BUY' : edgePct > 2 ? 'BUY' : edgePct < -5 ? 'STRONG SELL' : edgePct < -2 ? 'SELL' : 'HOLD';
                const SignalIcon = edgePct > 2 ? TrendingUp : edgePct < -2 ? TrendingDown : Minus;
                const signalColor = edgePct > 5 ? 'text-emerald-400' : edgePct > 2 ? 'text-emerald-500/70' : edgePct < -5 ? 'text-red-400' : edgePct < -2 ? 'text-red-500/70' : 'text-slate-500';

                return (
                  <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-800/30">
                    <div className="flex items-center gap-2">
                      <SignalIcon className={`w-3.5 h-3.5 ${signalColor}`} />
                      <span className="text-xs text-slate-300">{o.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-mono font-bold ${signalColor}`}>{signal}</span>
                      <span className="text-[10px] font-mono text-slate-500">
                        Kelly: {(kelly * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}