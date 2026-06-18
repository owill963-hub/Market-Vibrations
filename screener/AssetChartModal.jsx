import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Bell, BellOff, TrendingUp, TrendingDown, Loader2, Brain, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine
} from 'recharts';
import SignalBadge from './SignalBadge';
import { SCREENER_ASSET_MAP } from '@/lib/screenerAssets';
import { useSRLevels, SRChartLines, SRPanel } from './SRLevels';

const PERIODS = [
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
];

function CandleBar({ x, y, width, height, open, close }) {
  const isBullish = close >= open;
  const color = isBullish ? '#10b981' : '#ef4444';
  return <rect x={x} y={y} width={Math.max(width - 1, 1)} height={Math.max(height, 1)} fill={color} opacity={0.8} />;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const isBull = d.close >= d.open;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-[10px] font-mono">
      <div className="text-slate-400 mb-1">{label}</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        <span className="text-slate-500">O</span><span className="text-slate-200">{d.open?.toFixed(2)}</span>
        <span className="text-slate-500">H</span><span className="text-emerald-400">{d.high?.toFixed(2)}</span>
        <span className="text-slate-500">L</span><span className="text-red-400">{d.low?.toFixed(2)}</span>
        <span className="text-slate-500">C</span><span className={isBull ? 'text-emerald-400' : 'text-red-400'}>{d.close?.toFixed(2)}</span>
      </div>
    </div>
  );
}

export default function AssetChartModal({ result, onClose }) {
  const [period, setPeriod] = useState('3mo');
  const [alertPrice, setAlertPrice] = useState('');
  const [alertDir, setAlertDir] = useState('above');
  const [sentiment, setSentiment] = useState(null);
  const [loadingSentiment, setLoadingSentiment] = useState(false);
  const queryClient = useQueryClient();
  const meta = SCREENER_ASSET_MAP[result.symbol] || {};

  const user = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() }).data;

  const { data: chartData, isLoading: loadingChart } = useQuery({
    queryKey: ['ohlc', result.symbol, period],
    queryFn: async () => {
      const res = await base44.functions.invoke('fetchAssetOHLC', { symbol: result.symbol, period });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['price-alerts', result.symbol],
    queryFn: () => base44.entities.PriceAlert.filter({ symbol: result.symbol, is_active: true }),
  });

  const createAlert = useMutation({
    mutationFn: (data) => base44.entities.PriceAlert.create({ ...data, owner_email: user?.email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts', result.symbol] });
      queryClient.invalidateQueries({ queryKey: ['all-price-alerts'] });
      setAlertPrice('');
    },
  });

  const deleteAlert = useMutation({
    mutationFn: (id) => base44.entities.PriceAlert.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts', result.symbol] });
      queryClient.invalidateQueries({ queryKey: ['all-price-alerts'] });
    },
  });

  const fetchSentiment = async () => {
    setLoadingSentiment(true);
    setSentiment(null);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Provide a concise sentiment analysis for ${meta.name || result.symbol} (${result.symbol}).
Technical context: Price $${result.price?.toFixed(2)}, RSI ${result.rsi?.toFixed(1)}, Signal: ${result.signal}, 
EMA20 $${result.ema20?.toFixed(2)}, EMA50 $${result.ema50?.toFixed(2)}, MACD histogram ${result.macd_histogram?.toFixed(3)},
confluence ${result.confluence}/3, R:R 1:${result.rr}.
Search latest news and sentiment for this asset. Give a bullish/bearish/neutral overall sentiment, key drivers, risks, and a brief outlook.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          overall: { type: 'string', enum: ['Bullish', 'Neutral', 'Bearish'] },
          score: { type: 'number', description: '-10 to +10 sentiment score' },
          summary: { type: 'string' },
          drivers: { type: 'array', items: { type: 'string' } },
          risks: { type: 'array', items: { type: 'string' } },
          outlook: { type: 'string' },
        }
      }
    });
    setSentiment(res);
    setLoadingSentiment(false);
  };

  useEffect(() => {
    fetchSentiment();
  }, [result.symbol]);

  const ohlc = chartData?.ohlc || [];
  const srLevels = useSRLevels(ohlc, result.price);
  const chartSlice = ohlc.slice(-60).map(d => ({
    ...d,
    candleRange: [d.low, d.high],
    candleBody: d.close >= d.open ? [d.open, d.close] : [d.close, d.open],
  }));

  const isUp = result.change_pct >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-slate-100">{result.symbol.replace('-USD', '')}</span>
                <span className={`font-mono text-sm font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${result.price?.toFixed(2)} <span className="text-xs">{isUp ? '+' : ''}{result.change_pct?.toFixed(2)}%</span>
                </span>
              </div>
              <div className="text-xs text-slate-500">{meta.name || result.symbol} · {meta.exchange} · {meta.sector}</div>
            </div>
            <SignalBadge signal={result.signal} size="xs" />
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
            {/* Chart + Alerts — left 2/3 */}
            <div className="lg:col-span-2 p-4 space-y-4">
              {/* Period selector */}
              <div className="flex items-center gap-1.5">
                {PERIODS.map(p => (
                  <button key={p.value} onClick={() => setPeriod(p.value)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${period === p.value ? 'bg-slate-700 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}>
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Chart */}
              <div className="h-52 relative">
                {loadingChart ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartSlice} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 9 }} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
                      <YAxis domain={['auto', 'auto']} tick={{ fill: '#475569', fontSize: 9 }} />
                      <Tooltip content={<CustomTooltip />} />
                      {result.ema20 && <ReferenceLine y={result.ema20} stroke="#3b82f6" strokeDasharray="3 3" strokeWidth={1} label={{ value: 'EMA20', fill: '#3b82f6', fontSize: 8 }} />}
                      {result.ema50 && <ReferenceLine y={result.ema50} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} label={{ value: 'EMA50', fill: '#f59e0b', fontSize: 8 }} />}
                      <SRChartLines {...srLevels} />
                      {result.dca_z1 && <ReferenceLine y={result.dca_z1} stroke="#06b6d4" strokeDasharray="2 4" strokeWidth={1} />}
                      {result.sl1 && <ReferenceLine y={result.sl1} stroke="#ef4444" strokeDasharray="2 4" strokeWidth={1} />}
                      {result.tp1 && <ReferenceLine y={result.tp1} stroke="#10b981" strokeDasharray="2 4" strokeWidth={1} />}
                      <Bar dataKey="candleBody" shape={<CandleBar />} fill="#10b981" />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Key metrics row */}
              <div className="grid grid-cols-4 gap-2 text-[10px] font-mono">
                {[
                  { label: 'RSI', value: result.rsi?.toFixed(0), color: result.rsi >= 70 ? 'text-red-400' : result.rsi <= 30 ? 'text-emerald-400' : 'text-slate-300' },
                  { label: 'Conf', value: `${result.confluence}/3`, color: result.confluence === 3 ? 'text-emerald-400' : result.confluence === 2 ? 'text-orange-400' : 'text-slate-400' },
                  { label: 'R:R', value: result.rr ? `1:${result.rr}` : '—', color: result.rr >= 2 ? 'text-emerald-400' : 'text-slate-400' },
                  { label: 'ATR%', value: result.atr_pct ? result.atr_pct.toFixed(1) + '%' : '—', color: 'text-slate-300' },
                ].map(m => (
                  <div key={m.label} className="bg-slate-800/50 rounded-lg p-2 text-center">
                    <div className="text-slate-600 mb-0.5">{m.label}</div>
                    <div className={`font-bold ${m.color}`}>{m.value ?? '—'}</div>
                  </div>
                ))}
              </div>

              {/* DCA / SL / TP zones */}
              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-2">
                  <div className="text-slate-500 mb-1">DCA Entries</div>
                  <div className="text-blue-300">${result.dca_z1?.toFixed(2)}</div>
                  <div className="text-blue-400/70">${result.dca_z2?.toFixed(2)}</div>
                  <div className="text-blue-400/50">${result.dca_z3?.toFixed(2)}</div>
                </div>
                <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2">
                  <div className="text-slate-500 mb-1">Stop Loss</div>
                  <div className="text-red-400">${result.sl1?.toFixed(2)}</div>
                  <div className="text-red-500/70">Hard: ${result.sl2?.toFixed(2)}</div>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2">
                  <div className="text-slate-500 mb-1">Take Profit</div>
                  <div className="text-emerald-400">${result.tp1?.toFixed(2)}</div>
                  <div className="text-emerald-400/70">${result.tp2?.toFixed(2)}</div>
                  <div className="text-emerald-400/50">${result.tp3?.toFixed(2)}</div>
                </div>
              </div>

              {/* S/R + Trauma panel */}
              <SRPanel {...srLevels} currentPrice={result.price} />

              {/* Price Alert creation */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Bell className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-semibold text-slate-300">Set Price Alert</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={alertDir}
                    onChange={e => setAlertDir(e.target.value)}
                    className="h-8 bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 font-mono"
                  >
                    <option value="above">Price above</option>
                    <option value="below">Price below</option>
                  </select>
                  <Input
                    type="number"
                    placeholder={`e.g. ${result.price?.toFixed(2)}`}
                    value={alertPrice}
                    onChange={e => setAlertPrice(e.target.value)}
                    className="h-8 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-600 text-xs font-mono w-32"
                  />
                  <Button
                    size="sm"
                    onClick={() => createAlert.mutate({ symbol: result.symbol, name: meta.name || result.symbol, target_price: parseFloat(alertPrice), direction: alertDir, current_price_at_creation: result.price })}
                    disabled={!alertPrice || isNaN(parseFloat(alertPrice)) || createAlert.isPending}
                    className="h-8 bg-amber-600 hover:bg-amber-700 text-white text-xs"
                  >
                    <Bell className="w-3 h-3 mr-1" />Alert
                  </Button>
                </div>
                {alerts.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {alerts.map(a => (
                      <div key={a.id} className="flex items-center justify-between text-[10px] font-mono bg-amber-500/5 border border-amber-500/10 rounded-lg px-2.5 py-1.5">
                        <span className="text-amber-400">{a.direction === 'above' ? '↑' : '↓'} ${a.target_price?.toFixed(2)}</span>
                        <button onClick={() => deleteAlert.mutate(a.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                          <BellOff className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sentiment — right 1/3 */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-semibold text-slate-300">AI Sentiment</span>
              </div>

              {loadingSentiment ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  <span className="text-[10px] text-slate-600 font-mono">Analysing market sentiment…</span>
                </div>
              ) : sentiment ? (
                <div className="space-y-3">
                  {/* Overall pill */}
                  <div className={`flex items-center justify-between px-3 py-2 rounded-xl border ${
                    sentiment.overall === 'Bullish' ? 'bg-emerald-500/10 border-emerald-500/20' :
                    sentiment.overall === 'Bearish' ? 'bg-red-500/10 border-red-500/20' :
                    'bg-slate-800/50 border-slate-700'
                  }`}>
                    <div className="flex items-center gap-2">
                      {sentiment.overall === 'Bullish' ? <TrendingUp className="w-4 h-4 text-emerald-400" /> :
                       sentiment.overall === 'Bearish' ? <TrendingDown className="w-4 h-4 text-red-400" /> :
                       <div className="w-4 h-4 flex items-center justify-center text-slate-400">—</div>}
                      <span className={`text-sm font-bold ${
                        sentiment.overall === 'Bullish' ? 'text-emerald-400' :
                        sentiment.overall === 'Bearish' ? 'text-red-400' : 'text-slate-400'
                      }`}>{sentiment.overall}</span>
                    </div>
                    <span className={`font-mono text-sm font-bold ${sentiment.score > 0 ? 'text-emerald-400' : sentiment.score < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                      {sentiment.score > 0 ? '+' : ''}{sentiment.score}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">{sentiment.summary}</p>

                  {sentiment.drivers?.length > 0 && (
                    <div>
                      <div className="text-[9px] text-emerald-500/70 uppercase tracking-wider font-mono mb-1.5">Bullish Drivers</div>
                      <ul className="space-y-1">
                        {sentiment.drivers.map((d, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[10px] text-slate-400">
                            <span className="text-emerald-500 mt-0.5 shrink-0">↑</span>{d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {sentiment.risks?.length > 0 && (
                    <div>
                      <div className="text-[9px] text-red-500/70 uppercase tracking-wider font-mono mb-1.5">Key Risks</div>
                      <ul className="space-y-1">
                        {sentiment.risks.map((r, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[10px] text-slate-400">
                            <span className="text-red-500 mt-0.5 shrink-0">↓</span>{r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {sentiment.outlook && (
                    <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-2.5">
                      <div className="text-[9px] text-purple-400/70 uppercase tracking-wider font-mono mb-1">Outlook</div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">{sentiment.outlook}</p>
                    </div>
                  )}

                  <button onClick={fetchSentiment} className="text-[10px] text-slate-600 hover:text-purple-400 transition-colors font-mono flex items-center gap-1">
                    <Brain className="w-3 h-3" />refresh analysis
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <button onClick={fetchSentiment} className="text-xs text-purple-400 hover:text-purple-300">
                    Load sentiment analysis
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}