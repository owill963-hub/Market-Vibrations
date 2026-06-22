// SweepRadarCard.jsx — Market Vibrations dashboard card
// Shows the daily premarket liquidity-sweep radar for your watchlist.
// Drop into src/dashboard/ (or src/marketintel/) and feed it `scan` from
// premarket_scan.py output (or a live call to scanWatchlist in sweepFVG.js).
//
// Tailwind core classes + lucide-react (already used by Market Vibrations).
// No required props — renders sample data if none passed, so it won't crash.

import { useState } from "react";
import { TrendingUp, TrendingDown, Crosshair, AlertTriangle, Minus } from "lucide-react";

const SAMPLE = [
  { ticker: "SPY",  setup: "signal", side: "short", pool: "PMH", sweptLevel: 748.02, entry: 747.51, stop: 748.57, target: 743.35, rr: 3.9 },
  { ticker: "QQQ",  setup: "signal", side: "short", pool: "PMH", sweptLevel: 737.6,  entry: 735.5,  stop: 738.02, target: 721.97, rr: 5.4 },
  { ticker: "NVDA", setup: "no_sweep" },
  { ticker: "MSFT", setup: "sweep_no_fvg", side: "long", pool: "PDL" },
];

const REASON_LABEL = {
  no_sweep: "No clean sweep yet",
  sweep_no_fvg: "Swept — waiting on displacement",
  no_target: "No opposing pool",
  target_lt_1R: "Target < 1R (skip)",
  insufficient_bars: "Warming up",
  no_pools: "No pool data",
};

export default function SweepRadarCard({ scan = SAMPLE, asOf = "premarket" }) {
  const [open, setOpen] = useState(true);
  const signals = scan.filter(s => s.setup === "signal");
  const watching = scan.filter(s => s.setup !== "signal");

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 p-5 shadow-lg max-w-2xl">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-semibold tracking-tight">Sweep → FVG Radar</h3>
        </div>
        <span className="text-xs uppercase tracking-wider text-slate-400">{asOf}</span>
      </div>
      <p className="text-xs text-amber-400/90 flex items-center gap-1 mb-4">
        <AlertTriangle className="w-3.5 h-3.5" /> Informational — not a validated auto-trade signal.
      </p>

      <div className="text-xs text-slate-400 mb-2">{signals.length} armed · {watching.length} watching</div>

      <div className="space-y-2">
        {signals.map(s => {
          const short = s.side === "short";
          return (
            <div key={s.ticker} className="rounded-xl bg-slate-800/70 border border-slate-700 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base">{s.ticker}</span>
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${short ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300"}`}>
                    {short ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                    {short ? "SHORT bias" : "LONG bias"}
                  </span>
                  <span className="text-xs text-slate-400">swept {s.pool} @ {s.sweptLevel}</span>
                </div>
                <span className="text-xs text-slate-400">{s.rr}R to pool</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <Stat label="Entry (FVG CE)" value={s.entry} accent="text-cyan-300" />
                <Stat label="Stop" value={s.stop} accent="text-rose-300" />
                <Stat label="Target (pool)" value={s.target} accent="text-emerald-300" />
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={() => setOpen(o => !o)} className="mt-3 text-xs text-slate-400 hover:text-slate-200">
        {open ? "Hide" : "Show"} watching ({watching.length})
      </button>
      {open && (
        <div className="mt-2 space-y-1">
          {watching.map(s => (
            <div key={s.ticker} className="flex items-center justify-between text-sm text-slate-300 px-2">
              <span className="font-medium">{s.ticker}</span>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Minus className="w-3 h-3" /> {REASON_LABEL[s.setup] || s.setup}
                {s.pool ? ` (${s.side} ${s.pool})` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="rounded-lg bg-slate-900/60 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`font-semibold ${accent}`}>{value}</div>
    </div>
  );
}
