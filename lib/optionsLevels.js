/**
 * Options Approval Levels
 *
 * Level 0 — Covered & protective strategies: buy-writes, collars, cash-secured equity puts
 * Level 1 — Long calls & puts, debit spreads
 * Level 2 — Credit spreads, iron condors
 * Level 3 — Naked puts
 * Level 4 — Naked calls (uncovered)
 */

export const LEVEL_DESCRIPTIONS = {
  0: 'Covered & protective (buy-writes, collars, cash-secured puts)',
  1: 'Long options & debit spreads',
  2: 'Credit spreads & iron condors',
  3: 'Uncovered (naked) puts',
  4: 'Uncovered (naked) calls — highest risk',
};

// Minimum level required to trade each strategy
export const STRATEGY_LEVEL_REQUIREMENTS = {
  buy_write:             0,
  collar:                0,
  cash_secured_put:      0,
  bull_call_spread:      1,
  bear_put_spread:       1,
  long_straddle:         1,
  iron_condor:           2,
};

export function canTradeStrategy(strategyId, userLevel) {
  const required = STRATEGY_LEVEL_REQUIREMENTS[strategyId] ?? 1;
  return (userLevel ?? 0) >= required;
}