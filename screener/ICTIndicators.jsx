import React from 'react';

// ── HTF Power of Three ────────────────────────────────────────────────────────
const PO3_CONFIG = {
  accumulation:  { label: 'ACCUM',  color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',    dot: 'bg-blue-400',   desc: 'Ranging / building energy' },
  manipulation:  { label: 'MANIP',  color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20',  dot: 'bg-amber-400',  desc: 'Judas swing — false break' },
  distribution:  { label: 'DISTRIB',color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400', desc: 'Trending / distributing' },
};

export function PO3Badge({ po3 }) {
  if (!po3?.phase) return <span className="text-slate-700 text-xs font-mono">—</span>;
  const c = PO3_CONFIG[po3.phase] || PO3_CONFIG.accumulation;
  const biasColor = po3.htf_bias === 'bullish' ? 'text-emerald-400' : 'text-red-400';
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${c.bg} ${c.color} w-fit`}>
        {c.label}
      </span>
      <span className={`text-[9px] font-mono ${biasColor}`}>{po3.htf_bias === 'bullish' ? '↑ BULL' : '↓ BEAR'}</span>
    </div>
  );
}

// ── Seek & Destroy ────────────────────────────────────────────────────────────
const SAD_CONFIG = {
  bullish_sweep:    { label: '🎯 LIQ GRAB ↑', color: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-500/20', desc: 'Swept lows, recovered — bullish reversal' },
  bearish_sweep:    { label: '🎯 LIQ GRAB ↓', color: 'text-red-300',     bg: 'bg-red-500/10 border-red-500/20',         desc: 'Swept highs, rejected — bearish reversal' },
  approaching_highs:{ label: '⚠ NEAR HI LIQ', color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20',     desc: 'Approaching liquidity above — watch for sweep' },
  approaching_lows: { label: '⚠ NEAR LO LIQ', color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20',     desc: 'Approaching liquidity below — watch for sweep' },
};

export function SeekDestroyBadge({ sad }) {
  if (!sad?.signal) return <span className="text-slate-700 text-xs font-mono">—</span>;
  const c = SAD_CONFIG[sad.signal];
  if (!c) return <span className="text-slate-700 text-xs font-mono">—</span>;
  return (
    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${c.bg} ${c.color} whitespace-nowrap`}>
      {c.label}
    </span>
  );
}

// ── S/D Boring Zone ───────────────────────────────────────────────────────────
export function SDBadge({ sd, price }) {
  if (!sd) return <span className="text-slate-700 text-xs font-mono">—</span>;

  if (sd.in_zone) {
    const isDemand = sd.zone_type === 'demand';
    return (
      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
        isDemand ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                 : 'bg-red-500/10 border-red-500/20 text-red-400'
      }`}>
        IN {isDemand ? 'DEMAND' : 'SUPPLY'} ZONE
      </span>
    );
  }

  const parts = [];
  if (sd.demand_zone) {
    const dist = price ? (((price - sd.demand_zone.high) / price) * 100).toFixed(1) : null;
    parts.push(
      <div key="d" className="text-[9px] font-mono">
        <span className="text-slate-600">D </span>
        <span className="text-emerald-400/70">${sd.demand_zone.low?.toFixed(2)}–${sd.demand_zone.high?.toFixed(2)}</span>
        {dist && <span className="text-slate-600 ml-1">({dist}%↓)</span>}
      </div>
    );
  }
  if (sd.supply_zone) {
    const dist = price ? (((sd.supply_zone.low - price) / price) * 100).toFixed(1) : null;
    parts.push(
      <div key="s" className="text-[9px] font-mono">
        <span className="text-slate-600">S </span>
        <span className="text-red-400/70">${sd.supply_zone.low?.toFixed(2)}–${sd.supply_zone.high?.toFixed(2)}</span>
        {dist && <span className="text-slate-600 ml-1">({dist}%↑)</span>}
      </div>
    );
  }

  return parts.length ? <div className="space-y-0.5">{parts}</div> : <span className="text-slate-700 text-xs font-mono">No zones</span>;
}

// ── Full ICT detail block (for expanded row) ──────────────────────────────────
export function ICTDetail({ result }) {
  const { po3, sad, sd, price } = result;
  if (!po3 && !sad && !sd) return null;

  return (
    <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-3 space-y-3">
      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">ICT / Smart Money</div>
      <div className="grid grid-cols-3 gap-3">
        {/* Power of Three */}
        <div className="space-y-1.5">
          <div className="text-[9px] font-mono text-slate-600 uppercase tracking-wide">HTF Power of 3</div>
          {po3?.phase ? (
            <>
              <div className={`text-xs font-bold ${PO3_CONFIG[po3.phase]?.color}`}>
                {po3.phase.toUpperCase()}
              </div>
              <div className="text-[9px] text-slate-500">{PO3_CONFIG[po3.phase]?.desc}</div>
              <div className="text-[9px] font-mono text-slate-600 space-y-0.5 mt-1">
                {po3.week_high != null && <div>Wk High: <span className="text-slate-300">${po3.week_high?.toFixed(2)}</span></div>}
                {po3.week_low != null && <div>Wk Low: <span className="text-slate-300">${po3.week_low?.toFixed(2)}</span></div>}
              </div>
            </>
          ) : <span className="text-slate-700 text-xs">—</span>}
        </div>

        {/* Seek & Destroy */}
        <div className="space-y-1.5">
          <div className="text-[9px] font-mono text-slate-600 uppercase tracking-wide">Seek & Destroy</div>
          {sad?.signal ? (
            <>
              <div className={`text-xs font-bold ${SAD_CONFIG[sad.signal]?.color}`}>
                {SAD_CONFIG[sad.signal]?.label}
              </div>
              <div className="text-[9px] text-slate-500">{SAD_CONFIG[sad.signal]?.desc}</div>
              {sad.swept_level != null && (
                <div className="text-[9px] font-mono text-slate-600 mt-1">
                  Level: <span className="text-slate-300">${sad.swept_level?.toFixed(2)}</span>
                </div>
              )}
              <div className="text-[9px] font-mono text-slate-600 space-y-0.5">
                {sad.swing_high != null && <div>Swing H: <span className="text-slate-300">${sad.swing_high?.toFixed(2)}</span></div>}
                {sad.swing_low != null && <div>Swing L: <span className="text-slate-300">${sad.swing_low?.toFixed(2)}</span></div>}
              </div>
            </>
          ) : <span className="text-slate-700 text-xs">No sweep detected</span>}
        </div>

        {/* S/D Zones */}
        <div className="space-y-1.5">
          <div className="text-[9px] font-mono text-slate-600 uppercase tracking-wide">S&D Zones</div>
          <SDBadge sd={sd} price={price} />
        </div>
      </div>
    </div>
  );
}