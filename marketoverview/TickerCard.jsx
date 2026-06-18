import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const LABEL_MAP = {
  SPY: 'S&P 500', QQQ: 'Nasdaq 100', DIA: 'Dow Jones', IWM: 'Russell 2000',
  GLD: 'Gold', SLV: 'Silver', TLT: 'Bonds 20Y', USO: 'Oil', VIX: 'VIX',
  AAPL: 'Apple', MSFT: 'Microsoft', NVDA: 'NVIDIA', TSLA: 'Tesla',
  AMZN: 'Amazon', META: 'Meta', GOOGL: 'Alphabet', NFLX: 'Netflix',
  AMD: 'AMD', INTC: 'Intel', JPM: 'JPMorgan', BAC: 'Bank of America',
  GS: 'Goldman', XOM: 'ExxonMobil', CVX: 'Chevron',
};

function fmt(n, digits = 2) {
  if (n == null) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default function TickerCard({ t }) {
  if (!t) return null;
  const { ticker, price, changePct, change } = t;
  const label = LABEL_MAP[ticker] || ticker;
  const isUp = changePct != null ? changePct >= 0 : null;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3 flex flex-col gap-1 hover:border-slate-700 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{ticker}</span>
        {isUp != null && (
          isUp
            ? <TrendingUp className="w-3 h-3 text-emerald-500" />
            : <TrendingDown className="w-3 h-3 text-red-500" />
        )}
      </div>
      <div className="text-slate-100 font-mono font-semibold text-base">${fmt(price)}</div>
      <div className="text-[10px] text-slate-500 truncate">{label}</div>
      {changePct != null && (
        <div className={`text-xs font-mono font-semibold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
          {isUp ? '+' : ''}{fmt(changePct)}%
          {change != null && <span className="ml-1 font-normal opacity-70">({isUp ? '+' : ''}{fmt(change)})</span>}
        </div>
      )}
    </div>
  );
}