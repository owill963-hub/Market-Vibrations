import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { FlaskConical, Loader2, TrendingUp, TrendingDown, Trophy, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

const STRATEGIES = [
  { id: 'rsi_oversold',  label: 'RSI Oversold Bounce',     desc: 'Buy RSI<30, exit RSI>55 or -5%' },
  { id: 'macd_crossover',label: 'MACD Bullish Crossover',  desc: 'Buy MACD histogram flip +, exit on flip - or -4%' },
  { id: 'ema_breakout',  label: 'EMA20 Breakout',          desc: 'Buy price cross above EMA20 + RSI>50, exit below EMA20' },
  { id: 'confluence',    label: 'High Confluence',         desc: 'All 3 aligned: RSI<45 + MACD+ + above EMA20' },
];

function StatCard({ label, value, sub, color = 'text-slate-200' }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
      <div className="text-[9px] font-mono text-slate-600 uppercase tracking-wider mb-1">{label}</div>
      <div className={`font-mono text-xl font-bold ${color}`}>{value ?? '—'}</div>
      {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
    </div>
  );
}

function WinRateBar({ rate }) {
  const color = rate >= 60 ? '#34d399' : rate >= 45 ? '#fbbf24' : '#f87171';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, background: color }} />
      </div>
      <span className="font-mono text-xs font-bold" style={{ color }}>{rate}%</span>
    </div>
  );
}

function ResultRow({ r }) {
  const [open, setOpen] = useState(false);
  const winColor = r.win_rate >= 60 ? 'text-emerald-400' : r.win_rate >= 45 ? 'text-yellow-400' : 'text-red-400';
  return (
    <>
      <tr
        className="border-b border-slate-800/50 hover:bg-slate-800/20 cursor-pointer transition-colors"
        onClick={() => r.trade_log && setOpen(o => !o)}
      >
        <td className="py-2 pl-4 pr-2 font-mono text-sm font-bold text-slate-100">{r.symbol}</td>
        <td className="py-2 px-2 text-xs text-slate-400 text-center">{r.trades}</td>
        <td className="py-2 px-2">
          {r.win_rate != null ? <WinRateBar rate={r.win_rate} /> : <span className="text-slate-700 text-xs">no trades</span>}
        </td>
        <td className={`py-2 px-2 font-mono text-xs font-bold text-right ${r.avg_return >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {r.avg_return != null ? `${r.avg_return > 0 ? '+' : ''}${r.avg_return}%` : '—'}
        </td>
        <td className="py-2 px-2 font-mono text-xs text-red-400 text-right">
          {r.max_drawdown != null ? `-${r.max_drawdown}%` : '—'}
        </td>
        <td className={`py-2 pr-4 font-mono text-xs font-bold text-right ${r.total_return >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {r.total_return != null ? `${r.total_return > 0 ? '+' : ''}${r.total_return}%` : '—'}
        </td>
      </tr>
      {open && r.trade_log && (
        <tr className="bg-slate-800/10 border-b border-slate-800">
          <td colSpan={6} className="px-4 py-3">
            <div className="text-[9px] font-mono text-slate-600 mb-2 uppercase tracking-wider">Trade Log</div>
            <div className="space-y-1">
              {r.trade_log.map((t, i) => (
                <div key={i} className={`flex items-center gap-3 text-[10px] font-mono px-2 py-1 rounded ${t.win ? 'bg-emerald-500/5 text-emerald-400' : 'bg-red-500/5 text-red-400'}`}>
                  <span className="w-4 text-slate-600">{i + 1}</span>
                  <span>Entry ${t.entry_price?.toFixed(2)} → Exit ${t.exit_price?.toFixed(2)}</span>
                  <span className="font-bold">{t.pnl_pct > 0 ? '+' : ''}{t.pnl_pct}%</span>
                  <span className="text-slate-600">{t.bars_held}d held</span>
                  <span className="text-slate-700">DD: -{t.max_drawdown_pct}%</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function BacktestPanel({ screenerResults }) {
  const [strategyId, setStrategyId] = useState('rsi_oversold');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    if (loading) return;
    setLoading(true);
    setResult(null);

    // Use top screener signals or first 20 symbols if no results
    const symbols = screenerResults.length > 0
      ? screenerResults
          .filter(r => ['STRONG_BUY', 'BUY', 'DCA'].includes(r.signal))
          .sort((a, b) => (b.confluence ?? 0) - (a.confluence ?? 0))
          .slice(0, 20)
          .map(r => r.symbol)
      : [];

    if (!symbols.length) {
      setLoading(false);
      return;
    }

    const res = await base44.functions.invoke('backtestStrategy', { symbols, strategy_id: strategyId });
    setResult(res.data);
    setLoading(false);
  };

  const agg = result?.aggregate;
  const chartData = result?.results
    ?.filter(r => r.trades > 0)
    .sort((a, b) => b.win_rate - a.win_rate)
    .slice(0, 15)
    .map(r => ({ symbol: r.symbol.replace('-USD', ''), win_rate: r.win_rate, total_return: r.total_return }));

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-slate-100">Backtesting Engine</span>
          <span className="text-[10px] text-slate-600 font-mono">30-day historical simulation</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Strategy selector */}
        <div>
          <div className="text-[9px] font-mono text-slate-600 uppercase tracking-wider mb-2">Select Strategy</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {STRATEGIES.map(s => (
              <button
                key={s.id}
                onClick={() => setStrategyId(s.id)}
                className={`text-left px-3 py-2.5 rounded-xl border transition-all ${
                  strategyId === s.id
                    ? 'border-purple-500/40 bg-purple-500/10 text-slate-100'
                    : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-semibold mb-0.5">{s.label}</div>
                <div className="text-[10px] text-slate-600 font-mono">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Run button */}
        <Button
          onClick={run}
          disabled={loading || screenerResults.length === 0}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running Backtest…</>
            : <><FlaskConical className="w-4 h-4 mr-2" />Run Backtest on Top Signals</>
          }
        </Button>
        {screenerResults.length === 0 && (
          <p className="text-center text-[10px] text-slate-700 font-mono">Run a screener scan first to populate symbols</p>
        )}

        {/* Aggregate stats */}
        {agg && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <StatCard label="Symbols Tested" value={agg.symbols_tested} />
              <StatCard label="With Trades" value={agg.symbols_with_trades} />
              <StatCard
                label="Avg Win Rate"
                value={`${agg.avg_win_rate}%`}
                color={agg.avg_win_rate >= 55 ? 'text-emerald-400' : agg.avg_win_rate >= 45 ? 'text-yellow-400' : 'text-red-400'}
              />
              <StatCard
                label="Avg Return/Trade"
                value={`${agg.avg_return > 0 ? '+' : ''}${agg.avg_return}%`}
                color={agg.avg_return >= 0 ? 'text-emerald-400' : 'text-red-400'}
              />
              <StatCard label="Avg Max Drawdown" value={`-${agg.avg_max_drawdown}%`} color="text-red-400" />
              <StatCard label="Best Symbol" value={agg.best_symbol} color="text-amber-400" />
            </div>

            {/* Win-rate bar chart */}
            {chartData?.length > 0 && (
              <div>
                <div className="text-[9px] font-mono text-slate-600 uppercase tracking-wider mb-2">Win Rate by Symbol (top 15)</div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="symbol" tick={{ fontSize: 9, fill: '#475569', fontFamily: 'monospace' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#475569' }} />
                      <ReferenceLine y={50} stroke="#334155" strokeDasharray="3 3" />
                      <Tooltip
                        contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
                        formatter={(v, n) => [`${v}%`, n === 'win_rate' ? 'Win Rate' : 'Total Return']}
                      />
                      <Bar dataKey="win_rate" radius={[3, 3, 0, 0]}>
                        {chartData.map((d, i) => (
                          <Cell key={i} fill={d.win_rate >= 60 ? '#34d399' : d.win_rate >= 45 ? '#fbbf24' : '#f87171'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Per-symbol table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60">
                    <th className="py-2 pl-4 pr-2 text-[9px] font-mono text-slate-500 uppercase tracking-wider">Symbol</th>
                    <th className="py-2 px-2 text-[9px] font-mono text-slate-500 uppercase tracking-wider text-center">Trades</th>
                    <th className="py-2 px-2 text-[9px] font-mono text-slate-500 uppercase tracking-wider">Win Rate</th>
                    <th className="py-2 px-2 text-[9px] font-mono text-slate-500 uppercase tracking-wider text-right">Avg Return</th>
                    <th className="py-2 px-2 text-[9px] font-mono text-slate-500 uppercase tracking-wider text-right">Max DD</th>
                    <th className="py-2 pr-4 text-[9px] font-mono text-slate-500 uppercase tracking-wider text-right">Total Return</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results
                    .sort((a, b) => (b.win_rate ?? -1) - (a.win_rate ?? -1))
                    .map(r => <ResultRow key={r.symbol} r={r} />)
                  }
                </tbody>
              </table>
            </div>
            <p className="text-center text-[10px] text-slate-700 font-mono">
              Click a row to expand trade log · Strategy: {result.strategy}
            </p>
          </>
        )}
      </div>
    </div>
  );
}