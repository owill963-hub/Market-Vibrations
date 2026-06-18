import React from 'react';
import { Slider } from "@/components/ui/slider";

export default function BeliefSlider({ label, marketPrice, beliefPrice, onBeliefChange }) {
  const edgePct = marketPrice > 0 ? ((beliefPrice - marketPrice) / marketPrice) * 100 : 0;
  const isPositiveEdge = edgePct > 2;
  const isNegativeEdge = edgePct < -2;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-300 truncate mr-3">{label}</span>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-mono">
            MKT <span className="text-slate-400">{(marketPrice * 100).toFixed(1)}¢</span>
          </div>
          <div className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
            isPositiveEdge ? 'bg-emerald-500/10 text-emerald-400' :
            isNegativeEdge ? 'bg-red-500/10 text-red-400' :
            'bg-slate-700 text-slate-400'
          }`}>
            {edgePct > 0 ? '+' : ''}{edgePct.toFixed(1)}%
          </div>
        </div>
      </div>
      
      <div className="relative">
        <div className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-slate-700 w-full" />
        {/* Market price indicator */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-amber-500/60 rounded-full z-10"
          style={{ left: `${marketPrice * 100}%` }}
        />
        <Slider
          value={[beliefPrice * 100]}
          onValueChange={([v]) => onBeliefChange(v / 100)}
          min={0}
          max={100}
          step={0.5}
          className="relative z-20"
        />
      </div>

      <div className="flex justify-between text-[10px] text-slate-600 font-mono">
        <span>0¢</span>
        <span className="text-amber-500/60">▲ mkt</span>
        <span>100¢</span>
      </div>
    </div>
  );
}