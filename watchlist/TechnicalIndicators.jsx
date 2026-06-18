import React from 'react';

const RSI_CONFIG = {
  overbought:           { label: 'OVERBOUGHT',  bg: 'bg-red-500/15',    text: 'text-red-400',     border: 'border-red-500/20'    },
  approaching_overbought:{ label: 'RSI HIGH',   bg: 'bg-orange-500/10', text: 'text-orange-400',  border: 'border-orange-500/20' },
  oversold:             { label: 'OVERSOLD',    bg: 'bg-emerald-500/15',text: 'text-emerald-400', border: 'border-emerald-500/20'},
  approaching_oversold: { label: 'RSI LOW',     bg: 'bg-blue-500/10',   text: 'text-blue-400',    border: 'border-blue-500/20'   },
  neutral:              { label: 'RSI NEUTRAL', bg: 'bg-slate-700/30',  text: 'text-slate-500',   border: 'border-slate-700'     },
};

const MACD_CONFIG = {
  bullish_crossover: { label: '⬆ MACD X', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  bearish_crossover: { label: '⬇ MACD X', bg: 'bg-red-500/15',     text: 'text-red-400',     border: 'border-red-500/20'    },
  bullish:           { label: 'MACD +',   bg: 'bg-emerald-500/8',  text: 'text-emerald-500/70', border: 'border-emerald-500/15' },
  bearish:           { label: 'MACD −',   bg: 'bg-red-500/8',      text: 'text-red-500/70',  border: 'border-red-500/15'    },
  neutral:           { label: 'MACD ~',   bg: 'bg-slate-700/30',   text: 'text-slate-600',   border: 'border-slate-700'     },
};

const EMA_CONFIG = {
  uptrend:      { label: '▲ UPTREND',    bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  downtrend:    { label: '▼ DNTREND',    bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20'    },
  above_ema20:  { label: '> EMA20',      bg: 'bg-blue-500/8',     text: 'text-blue-400/70', border: 'border-blue-500/15'   },
  below_ema20:  { label: '< EMA20',      bg: 'bg-slate-700/30',   text: 'text-slate-500',   border: 'border-slate-700'     },
};

function Pill({ config, value, label }) {
  if (!config) return null;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
      {value != null && <span className="opacity-70">{value}</span>}
    </span>
  );
}

export default function TechnicalIndicators({ item, compact = false }) {
  const { rsi, rsi_signal, ema_signal, macd_signal, ema20, ema50, macd_histogram, last_technical_update } = item;

  if (!last_technical_update) {
    return <span className="text-[9px] text-slate-700 font-mono">no data</span>;
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1 items-center">
        {rsi_signal && <Pill config={RSI_CONFIG[rsi_signal]} value={rsi != null ? rsi.toFixed(0) : null} />}
        {macd_signal && <Pill config={MACD_CONFIG[macd_signal]} />}
        {ema_signal && <Pill config={EMA_CONFIG[ema_signal]} />}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* RSI */}
      <div>
        <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-1.5 font-mono">RSI (14)</div>
        <div className="flex items-center gap-3">
          {rsi != null && (
            <div className="flex-1">
              <div className="flex justify-between text-[9px] font-mono text-slate-600 mb-1">
                <span>0</span><span className="text-emerald-600">30</span><span className="text-slate-500">50</span><span className="text-red-600">70</span><span>100</span>
              </div>
              <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="absolute inset-0">
                  <div className="absolute left-0 w-[30%] h-full bg-emerald-500/10" />
                  <div className="absolute right-0 w-[30%] h-full bg-red-500/10" />
                </div>
                <div
                  className={`absolute top-0 h-full w-1 rounded-full -translate-x-1/2 ${
                    rsi >= 70 ? 'bg-red-400' : rsi <= 30 ? 'bg-emerald-400' : 'bg-blue-400'
                  }`}
                  style={{ left: `${rsi}%` }}
                />
              </div>
              <div className="text-center mt-1">
                <span className={`font-mono text-sm font-bold ${rsi >= 70 ? 'text-red-400' : rsi <= 30 ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {rsi.toFixed(1)}
                </span>
              </div>
            </div>
          )}
          <Pill config={RSI_CONFIG[rsi_signal || 'neutral']} />
        </div>
      </div>

      {/* MACD */}
      <div>
        <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-1.5 font-mono">MACD (12,26,9)</div>
        <div className="flex items-center gap-3">
          <div className="flex gap-3 font-mono text-xs">
            <div>
              <span className="text-slate-600 text-[9px]">HIST </span>
              <span className={macd_histogram > 0 ? 'text-emerald-400' : 'text-red-400'}>
                {macd_histogram != null ? (macd_histogram > 0 ? '+' : '') + macd_histogram.toFixed(3) : '—'}
              </span>
            </div>
          </div>
          <Pill config={MACD_CONFIG[macd_signal || 'neutral']} />
        </div>
      </div>

      {/* EMA */}
      <div>
        <div className="text-[9px] text-slate-600 uppercase tracking-wider mb-1.5 font-mono">EMA (20 / 50)</div>
        <div className="flex items-center gap-3">
          <div className="flex gap-3 font-mono text-xs">
            <div>
              <span className="text-slate-600 text-[9px]">EMA20 </span>
              <span className="text-slate-300">{ema20 != null ? `$${ema20.toFixed(2)}` : '—'}</span>
            </div>
            <div>
              <span className="text-slate-600 text-[9px]">EMA50 </span>
              <span className="text-slate-300">{ema50 != null ? `$${ema50.toFixed(2)}` : '—'}</span>
            </div>
          </div>
          <Pill config={EMA_CONFIG[ema_signal || 'below_ema20']} />
        </div>
      </div>
    </div>
  );
}