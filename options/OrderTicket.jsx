import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, AlertTriangle, RotateCcw } from 'lucide-react';

function fmt(n) {
  if (n == null || !isFinite(n)) return '∞';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Row({ label, value, sub, highlight }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-slate-800 last:border-0">
      <div>
        <span className="text-sm text-slate-400">{label}</span>
        {sub && <p className="text-[10px] text-slate-600 mt-0.5 max-w-xs leading-relaxed">{sub}</p>}
      </div>
      <span className={`text-sm font-mono font-bold ${highlight || 'text-slate-200'}`}>{value}</span>
    </div>
  );
}

export default function OrderTicket({ setup, orderType, quantity, orderPlaced, saving, onPlaceOrder, onReset }) {
  const { asset, strategy, dte, legs, maxProfit, maxLoss, breakeven, currentPrice } = setup;
  const netPremium = legs.reduce((acc, l) => {
    const sign = l.type === 'Buy' ? -1 : 1;
    return acc + sign * l.premium;
  }, 0);
  const isCredit = netPremium > 0;
  const totalCost = Math.abs(netPremium) * 100 * quantity;
  const maxProfitTotal = isFinite(maxProfit) ? maxProfit * quantity : Infinity;
  const maxLossTotal = maxLoss * quantity;

  if (orderPlaced) {
    return (
      <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-6 text-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-emerald-300 mb-1">Order Saved!</h3>
        <p className="text-sm text-slate-400 mb-1">
          {strategy?.label} on <span className="font-bold text-slate-200">{asset.symbol}</span> has been added to your Saved Strategies log.
        </p>
        <p className="text-xs text-slate-600 mb-4">This is a paper trade simulator — no real money was used.</p>
        <Button variant="outline" onClick={onReset}
          className="border-slate-700 text-slate-300 hover:bg-slate-800">
          <RotateCcw className="w-3.5 h-3.5 mr-2" />
          Start New Order
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Ticket header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-100">
            {strategy?.label} — <span className="text-indigo-300">{asset.symbol}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {dte}-day expiration · {quantity} contract{quantity > 1 ? 's' : ''} · {orderType.replace('_', ' ').toUpperCase()} order
          </p>
        </div>
        <div className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${
          isCredit
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {isCredit ? 'NET CREDIT' : 'NET DEBIT'}
        </div>
      </div>

      {/* Legs */}
      <div className="bg-slate-800/40 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-4 py-2 bg-slate-800/60 border-b border-slate-700">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Order Legs</span>
          <span className="ml-2 text-[10px] text-slate-600">Each leg is one component of your multi-leg options order</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead>
              <tr className="border-b border-slate-700 text-[10px] text-slate-500 uppercase">
                <th className="px-4 py-2 text-left">Action</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-right">Strike</th>
                <th className="px-4 py-2 text-right">Premium</th>
                <th className="px-4 py-2 text-right">Per Contract</th>
              </tr>
            </thead>
            <tbody>
              {legs.map((leg, i) => (
                <tr key={i} className="border-b border-slate-800 last:border-0">
                  <td className={`px-4 py-2.5 font-bold ${leg.type === 'Buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {leg.type === 'Buy' ? 'BTO' : 'STO'}
                    <span className="ml-1.5 text-[9px] font-normal text-slate-600">
                      {leg.type === 'Buy' ? '(buy to open · you pay premium)' : '(sell to open · you collect premium)'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-300">{leg.contract}</td>
                  <td className="px-4 py-2.5 text-right text-slate-200">${leg.strike.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-300">${leg.premium.toFixed(2)}</td>
                  <td className={`px-4 py-2.5 text-right font-bold ${leg.type === 'Buy' ? 'text-red-400' : 'text-emerald-400'}`}>
                    {leg.type === 'Buy' ? '-' : '+'}${(leg.premium * 100).toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order summary */}
      <div className="bg-slate-900/60 border border-slate-700 rounded-xl px-5 py-1">
        <Row
          label="Underlying Price"
          value={`$${fmt(currentPrice)}`}
          sub="Current market price of the stock"
        />
        <Row
          label={isCredit ? 'Net Credit Received' : 'Net Debit (Cost to Open)'}
          value={`$${fmt(totalCost)}`}
          highlight={isCredit ? 'text-emerald-400' : 'text-red-400'}
          sub={isCredit
            ? 'You collect this premium upfront. It\'s yours to keep if the trade goes well.'
            : 'This is the maximum you can lose — the total premium you pay upfront.'}
        />
        <Row
          label="Max Profit"
          value={isFinite(maxProfitTotal) ? `$${fmt(maxProfitTotal)}` : 'Unlimited ∞'}
          highlight="text-emerald-400"
          sub="Best case scenario — what you make if everything goes perfectly."
        />
        <Row
          label="Max Loss"
          value={`-$${fmt(maxLossTotal)}`}
          highlight="text-red-400"
          sub="Worst case scenario — this is your defined risk. You cannot lose more than this."
        />
        <Row
          label={`Breakeven Price${breakeven.length > 1 ? 's' : ''}`}
          value={breakeven.map(b => `$${fmt(b)}`).join(' & ')}
          highlight="text-amber-400"
          sub="The stock price(s) at which you neither gain nor lose money at expiration."
        />
        <Row
          label="Days to Expiration"
          value={`${dte} days`}
          sub="How long this trade remains open before the contracts expire."
        />
      </div>

      {/* Risk warning */}
      <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2.5">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-500 leading-relaxed">
          <span className="text-amber-400 font-semibold">Paper trading only.</span> This is a simulator — no real orders are placed. Always understand your max risk before trading real options. Options trading involves substantial risk and is not suitable for all investors.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <Button onClick={onPlaceOrder} disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 h-10 text-sm">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
          {saving ? 'Saving…' : 'Place Order'}
        </Button>
        <Button variant="outline" onClick={onReset}
          className="border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
          Cancel
        </Button>
      </div>
    </div>
  );
}