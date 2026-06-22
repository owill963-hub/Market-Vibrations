// sweepFVG.js — Liquidity Sweep -> FVG detector for Market Vibrations
// Framework-agnostic, zero-dependency. Mirrors the Python backtest engine.
//
// A "bar" is { t, o, h, l, c }  where t = epoch ms (UTC).
// Times below are mapped in UTC. US equities (EDT) RTH = 13:30–20:00 UTC,
// premarket = 08:00–13:30 UTC, killzone = 13:30–15:00 UTC (9:30–11:00 ET).
//
// NOTE: This is an INFORMATIONAL radar. The v0 mechanical rule did NOT show a
// tradeable edge in backtest (see SweepFVG_Backtest_Report.md). Use it to flag
// where price is interacting with liquidity — not to auto-fire orders.

const H = (d, hh, mm) => Date.UTC(d[0], d[1] - 1, d[2], hh, mm); // d=[Y,M,D]
const inWin = (b, a, z) => b.t >= a && b.t < z;

function hiLo(bars) {
  if (!bars.length) return null;
  return { high: Math.max(...bars.map(b => b.h)), low: Math.min(...bars.map(b => b.l)) };
}

// Compute the four equity liquidity pools for `dayUTC` ([Y,M,D]).
// prevBars = prior trading day's bars; curBars = today's bars (premarket+).
export function computePools(prevBars, curBars, dayUTC, prevDayUTC) {
  const prevRTH = hiLo(prevBars.filter(b => inWin(b, H(prevDayUTC, 13, 30), H(prevDayUTC, 20, 0))));
  const pm = hiLo(curBars.filter(b => inWin(b, H(dayUTC, 8, 0), H(dayUTC, 13, 30))));
  if (!prevRTH || !pm) return null;
  return { PDH: prevRTH.high, PDL: prevRTH.low, PMH: pm.high, PML: pm.low };
}

// Detect the first killzone sweep + displacement FVG. Returns a signal or a
// reason-coded miss. bufPct = stop buffer beyond the swept extreme.
export function detectSetup(curBars, pools, dayUTC, bufPct = 0.0005, rrCap = null) {
  if (!pools) return { setup: "no_pools" };
  const kz = curBars.filter(b => inWin(b, H(dayUTC, 13, 30), H(dayUTC, 15, 0)));
  const rth = curBars.filter(b => inWin(b, H(dayUTC, 13, 30), H(dayUTC, 20, 0)));
  if (kz.length < 3) return { setup: "insufficient_bars" };

  const highPools = [["PDH", pools.PDH], ["PMH", pools.PMH]].sort((a, b) => a[1] - b[1]);
  const lowPools  = [["PDL", pools.PDL], ["PML", pools.PML]].sort((a, b) => b[1] - a[1]);

  let ev = null;
  for (const b of kz) {
    for (const [nm, lv] of highPools) if (b.h > lv && b.c < lv) { ev = { side: "short", pool: nm, lvl: lv, bar: b }; break; }
    if (ev) break;
    for (const [nm, lv] of lowPools)  if (b.l < lv && b.c > lv) { ev = { side: "long",  pool: nm, lvl: lv, bar: b }; break; }
    if (ev) break;
  }
  if (!ev) return { setup: "no_sweep" };

  const si = rth.findIndex(b => b.t === ev.bar.t);
  const seq = rth.slice(si);

  // first FVG in displacement direction within next 12 bars
  let fvg = null;
  for (let j = 1; j < Math.min(seq.length - 1, 13); j++) {
    const a = seq[j - 1], c = seq[j + 1];
    if (ev.side === "short" && c.h < a.l) { fvg = { top: a.l, bot: c.h, j: j + 1 }; break; }
    if (ev.side === "long"  && c.l > a.h) { fvg = { top: c.l, bot: a.h, j: j + 1 }; break; }
  }
  if (!fvg) return { setup: "sweep_no_fvg", side: ev.side, pool: ev.pool };

  const entry = (fvg.top + fvg.bot) / 2;       // CE = 50% of the gap
  const buf = entry * bufPct;
  let stop, risk, target;
  if (ev.side === "short") {
    stop = ev.bar.h + buf; risk = stop - entry;
    const cand = [pools.PDL, pools.PML].filter(v => v < entry);
    target = cand.length ? Math.max(...cand) : null;
  } else {
    stop = ev.bar.l - buf; risk = entry - stop;
    const cand = [pools.PDH, pools.PMH].filter(v => v > entry);
    target = cand.length ? Math.min(...cand) : null;
  }
  if (risk <= 0 || target == null) return { setup: "no_target", side: ev.side, pool: ev.pool };

  let rr = Math.abs(target - entry) / risk;
  if (rrCap) { target = ev.side === "short" ? entry - risk * rrCap : entry + risk * rrCap; rr = rrCap; }
  if (rr < 1) return { setup: "target_lt_1R", side: ev.side, pool: ev.pool, rr: +rr.toFixed(2) };

  return {
    setup: "signal",
    side: ev.side,
    pool: ev.pool,
    sweptLevel: +ev.lvl.toFixed(2),
    entry: +entry.toFixed(2),
    stop: +stop.toFixed(2),
    target: +target.toFixed(2),
    rr: +rr.toFixed(2),
    fvg: { top: +fvg.top.toFixed(2), bot: +fvg.bot.toFixed(2) },
    sweptAt: new Date(ev.bar.t).toISOString(),
  };
}

// Convenience: run a whole watchlist. data = { TICKER: {prev:[bars], cur:[bars]} }
export function scanWatchlist(data, dayUTC, prevDayUTC, opts = {}) {
  return Object.entries(data).map(([ticker, { prev, cur }]) => {
    const pools = computePools(prev, cur, dayUTC, prevDayUTC);
    return { ticker, pools, ...detectSetup(cur, pools, dayUTC, opts.bufPct, opts.rrCap) };
  });
}

export default { computePools, detectSetup, scanWatchlist };
