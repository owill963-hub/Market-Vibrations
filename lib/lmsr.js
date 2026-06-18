/**
 * LMSR (Logarithmic Market Scoring Rule) Engine
 * C(q) = b · ln(Σ e^(qi/b))
 */

// Cost function: C(q) = b * ln(Σ e^(qi/b))
export function cost(quantities, b) {
  const maxQ = Math.max(...quantities);
  const sumExp = quantities.reduce((sum, qi) => {
    return sum + Math.exp((qi - maxQ) / b);
  }, 0);
  return b * (Math.log(sumExp) + maxQ / b);
}

// Price of outcome i: p_i = e^(qi/b) / Σ e^(qj/b)
export function prices(quantities, b) {
  const maxQ = Math.max(...quantities);
  const exps = quantities.map(qi => Math.exp((qi - maxQ) / b));
  const sumExp = exps.reduce((a, c) => a + c, 0);
  return exps.map(e => e / sumExp);
}

// Cost to buy `amount` shares of outcome `index`
export function costToBuy(quantities, b, index, amount) {
  const newQuantities = [...quantities];
  newQuantities[index] += amount;
  return cost(newQuantities, b) - cost(quantities, b);
}

// Cost to sell `amount` shares of outcome `index`
export function costToSell(quantities, b, index, amount) {
  return -costToBuy(quantities, b, index, -amount);
}

// Expected value of buying shares at market price given belief
export function expectedValue(marketPrice, beliefPrice) {
  // EV = belief * payout - cost
  // For binary: payout = 1, cost = marketPrice
  return beliefPrice * 1 - marketPrice;
}

// Kelly criterion fraction for optimal bet sizing
export function kellyFraction(beliefPrice, marketPrice) {
  if (marketPrice <= 0 || marketPrice >= 1) return 0;
  // f* = (bp - q) / b where b = odds, p = belief, q = 1-belief
  const odds = (1 - marketPrice) / marketPrice;
  const f = (beliefPrice * (odds + 1) - 1) / odds;
  return Math.max(0, Math.min(1, f));
}

// Edge percentage
export function edge(beliefPrice, marketPrice) {
  if (marketPrice === 0) return 0;
  return ((beliefPrice - marketPrice) / marketPrice) * 100;
}

// Quantities from prices (inverse)
export function quantitiesFromPrices(priceArray, b) {
  return priceArray.map(p => b * Math.log(p));
}