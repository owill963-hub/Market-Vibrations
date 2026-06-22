# Market Vibrations — Sweep → FVG Radar integration

A drop-in liquidity-sweep radar for your equities watchlist, built on the
Massive Stocks data you already pay for. Same idea as the ES/NQ futures brief,
adapted to equity pools (prior-day + premarket highs/lows).

> **Status: informational signal, not validated for auto-trading.** The v0
> mechanical rule was backtested over 116 trading days (Jan–Jun 2026) and showed
> **no tradeable edge** (≈ break-even before costs). See
> `../SweepFVG_Backtest_Report.md`. Ship it as a *radar* that flags where price
> is interacting with liquidity — let a human decide. Do not wire it to orders.

## Files

| File | Role |
|---|---|
| `sweepFVG.js` | Zero-dependency detector (pools + sweep + FVG). Import into the app. |
| `SweepRadarCard.jsx` | React dashboard card. Renders a `scan` array. |
| `premarket_scan.py` | Daily job: pulls Massive bars, writes `scan.json` + text brief. |
| `sample_scan.json` | Example output (2026-06-18) for wiring the card before the job runs. |

## How it maps to your repo

Your `Market-Vibrations` app already has `dashboard/`, `marketintel/`, `screener/`,
and `watchlist/` folders. Suggested placement:

```
src/marketintel/sweepFVG.js          <- copy as-is
src/dashboard/SweepRadarCard.jsx     <- copy as-is, add to your dashboard grid
public/data/scan.json                <- written daily by premarket_scan.py
```

Render the card:

```jsx
import SweepRadarCard from "./SweepRadarCard";
import scan from "../../public/data/scan.json"; // or fetch() it

<SweepRadarCard scan={scan.scan} asOf={scan.day} />
```

Or compute live in the browser from bars you already load:

```js
import { scanWatchlist } from "../marketintel/sweepFVG";
// data = { SPY:{prev:[bars], cur:[bars]}, QQQ:{...} }, bars = {t,o,h,l,c} (epoch ms)
const scan = scanWatchlist(data, [2026,6,22], [2026,6,19]);
```

## Running the daily job

```bash
export MASSIVE_API_KEY=<your REST key / S3 secret>
export MASSIVE_S3_KEY_ID=<your S3 Access Key ID>

# EOD review / backtest replay (flat files are T+1):
python3 premarket_scan.py --source flatfiles --day 2026-06-18 --prev 2026-06-17

# Live-ish premarket scan (needs a Stocks REST entitlement; latency = your plan):
python3 premarket_scan.py --source rest --out public/data/scan.json
```

### Data-source reality check
- **Flat files** = T+1 (each day lands ~11 AM ET the next day). Perfect for
  nightly review and backtesting; cannot produce a *same-morning* live scan.
- **REST** = same-day, but your current key is delayed. A live 9 AM equities
  radar needs a **Stocks REST real-time/low-delay** entitlement — the equities
  analogue of the futures decision we discussed.

## Definitions (so the app and the brief agree)

- **Pools:** PDH/PDL = prior RTH high/low; PMH/PML = premarket (4:00–9:30 ET) high/low.
- **Killzone:** 9:30–11:00 ET. Only the **first** clean sweep counts.
- **Sweep:** a 1-min bar whose wick takes a pool but closes back through it.
- **FVG:** 3-bar fair-value gap on the displacement leg after the sweep.
- **Entry/Stop/Target:** entry = FVG 50% (CE); stop = swept extreme + buffer (1R);
  target = opposing pool.

## Roadmap (before this could ever be a trade signal)
Test these out-of-sample (the report lists them in full): displacement-strength
filter, higher-timeframe trend alignment, drop counter-trend PDL-longs, time-of-day
split, partial at 1R. Your 2003→present minute history supports a proper
train/test split.
