import React, { useMemo, useState } from 'react';

// Simplified Black-Scholes
function approxBS(S, K, T, sigma = 0.28, r = 0.05, type = 'call') {
  if (T <= 0) return { price: Math.max(0.01, type === 'call' ? S - K : K - S), delta: type === 'call' ? (S > K ? 1 : 0) : (K > S ? -1 : 0), iv: sigma * 100, theta: 0 };
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  const N = x => (1 + Math.sign(x) * (1 - Math.exp(-0.7 * x * x - 0.04 * x ** 4))) / 2;
  const n = x => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  const price = type === 'call'
    ? S * N(d1) - K * Math.exp(-r * T) * N(d2)
    : K * Math.exp(-r * T) * N(-d2) - S * N(-d1);
  const delta = type === 'call' ? N(d1) : N(d1) - 1;
  const theta = (-(S * n(d1) * sigma) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * (type === 'call' ? N(d2) : N(-d2))) / 365;
  return { price: Math.max(0.01, price), delta, theta, iv: Math.round(sigma * 100) };
}

function fmt2(n) { return typeof n === 'number' ? n.toFixed(2) : '—'; }
function fmtD(n) { return typeof n === 'number' ? n.toFixed(2) : '—'; }

function ChainRow({ strike, call, put, currentPrice, onSelectLeg }) {
  const isATM = Math.abs(strike - currentPrice) / currentPrice < 0.015;
  const isCallITM = strike < currentPrice;
  const isPutITM = strike > currentPrice;

  const callBid = call.price * 0.97;
  const callMid = call.price;
  const callAsk = call.price * 1.03;
  const putBid  = put.price * 0.97;
  const putMid  = put.price;
  const putAsk  = put.price * 1.03;

  const callCls = isCallITM ? 'text-slate-200' : 'text-slate-500';
  const putCls  = isPutITM  ? 'text-slate-200' : 'text-slate-500';

  return (
    <tr className={`border-b border-slate-800/50 text-xs font-mono transition-colors ${isATM ? 'bg-indigo-500/5' : 'hover:bg-slate-800/20'}`}>
      {/* CALL: Delta, IV */}
      <td className={`py-2 px-2 text-right ${callCls}`}>{fmtD(call.delta)}</td>
      <td className={`py-2 px-2 text-right ${callCls}`}>{call.iv}%</td>
      {/* CALL: Bid (STO) */}
      <td className={`py-2 px-2 text-right cursor-pointer hover:text-white hover:bg-red-500/10 rounded transition-colors ${callCls}`}
        title="STO — Sell to Open this Call"
        onClick={() => onSelectLeg({ type: 'Sell', contract: 'Call', strike, premium: callBid })}>
        {fmt2(callBid)}
      </td>
      {/* CALL: Mid */}
      <td className={`py-2 px-2 text-right text-slate-600`}>{fmt2(callMid)}</td>
      {/* CALL: Ask (BTO) */}
      <td className={`py-2 px-2 text-right cursor-pointer hover:text-white hover:bg-emerald-500/10 rounded transition-colors border-r border-slate-800 ${callCls}`}
        title="BTO — Buy to Open this Call"
        onClick={() => onSelectLeg({ type: 'Buy', contract: 'Call', strike, premium: callAsk })}>
        {fmt2(callAsk)}
      </td>

      {/* STRIKE (center) */}
      <td className={`py-2 px-4 text-center font-bold text-sm border-x border-slate-700/60 ${isATM ? 'text-indigo-300 bg-indigo-500/10' : 'text-slate-300'}`}>
        {strike.toFixed(strike >= 100 ? 0 : 2)}
        {isATM && <div className="text-[8px] text-indigo-400/70 font-normal -mt-0.5">ATM</div>}
      </td>

      {/* PUT: Bid (BTO) */}
      <td className={`py-2 px-2 cursor-pointer hover:text-white hover:bg-emerald-500/10 rounded transition-colors border-l border-slate-800 ${putCls}`}
        title="BTO — Buy to Open this Put"
        onClick={() => onSelectLeg({ type: 'Buy', contract: 'Put', strike, premium: putBid })}>
        {fmt2(putBid)}
      </td>
      {/* PUT: Mid */}
      <td className={`py-2 px-2 text-slate-600`}>{fmt2(putMid)}</td>
      {/* PUT: Ask (STO) */}
      <td className={`py-2 px-2 cursor-pointer hover:text-white hover:bg-red-500/10 rounded transition-colors ${putCls}`}
        title="STO — Sell to Open this Put"
        onClick={() => onSelectLeg({ type: 'Sell', contract: 'Put', strike, premium: putAsk })}>
        {fmt2(putAsk)}
      </td>
      <td className={`py-2 px-2 ${putCls}`}>{put.iv}%</td>
      <td className={`py-2 px-2 ${putCls}`}>{fmtD(put.delta)}</td>
    </tr>
  );
}

export default function SchwabOptionsChain({ asset, dte, onDteChange, dteOptions, onSelectLeg }) {
  const strikes = useMemo(() => {
    if (!asset?.current_price) return [];
    const price = asset.current_price;
    const step = price > 500 ? 10 : price > 200 ? 5 : price > 50 ? 2.5 : price > 10 ? 1 : 0.5;
    const rounded = Math.round(price / step) * step;
    return Array.from({ length: 17 }, (_, i) => parseFloat((rounded + (i - 8) * step).toFixed(2)));
  }, [asset?.current_price]);

  const chain = useMemo(() => {
    if (!asset?.current_price || !strikes.length) return [];
    const S = asset.current_price;
    const T = dte / 365;
    return strikes.map(K => ({
      strike: K,
      call: approxBS(S, K, T, 0.28, 0.05, 'call'),
      put:  approxBS(S, K, T, 0.28, 0.05, 'put'),
    }));
  }, [strikes, dte, asset?.current_price]);

  if (!asset) return null;

  return (
    <div className="space-y-3">
      {/* Expiration selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-slate-400 font-semibold shrink-0">Expiration:</span>
        <div className="flex gap-1.5 flex-wrap">
          {dteOptions.map(d => (
            <button key={d} onClick={() => onDteChange(d)}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-colors border ${
                dte === d
                  ? 'bg-indigo-600 border-indigo-500 text-white font-bold'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
              }`}>
              {d}d
            </button>
          ))}
        </div>
        <span className="text-[10px] text-slate-600 font-mono ml-auto hidden sm:block">
          💡 Click any Bid or Ask price to auto-fill the Trade Builder below
        </span>
      </div>

      {/* Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/80">
                {/* CALLS label */}
                <th colSpan={5} className="py-2.5 px-3 text-center text-xs font-semibold text-emerald-400/80 border-r border-slate-700">
                  CALLS &nbsp;·&nbsp; <span className="text-[10px] font-normal text-slate-600">profit when stock goes UP</span>
                </th>
                <th className="py-2.5 px-4 text-center text-xs font-semibold text-slate-400 border-x border-slate-700">
                  STRIKE
                </th>
                {/* PUTS label */}
                <th colSpan={5} className="py-2.5 px-3 text-center text-xs font-semibold text-red-400/80 border-l border-slate-700">
                  PUTS &nbsp;·&nbsp; <span className="text-[10px] font-normal text-slate-600">profit when stock goes DOWN</span>
                </th>
              </tr>
              <tr className="border-b border-slate-800 text-[10px] font-mono text-slate-600 uppercase tracking-wider">
                <th className="py-2 px-2 text-right">Delta Δ</th>
                <th className="py-2 px-2 text-right">IV</th>
                <th className="py-2 px-2 text-right text-red-400/70">Bid <span className="text-[8px] normal-case text-slate-700">(STO)</span></th>
                <th className="py-2 px-2 text-right text-slate-500">Mid</th>
                <th className="py-2 px-2 text-right text-emerald-400/70 border-r border-slate-800">Ask <span className="text-[8px] normal-case text-slate-700">(BTO)</span></th>
                <th className="py-2 px-4 text-center border-x border-slate-700 text-slate-400">Strike</th>
                <th className="py-2 px-2 text-emerald-400/70 border-l border-slate-800">Bid <span className="text-[8px] normal-case text-slate-700">(BTO)</span></th>
                <th className="py-2 px-2 text-slate-500">Mid</th>
                <th className="py-2 px-2 text-red-400/70">Ask <span className="text-[8px] normal-case text-slate-700">(STO)</span></th>
                <th className="py-2 px-2">IV</th>
                <th className="py-2 px-2">Delta Δ</th>
              </tr>
            </thead>
            <tbody>
              {chain.map(row => (
                <ChainRow
                  key={row.strike}
                  strike={row.strike}
                  call={row.call}
                  put={row.put}
                  currentPrice={asset.current_price}
                  onSelectLeg={onSelectLeg}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="px-4 py-2.5 border-t border-slate-800 flex flex-wrap gap-4 text-[10px] font-mono text-slate-600">
          <span><span className="text-slate-400">Delta (Δ)</span> — how much the option price moves per $1 stock move. Near 0.5 = ATM. Near 1.0 = deep ITM.</span>
          <span><span className="text-slate-400">IV</span> — Implied Volatility (28% assumed). Higher IV = more expensive options.</span>
          <span className="text-slate-700">· Theoretical prices via Black-Scholes · Not live market data</span>
        </div>
      </div>
    </div>
  );
}