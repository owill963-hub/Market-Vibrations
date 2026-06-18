import React, { useState } from 'react';
import { Slider } from "@/components/ui/slider";
import { cost, prices, costToBuy } from '@/lib/lmsr';

export default function LMSRCalculator() {
  const [b, setB] = useState(100);
  const [q1, setQ1] = useState(0);
  const [q2, setQ2] = useState(0);

  const quantities = [q1, q2];
  const currentPrices = prices(quantities, b);
  const currentCost = cost(quantities, b);
  const costBuy1 = costToBuy(quantities, b, 0, 10);
  const costBuy2 = costToBuy(quantities, b, 1, 10);

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="font-mono text-xs text-slate-500 mb-2">LMSR COST FUNCTION</div>
        <div className="font-mono text-lg text-blue-400">
          C(q) = <span className="text-amber-400">{b}</span> · ln( Σ e<sup>q<sub>i</sub>/<span className="text-amber-400">{b}</span></sup> )
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Liquidity (b)</span>
            <span className="font-mono text-amber-400">{b}</span>
          </div>
          <Slider value={[b]} onValueChange={([v]) => setB(v)} min={10} max={500} step={5} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>q₁ (YES)</span>
              <span className="font-mono text-emerald-400">{q1}</span>
            </div>
            <Slider value={[q1]} onValueChange={([v]) => setQ1(v)} min={-200} max={200} step={1} />
          </div>
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>q₂ (NO)</span>
              <span className="font-mono text-red-400">{q2}</span>
            </div>
            <Slider value={[q2]} onValueChange={([v]) => setQ2(v)} min={-200} max={200} step={1} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Cost</div>
          <div className="font-mono text-sm text-slate-200 mt-1">{currentCost.toFixed(4)}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">P(YES)</div>
          <div className="font-mono text-sm text-emerald-400 mt-1">{(currentPrices[0] * 100).toFixed(1)}¢</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-3 text-center">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">P(NO)</div>
          <div className="font-mono text-sm text-red-400 mt-1">{(currentPrices[1] * 100).toFixed(1)}¢</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="border border-emerald-500/20 rounded-lg p-3 text-center">
          <div className="text-[10px] text-slate-500">COST +10 YES</div>
          <div className="font-mono text-sm text-emerald-400 mt-1">${costBuy1.toFixed(4)}</div>
        </div>
        <div className="border border-red-500/20 rounded-lg p-3 text-center">
          <div className="text-[10px] text-slate-500">COST +10 NO</div>
          <div className="font-mono text-sm text-red-400 mt-1">${costBuy2.toFixed(4)}</div>
        </div>
      </div>
    </div>
  );
}