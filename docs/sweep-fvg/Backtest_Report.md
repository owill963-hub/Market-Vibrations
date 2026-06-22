# Sweep → FVG (Equities) — Backtest Report v0

**Author:** Cowork (for O Williams / Market Vibrations)
**Date:** 2026-06-22
**Data:** Massive.com Flat Files — `us_stocks_sip/minute_aggs_v1` (1-minute bars, your entitled subscription)
**Universe:** SPY, QQQ, AAPL, NVDA, TSLA, MSFT, AMD
**Period:** 2026-01-02 → 2026-06-18 (116 trading days, in-sample)

---

## 1. What this is

This adapts your ES/NQ "Session Sweep → FVG Reversal" futures idea to **equities you actually trade and have data for.** Equities don't trade the Asian/London overnight sessions, so the overnight liquidity pools are replaced with the pools equities *do* have:

- **PDH / PDL** — prior day's regular-session (RTH) high / low
- **PMH / PML** — premarket high / low (4:00–9:30 ET)

Everything else mirrors your futures logic: wait for the **first clean sweep** of a pool inside the 9:30–11:00 ET killzone, require a **displacement** that prints a **Fair Value Gap (FVG)**, enter at the **50% (CE)** of that FVG, stop just beyond the swept extreme (= 1R), target the opposing pool.

The point of this exercise was to find out — *before risking a dollar* — whether the mechanical rule has an edge. It does not, in its naive form. That is a useful, money-saving result.

## 2. Headline result

| Variant | Trades | Win rate | Avg R / trade | Total R (6 mo) |
|---|---|---|---|---|
| **A — target = opposing pool** (variable RR) | 294 | 25.2% | **−0.061R** | −17.9R |
| **B — fixed 2R target (1:2)** | 340 | 33.8% | **−0.036R** | −12.1R |

Break-even win rate at a 2R target is 33.3%. Variant B came in at 33.8% — **statistically indistinguishable from break-even, and net-negative once you add commissions and slippage** (not modeled here). Worst peak-to-trough drawdown on the 2R variant was **−48.8R**.

**Verdict: no demonstrated edge in the naive "first sweep + first FVG" rule on this sample.** The geometry (tight 1R stop just past the swept wick, distant target) produces a low hit rate that the reward doesn't pay for.

## 3. The funnel (per ticker-day)

```
no clean sweep in killzone ...... 57
sweep but no FVG formed ......... 167
FVG but no opposing target ...... 42
target < 1R (skipped) ........... 52
entry never filled .............. 25
TRADE TAKEN ..................... 294
```

About 1 in 3 qualified ticker-days actually produces a trade. Most rejections are "sweep but no displacement FVG" — i.e., the sweep didn't lead to a clean reversal, which is the discretionary judgment a human makes and the mechanical rule can't.

## 4. Where the structure is (and the trap)

By pool swept (Variant B):

| Pool | Trades | Win rate | Avg R |
|---|---|---|---|
| PDH (prior-day high) | 54 | 37% | +0.00 |
| PMH (premarket high) | 132 | 35% | +0.02 |
| PDL (prior-day low) | 42 | 21% | **−0.36** |
| PML (premarket low) | 112 | 36% | −0.00 |

The clearest finding: **counter-trend longs off a prior-day-low sweep are the worst bucket** (21% win, −0.36R). Buying the sweep of yesterday's low was mostly catching knives in this period.

By ticker, NVDA (+12.9R) and MSFT (+8.1R) were positive on the 2R variant while SPY (−11R) and AAPL (−10R) bled. **Do not read this as "trade NVDA" — with ~50 trades per name it is almost certainly noise / curve-fitting.** It is a hypothesis to test out-of-sample, not a signal.

## 5. Refinement hypotheses (each must be tested out-of-sample before it means anything)

1. **Displacement-strength filter** — require the FVG's displacement candle to exceed N× the prior 5-bar average range. Weak "gaps" are noise.
2. **Trend alignment** — only take sweeps *with* the higher-timeframe bias (e.g., only shorts when price is below the prior-day midpoint / opening below VWAP). The PDL-long disaster suggests counter-trend entries need a filter.
3. **Pool quality** — only the *first* pool taken of the day, and only when the rejection closes a full bar back through the level (stronger confirmation than a wick).
4. **Time-of-day** — split the 9:30–9:45 open-drive sweeps from 10:00+ sweeps; they behave differently.
5. **Partial at 1R** — bank 1R on half, trail the rest to the pool, rather than all-or-nothing.

## 6. Honest caveats

- **In-sample only.** 6 months, one regime. No walk-forward / out-of-sample validation yet. Any positive subset here could be luck.
- **Costs not modeled.** Commissions + slippage would push every number lower; on SPY/QQQ the FVG-CE limit entry also assumes you get filled at mid-gap, which is optimistic.
- **Survivorship / liquidity.** All 7 names are large-caps with real premarket liquidity; the rule would behave worse on thin names.
- **Mark-to-close.** ~5% of trades neither hit stop nor target and were closed at 4:00 ET — modeled at the close price.

## 7. Bottom line

The disciplined outcome: **we have evidence, not hope.** The mechanical v0 is a slight net loser, so it should **not** be auto-traded. The scanner built alongside this (see the `marketvibrations/` package) is still useful as an **informational liquidity-sweep radar** for your own discretionary reads — it just shouldn't fire orders. The next real work is testing hypotheses #1–#5 with a proper train/test split, which your 2003→present data depth fully supports.

*This is research tooling and statistics, not financial advice. Past backtested behavior does not predict future results.*
