import React from 'react';

const CONFIG = {
  STRONG_BUY:  { label: '⬆⬆ STRONG BUY', bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  BUY:         { label: '⬆ BUY',          bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  DCA:         { label: '◎ DCA',          bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20'    },
  NEUTRAL:     { label: '— NEUTRAL',      bg: 'bg-slate-700/30',   text: 'text-slate-500',   border: 'border-slate-700'      },
  REDUCE:      { label: '⬇ REDUCE',       bg: 'bg-orange-500/10',  text: 'text-orange-400',  border: 'border-orange-500/20'  },
  SELL:        { label: '⬇ SELL',         bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20'     },
  STRONG_SELL: { label: '⬇⬇ STRONG SELL', bg: 'bg-red-500/20',     text: 'text-red-300',     border: 'border-red-500/30'     },
};

export default function SignalBadge({ signal, size = 'sm' }) {
  const c = CONFIG[signal] || CONFIG.NEUTRAL;
  const sizeClass = size === 'xs' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5';
  return (
    <span className={`inline-flex items-center rounded font-mono font-bold border ${c.bg} ${c.text} ${c.border} ${sizeClass}`}>
      {c.label}
    </span>
  );
}