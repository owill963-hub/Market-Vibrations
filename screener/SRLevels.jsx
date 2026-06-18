import React, { useMemo } from 'react';
import { ReferenceLine, ReferenceArea } from 'recharts';
import { ShieldAlert, Zap } from 'lucide-react';

// ── Pivot detection (Lux Algo style) ──────────────────────────────────────────
function calcPivots(ohlc, left = 3, right = 3) {
  const highs = [], lows = [];
  for (let i = left; i < ohlc.length - right; i++) {
    let isPH = true, isPL = true;
    for (let j = i - left; j <= i + right; j++) {
      if (j === i) continue;
      if (ohlc[j].high >= ohlc[i].high) isPH = false;
      if (ohlc[j].low  <= ohlc[i].low)  isPL = false;
    }
    if (isPH) highs.push({ idx: i, price: ohlc[i].high, date: ohlc[i].date });
    if (isPL) lows.push ({  idx: i, price: ohlc[i].low,  date: ohlc[i].date });
  }
  return { pivotHighs: highs, pivotLows: lows };
}

// ── Break of Structure + CHoCH ─────────────────────────────────────────────────
function calcBOS(ohlc, pivotHighs, pivotLows) {
  const events = [];
  const usedH = new Set(), usedL = new Set();

  for (let i = 0; i < ohlc.length; i++) {
    const bar = ohlc[i];
    for (const ph of pivotHighs) {
      if (!usedH.has(ph.idx) && ph.idx < i && bar.close > ph.price) {
        events.push({ type: 'BOS_BULL', price: ph.price, date: bar.date, idx: i });
        usedH.add(ph.idx);
      }
    }
    for (const pl of pivotLows) {
      if (!usedL.has(pl.idx) && pl.idx < i && bar.close < pl.price) {
        events.push({ type: 'BOS_BEAR', price: pl.price, date: bar.date, idx: i });
        usedL.add(pl.idx);
      }
    }
  }

  // CHoCH = first break opposing the previous direction
  let lastDir = null;
  for (const e of events) {
    const dir = e.type === 'BOS_BULL' ? 'bull' : 'bear';
    if (lastDir && lastDir !== dir) e.isChoch = true;
    lastDir = dir;
  }
  return events;
}

// ── Trauma zones: price levels tested 2+ times within 1.5% band ──────────────
function calcTraumaZones(pivotHighs, pivotLows) {
  const all = [
    ...pivotHighs.map(p => p.price),
    ...pivotLows.map(p => p.price),
  ];
  const used = new Set();
  const zones = [];

  for (let i = 0; i < all.length; i++) {
    if (used.has(i)) continue;
    const cluster = [all[i]];
    for (let j = i + 1; j < all.length; j++) {
      if (used.has(j)) continue;
      if (Math.abs(all[i] - all[j]) / all[i] < 0.015) {
        cluster.push(all[j]);
        used.add(j);
      }
    }
    used.add(i);
    if (cluster.length >= 2) {
      zones.push({
        low:    Math.min(...cluster) * 0.9985,
        high:   Math.max(...cluster) * 1.0015,
        touches: cluster.length,
      });
    }
  }
  return zones.sort((a, b) => b.touches - a.touches).slice(0, 5);
}

// ── Public hook ───────────────────────────────────────────────────────────────
export function useSRLevels(ohlc, currentPrice) {
  return useMemo(() => {
    const empty = { supports: [], resistances: [], bosEvents: [], traumaZones: [] };
    if (!ohlc || ohlc.length < 10 || !currentPrice) return empty;

    const { pivotHighs, pivotLows } = calcPivots(ohlc, 3, 3);
    const bosEvents  = calcBOS(ohlc, pivotHighs, pivotLows);
    const traumaZones = calcTraumaZones(pivotHighs, pivotLows);

    const resistances = pivotHighs
      .filter(p => p.price > currentPrice)
      .sort((a, b) => a.price - b.price)
      .slice(0, 3);

    const supports = pivotLows
      .filter(p => p.price < currentPrice)
      .sort((a, b) => b.price - a.price)
      .slice(0, 3);

    return { supports, resistances, bosEvents: bosEvents.slice(-8), traumaZones };
  }, [ohlc, currentPrice]);
}

// ── Chart overlay lines (injected as children of ComposedChart) ───────────────
export function SRChartLines({ supports, resistances, traumaZones }) {
  return (
    <>
      {traumaZones.slice(0, 3).map((z, i) => (
        <ReferenceArea key={`tz-${i}`} y1={z.low} y2={z.high}
          fill="#a855f7" fillOpacity={0.07}
          stroke="#a855f7" strokeOpacity={0.25} strokeWidth={0.5} />
      ))}
      {resistances.map((r, i) => (
        <ReferenceLine key={`res-${i}`} y={r.price} stroke="#ef4444"
          strokeDasharray="5 3" strokeWidth={1}
          label={{ value: `R${i + 1}`, fill: '#ef4444', fontSize: 8, position: 'insideTopRight' }} />
      ))}
      {supports.map((s, i) => (
        <ReferenceLine key={`sup-${i}`} y={s.price} stroke="#10b981"
          strokeDasharray="5 3" strokeWidth={1}
          label={{ value: `S${i + 1}`, fill: '#10b981', fontSize: 8, position: 'insideBottomRight' }} />
      ))}
    </>
  );
}

// ── Info panel (rendered below chart) ─────────────────────────────────────────
function fmt(n) { return n?.toFixed(2) ?? '—'; }
function pct(a, b) { return b > 0 ? ((a - b) / b * 100).toFixed(1) : '0'; }

export function SRPanel({ supports, resistances, bosEvents, traumaZones, currentPrice }) {
  const lastBos = bosEvents[bosEvents.length - 1];

  return (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
        <span className="text-xs font-semibold text-slate-300">Structure & Trauma</span>
        {lastBos && (
          <span className={`ml-auto text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
            lastBos.isChoch
              ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
              : lastBos.type === 'BOS_BULL'
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : 'bg-red-500/15 text-red-300 border-red-500/30'
          }`}>
            {lastBos.isChoch ? '⚡ CHoCH' : lastBos.type === 'BOS_BULL' ? '↑ BOS' : '↓ BOS'}
          </span>
        )}
      </div>

      {/* S / R grid */}
      <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
        <div>
          <div className="text-red-400/50 uppercase tracking-wider text-[8px] mb-1.5">Resistance</div>
          {resistances.length > 0 ? resistances.map((r, i) => (
            <div key={i} className="flex justify-between py-0.5">
              <span className="text-red-400">R{i + 1} &nbsp;${fmt(r.price)}</span>
              <span className="text-slate-600">+{pct(r.price, currentPrice)}%</span>
            </div>
          )) : <div className="text-slate-700 italic">None above</div>}
        </div>
        <div>
          <div className="text-emerald-400/50 uppercase tracking-wider text-[8px] mb-1.5">Support</div>
          {supports.length > 0 ? supports.map((s, i) => (
            <div key={i} className="flex justify-between py-0.5">
              <span className="text-emerald-400">S{i + 1} &nbsp;${fmt(s.price)}</span>
              <span className="text-slate-600">-{pct(currentPrice, s.price)}%</span>
            </div>
          )) : <div className="text-slate-700 italic">None below</div>}
        </div>
      </div>

      {/* Trauma zones */}
      {traumaZones.length > 0 && (
        <div>
          <div className="text-[8px] uppercase tracking-wider text-purple-400/50 mb-1.5 flex items-center gap-1">
            <Zap className="w-2.5 h-2.5" /> Trauma Zones
          </div>
          <div className="space-y-1">
            {traumaZones.map((z, i) => {
              const inside = currentPrice >= z.low && currentPrice <= z.high;
              const abv    = currentPrice < z.low;
              return (
                <div key={i} className={`flex items-center justify-between text-[9px] font-mono px-2 py-1 rounded-lg ${
                  inside ? 'bg-purple-500/15 border border-purple-500/30' : 'bg-slate-900/40 border border-slate-800'
                }`}>
                  <span className={inside ? 'text-purple-300' : 'text-purple-400/50'}>
                    ${fmt(z.low)} – ${fmt(z.high)}
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    {z.touches}× tested
                    {inside && <span className="text-purple-300 font-bold">● IN ZONE</span>}
                    {!inside && <span className="text-slate-700">{abv ? '↑ above' : '↓ below'}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent BOS / CHoCH events */}
      {bosEvents.length > 0 && (
        <div>
          <div className="text-[8px] uppercase tracking-wider text-slate-500/50 mb-1.5">Recent Breaks</div>
          <div className="flex flex-wrap gap-1">
            {bosEvents.map((e, i) => (
              <span key={i} className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${
                e.isChoch
                  ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                  : e.type === 'BOS_BULL'
                  ? 'bg-emerald-500/8 text-emerald-400 border-emerald-500/15'
                  : 'bg-red-500/8 text-red-400 border-red-500/15'
              }`}>
                {e.isChoch ? '⚡CHoCH' : e.type === 'BOS_BULL' ? '↑BOS' : '↓BOS'} {e.date?.slice(5)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}