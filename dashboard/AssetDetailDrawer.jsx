import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';
import {
  X, ChevronLeft, TrendingUp, TrendingDown, Minus, Loader2,
  BarChart2, Zap, BookOpen, AlertTriangle, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine
} from 'recharts';

function fmt(n, decimals = 2) {
  if (n == null) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: decimals })}`;
}

function fmtPrice(p) {
  if (p == null) return '—';
  if (p >= 1000) return `$${p.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (p >= 1)    return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  return `$${p.toFixed(6)}`;
}

function StatPill({ label, value, color = 'text-slate-300' }) {
  return (
    <div className="flex flex-col gap-0.5 bg-slate-800/60 rounded-xl px-3 py-2.5 border border-slate-700/40">
      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">{label}</span>
      <span className={`text-xs font-mono font-bold ${color}`}>{value}</span>
    </div>
  );
}

function SignalBar({ label, value, color }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-800/40 last:border-0">
      <span className="text-[10px] font-mono text-slate-500">{label}</span>
      <span className={`text-[10px] font-mono font-bold ${color}`}>{value}</span>
    </div>
  );
}

const ChartTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-[10px] font-mono">
      <div className="text-slate-400">{d.date}</div>
      <div className="text-slate-100 font-bold">{fmtPrice(d.close)}</div>
    </div>
  );
};

export default function AssetDetailDrawer({ asset, data: screenerData, onClose }) {
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const drawerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Fetch full stats
  useEffect(() => {
    setStats(null);
    setAiAnalysis(null);
    setStatsLoading(true);
    base44.functions.invoke('fetchAssetStats', { symbol: asset.symbol })
      .then(res => {
        setStats(res.data);
        setStatsLoading(false);
        generateAiAnalysis(res.data);
      })
      .catch(() => setStatsLoading(false));
  }, [asset.symbol]);

  const generateAiAnalysis = async (statsData) => {
    setAiLoading(true);
    const rsi = screenerData?.rsi ?? statsData?.rsi;
    const emaSignal = screenerData?.ema_signal;
    const macdHist = screenerData?.macd_histogram;
    const macdSignal = screenerData?.macd_signal;
    const price = statsData?.price ?? screenerData?.price;
    const changePct = statsData?.change_pct ?? screenerData?.change_pct;

    const prompt = `You are a professional quantitative market analyst. Analyze ${asset.name || asset.symbol} (${asset.symbol}) and provide a concise, actionable trading brief.

LIVE TECHNICAL DATA:
- Price: ${fmtPrice(price)} (${changePct != null ? (changePct >= 0 ? '+' : '') + changePct.toFixed(2) + '%' : 'N/A'} today)
- RSI(14): ${rsi != null ? rsi.toFixed(1) : 'N/A'}
- EMA Signal: ${emaSignal || 'N/A'}
- MACD Histogram: ${macdHist != null ? macdHist.toFixed(4) : 'N/A'} | MACD Signal: ${macdSignal || 'N/A'}
- 52W High: ${fmtPrice(statsData?.high_52w)} | 52W Low: ${fmtPrice(statsData?.low_52w)}
- Market Cap: ${fmt(statsData?.market_cap)}
- Volume: ${statsData?.volume ? statsData.volume.toLocaleString() : 'N/A'} vs Avg ${statsData?.avg_volume ? statsData.avg_volume.toLocaleString() : 'N/A'}
${statsData?.pe_trailing ? `- P/E (Trailing): ${statsData.pe_trailing.toFixed(1)}` : ''}
${statsData?.beta ? `- Beta: ${statsData.beta.toFixed(2)}` : ''}
${statsData?.recommendation ? `- Analyst Consensus: ${statsData.recommendation.toUpperCase()}` : ''}

Provide a structured response in this EXACT format (use markdown headers):
## Verdict
One sentence: BUY / SELL / HOLD + price target range and key reasoning.

## Price Action Setup
2-3 bullet points on technical structure: trend, key levels, momentum.

## Key Catalysts
2-3 bullet points on what is driving or could drive the price (use real-world knowledge + web search for latest news).

## Risk Factors
2 bullet points on what could go wrong.

## Trade Plan
Entry zone, stop-loss level, and profit target. Be specific with price levels.

Keep it tight. No fluff. Professional tone. Use $ price levels where possible.`;

    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: null,
      });
      setAiAnalysis(typeof res === 'string' ? res : JSON.stringify(res));
    } catch (e) {
      setAiAnalysis('Unable to generate analysis at this time.');
    }
    setAiLoading(false);
  };

  // Derived signals
  const rsi = screenerData?.rsi ?? stats?.rsi;
  const emaSignal = screenerData?.ema_signal;
  const macdSignal = screenerData?.macd_signal;
  const macdHist = screenerData?.macd_histogram;
  const price = stats?.price ?? screenerData?.price;
  const changePct = stats?.change_pct ?? screenerData?.change_pct;

  const rsiColor = rsi == null ? 'text-slate-500' : rsi <= 35 ? 'text-emerald-400' : rsi >= 65 ? 'text-red-400' : 'text-slate-300';
  const changeColor = changePct == null ? 'text-slate-500' : changePct >= 0 ? 'text-emerald-400' : 'text-red-400';

  let confluence = 0;
  if (rsi != null) { if (rsi <= 40) confluence++; if (rsi >= 60) confluence--; }
  if (emaSignal === 'uptrend') confluence++; if (emaSignal === 'downtrend') confluence--;
  if (macdHist != null && macdHist > 0) confluence++; if (macdHist != null && macdHist < 0) confluence--;
  const verdict = confluence >= 2 ? 'BUY' : confluence <= -2 ? 'SELL' : 'NEUTRAL';
  const verdictColor = verdict === 'BUY' ? 'text-emerald-400' : verdict === 'SELL' ? 'text-red-400' : 'text-slate-400';
  const verdictBg = verdict === 'BUY' ? 'bg-emerald-500/10 border-emerald-500/25' : verdict === 'SELL' ? 'bg-red-500/10 border-red-500/25' : 'bg-slate-800/60 border-slate-700/40';

  const ohlc = stats?.ohlc || [];
  const chartData = ohlc.map(d => ({ date: d.date, close: d.close }));
  const chartMin = chartData.length ? Math.min(...chartData.map(d => d.close)) * 0.995 : 0;
  const chartMax = chartData.length ? Math.max(...chartData.map(d => d.close)) * 1.005 : 0;
  const chartColor = chartData.length >= 2 && chartData[chartData.length - 1].close >= chartData[0].close ? '#34d399' : '#f87171';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/50 backdrop-blur-sm">
      <div
        ref={drawerRef}
        className="relative h-full w-full max-w-lg bg-slate-950 border-l border-slate-800 overflow-y-auto shadow-2xl flex flex-col"
        style={{ animation: 'slideInRight 0.22s ease-out' }}
      >
        {/* Header — native-style back indicator */}
        <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 px-4 py-3 flex items-center gap-3">
          {/* Back chevron (native-style) */}
          <button
            onClick={onClose}
            className="flex items-center gap-0.5 text-blue-400 hover:text-blue-300 transition-colors shrink-0 -ml-1 pr-2 py-1"
            aria-label="Back"
            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          {/* Title centered */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-100 font-mono truncate">{asset.name || asset.symbol}</h2>
              <span className="text-xs font-mono text-slate-500">{asset.symbol}</span>
              {asset.tag && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
                  {asset.tag}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-base font-bold text-slate-100">{fmtPrice(price)}</span>
              {changePct != null && (
                <span className={`font-mono text-xs font-bold ${changeColor}`}>
                  {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                </span>
              )}
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${verdictBg} ${verdictColor}`}>
                {verdict}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 px-5 py-4 space-y-5">
          {/* Price Chart */}
          {chartData.length > 0 && (
            <div>
              <div className="text-[9px] font-mono text-slate-600 uppercase tracking-wider mb-2">6-Month Price Action</div>
              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" hide />
                    <YAxis domain={[chartMin, chartMax]} hide />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="close" stroke={chartColor} strokeWidth={1.5} fill="url(#chartGrad)" dot={false} />
                    {price && <ReferenceLine y={price} stroke={chartColor} strokeDasharray="3 3" strokeOpacity={0.4} />}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Key Stats Grid */}
          {statsLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
              <span className="text-[10px] font-mono text-slate-600">Loading stats…</span>
            </div>
          ) : stats && (
            <div>
              <div className="text-[9px] font-mono text-slate-600 uppercase tracking-wider mb-2">Key Stats</div>
              <div className="grid grid-cols-3 gap-2">
                {stats.market_cap && <StatPill label="Mkt Cap" value={fmt(stats.market_cap)} />}
                {stats.high_52w && <StatPill label="52W High" value={fmtPrice(stats.high_52w)} />}
                {stats.low_52w && <StatPill label="52W Low" value={fmtPrice(stats.low_52w)} />}
                {stats.volume && <StatPill label="Volume" value={stats.volume >= 1e6 ? `${(stats.volume / 1e6).toFixed(1)}M` : stats.volume.toLocaleString()} />}
                {stats.pe_trailing && <StatPill label="P/E" value={stats.pe_trailing.toFixed(1)} />}
                {stats.beta && <StatPill label="Beta" value={stats.beta.toFixed(2)} />}
                {stats.eps && <StatPill label="EPS" value={`$${stats.eps.toFixed(2)}`} />}
                {stats.dividend_yield && <StatPill label="Div Yield" value={`${(stats.dividend_yield * 100).toFixed(2)}%`} />}
                {stats.recommendation && (
                  <StatPill
                    label="Consensus"
                    value={stats.recommendation.toUpperCase()}
                    color={stats.recommendation.includes('buy') ? 'text-emerald-400' : stats.recommendation.includes('sell') ? 'text-red-400' : 'text-slate-300'}
                  />
                )}
              </div>
            </div>
          )}

          {/* Technical Signals */}
          <div>
            <div className="text-[9px] font-mono text-slate-600 uppercase tracking-wider mb-2">Technical Signals</div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2">
              <SignalBar
                label="RSI (14)"
                value={rsi != null ? `${rsi.toFixed(1)} — ${rsi <= 30 ? 'Oversold' : rsi >= 70 ? 'Overbought' : rsi <= 45 ? 'Leaning Oversold' : rsi >= 55 ? 'Leaning Overbought' : 'Neutral'}` : '—'}
                color={rsiColor}
              />
              <SignalBar
                label="EMA Trend"
                value={emaSignal ? emaSignal.replace('_', ' ').toUpperCase() : '—'}
                color={emaSignal === 'uptrend' ? 'text-emerald-400' : emaSignal === 'downtrend' ? 'text-red-400' : 'text-slate-400'}
              />
              <SignalBar
                label="MACD"
                value={macdSignal ? macdSignal.replace(/_/g, ' ').toUpperCase() : '—'}
                color={macdSignal?.includes('bullish') ? 'text-emerald-400' : macdSignal?.includes('bearish') ? 'text-red-400' : 'text-slate-400'}
              />
              <SignalBar
                label="Confluence Score"
                value={`${confluence > 0 ? '+' : ''}${confluence} / 3 — ${verdict}`}
                color={verdictColor}
              />
            </div>
          </div>

          {/* AI Analysis */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-violet-400" />
                <span className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">AI Analysis + Live News</span>
              </div>
              {!aiLoading && aiAnalysis && (
                <button
                  onClick={() => { setAiAnalysis(null); generateAiAnalysis(stats); }}
                  className="text-[9px] font-mono text-slate-600 hover:text-slate-400 flex items-center gap-1"
                >
                  <RefreshCw className="w-2.5 h-2.5" /> Refresh
                </button>
              )}
            </div>

            {aiLoading ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-6 flex flex-col items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                <span className="text-xs font-mono text-slate-500">Scanning live news & building analysis…</span>
              </div>
            ) : aiAnalysis ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-4">
                <ReactMarkdown
                  className="text-xs prose prose-invert prose-sm max-w-none
                    [&_h2]:text-[11px] [&_h2]:font-bold [&_h2]:text-slate-200 [&_h2]:uppercase [&_h2]:tracking-wider [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2:first-child]:mt-0
                    [&_h3]:text-[10px] [&_h3]:font-semibold [&_h3]:text-slate-300 [&_h3]:mt-2 [&_h3]:mb-1
                    [&_p]:text-slate-400 [&_p]:leading-relaxed [&_p]:my-1
                    [&_ul]:pl-4 [&_li]:text-slate-400 [&_li]:my-0.5 [&_li]:leading-relaxed
                    [&_strong]:text-slate-200 [&_strong]:font-semibold"
                >
                  {aiAnalysis}
                </ReactMarkdown>
              </div>
            ) : null}
          </div>

          {/* Description */}
          {stats?.description && (
            <div>
              <div className="text-[9px] font-mono text-slate-600 uppercase tracking-wider mb-2">About</div>
              <p className="text-[10px] text-slate-600 leading-relaxed line-clamp-4">{stats.description}</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}