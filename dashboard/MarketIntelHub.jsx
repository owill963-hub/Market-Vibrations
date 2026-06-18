import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Calculator, Loader2, Send, RefreshCw, TrendingUp, Lightbulb, BookOpen } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { DASHBOARD_ASSETS, DASHBOARD_ASSET_MAP } from '@/lib/dashboardAssets';

// ── Shared markdown renderer ───────────────────────────────────────────────────
function MDContent({ children }) {
  return (
    <ReactMarkdown className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1.5 [&_ul]:my-1.5 [&_li]:my-0.5 [&_strong]:text-slate-100 [&_p]:text-slate-300 [&_li]:text-slate-300 text-sm leading-relaxed [&_code]:bg-slate-800 [&_code]:px-1 [&_code]:rounded [&_code]:text-violet-300">
      {children}
    </ReactMarkdown>
  );
}

// ── AI Insights panel (sub-component) ─────────────────────────────────────────
async function fetchScanData() {
  const symbols = DASHBOARD_ASSETS.map(a => a.symbol);
  let all = [];
  for (let i = 0; i < symbols.length; i += 30) {
    try {
      const res = await base44.functions.invoke('runScreener', { symbols: symbols.slice(i, i + 30) });
      all = [...all, ...(res.data?.results || [])];
    } catch (e) { console.error(e); }
  }
  return all.map(r => ({
    ...r,
    name: DASHBOARD_ASSET_MAP[r.symbol]?.name || r.symbol,
    index: DASHBOARD_ASSET_MAP[r.symbol]?.index || '',
  }));
}

function InsightsTab() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!hasRun.current) { hasRun.current = true; generate(); }
  }, []);

  const generate = async () => {
    setLoading(true);
    setInsights(null);
    setError(null);
    try {
      const results = await fetchScanData();
      const signalCounts = results.reduce((acc, r) => { acc[r.signal] = (acc[r.signal] || 0) + 1; return acc; }, {});
      const topBuys = results.filter(r => r.rsi != null && r.rsi <= 40).sort((a, b) => a.rsi - b.rsi).slice(0, 8)
        .map(r => `${r.symbol}(${r.index}): RSI=${r.rsi?.toFixed(0)}, EMA=${r.ema_signal}, MACD=${r.macd_signal}, chg=${r.change_pct?.toFixed(1)}%`);
      const topSells = results.filter(r => r.rsi != null && r.rsi >= 60).sort((a, b) => b.rsi - a.rsi).slice(0, 6)
        .map(r => `${r.symbol}(${r.index}): RSI=${r.rsi?.toFixed(0)}, chg=${r.change_pct?.toFixed(1)}%`);
      const cryptoBias = results.filter(r => r.index === 'CLARITY')
        .map(r => `${r.symbol}: RSI=${r.rsi?.toFixed(0)}, chg=${r.change_pct?.toFixed(1)}%`).join(' | ');

      const spaceBias = results.filter(r => r.index === 'Space')
        .map(r => `${r.symbol}: RSI=${r.rsi?.toFixed(0)}, chg=${r.change_pct?.toFixed(1)}%`).join(' | ');
      const nuclearBias = results.filter(r => r.index === 'Nuclear')
        .map(r => `${r.symbol}: RSI=${r.rsi?.toFixed(0)}, chg=${r.change_pct?.toFixed(1)}%`).join(' | ');

      const prompt = `You are an expert quantitative analyst. Analyze this live screener data across S&P 500, Nasdaq 100, Dow Jones, Space/Aerospace, Nuclear, and CLARITY Act crypto.

UNIVERSE: ${results.length} assets scanned
Signals: ${JSON.stringify(signalCounts)}
TOP OVERSOLD (RSI ≤40): ${topBuys.join(' | ') || 'none'}
TOP OVERBOUGHT (RSI ≥60): ${topSells.join(' | ') || 'none'}
CLARITY CRYPTO: ${cryptoBias || 'no data'}
SPACE/AEROSPACE (SPCX=SpaceX IPO June 2026 $2T+ market cap, RKLB, ASTS, UFO, ROKT, ITA, LMT, NOC, GD, GE, KTOS etc.): ${spaceBias || 'no data'}
NUCLEAR (CCJ, SMR, OKLO, CEG, VST, URNM): ${nuclearBias || 'no data'}

Provide exactly these 3 sections (markdown, concise, data-driven):

## Market Sentiment
2–3 sentences on overall market tone across equities, space/defense, nuclear, and crypto. Risk-on or risk-off? Any sector divergence?

## Trading Strategies
5–7 specific, actionable setups referencing symbols. Include at least 1 space/aerospace setup and 1 nuclear/energy setup if signals exist. Add entry logic and risk/reward context.

## Why These Signals
Explain the top 3 standout signals — what RSI, EMA, and MACD confluence is telling us across these sectors.`;

      const response = await base44.integrations.Core.InvokeLLM({ prompt, model: 'claude_sonnet_4_6' });
      const text = typeof response === 'string' ? response : JSON.stringify(response);
      setInsights({
        sentiment:  text.match(/## Market Sentiment\n([\s\S]*?)(?=## |$)/)?.[1]?.trim() || '',
        strategies: text.match(/## Trading Strategies\n([\s\S]*?)(?=## |$)/)?.[1]?.trim() || '',
        signals:    text.match(/## Why These Signals\n([\s\S]*?)(?=## |$)/)?.[1]?.trim() || '',
      });
    } catch (e) {
      setError('Failed to generate insights. Please retry.');
    }
    setLoading(false);
  };

  if (loading) return (
    <div className="space-y-3 p-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="border border-slate-800 rounded-xl overflow-hidden animate-pulse">
          <div className="h-10 bg-slate-800/60" />
          <div className="p-4 space-y-2">
            <div className="h-3 bg-slate-800 rounded w-3/4" />
            <div className="h-3 bg-slate-800 rounded w-full" />
            <div className="h-3 bg-slate-800 rounded w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );

  if (error) return (
    <div className="p-6 text-center">
      <p className="text-red-400 text-sm mb-3">{error}</p>
      <button onClick={generate} className="text-xs px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white">
        <RefreshCw className="w-3 h-3 inline mr-1" />Retry
      </button>
    </div>
  );

  const sections = [
    { key: 'sentiment',  icon: TrendingUp, title: 'Market Sentiment',   color: 'text-blue-400' },
    { key: 'strategies', icon: Lightbulb,  title: 'Trading Strategies', color: 'text-emerald-400' },
    { key: 'signals',    icon: BookOpen,   title: 'Why These Signals',  color: 'text-amber-400' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800">
        <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">S&P 500 · Nasdaq · Dow · CLARITY Crypto</span>
        <button onClick={generate} className="flex items-center gap-1 text-[10px] font-mono px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200">
          <RefreshCw className="w-3 h-3" />Refresh
        </button>
      </div>
      <div className="p-4 space-y-3">
        {sections.map(({ key, icon: Icon, title, color }) => insights?.[key] && (
          <div key={key} className="border border-slate-800 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/60">
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className={`text-[10px] font-mono uppercase tracking-widest ${color}`}>{title}</span>
            </div>
            <div className="px-4 py-3 bg-slate-900/20">
              <MDContent>{insights[key]}</MDContent>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── LMSR Agent chat (sub-component) ────────────────────────────────────────────
const QUICK_PROMPTS = [
  'Rank my open markets by edge',
  'Calculate optimal Kelly positions',
  'Which market has the highest expected value?',
  'Show LMSR cost to reach my belief prices',
];

function MessageBubble({ message }) {
  if (message.role === 'tool' || !message.content) return null;
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0 mt-0.5">
          <Calculator className="w-3 h-3 text-violet-400" />
        </div>
      )}
      <div className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${isUser ? 'bg-slate-700 text-slate-100' : 'bg-slate-900 border border-slate-800 text-slate-300'}`}>
        {isUser ? <span>{message.content}</span> : <MDContent>{message.content}</MDContent>}
      </div>
    </div>
  );
}

function LmsrTab() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const unsubRef = useRef(null);
  const startedRef = useRef(false);

  const { data: markets = [] } = useQuery({
    queryKey: ['markets'],
    queryFn: () => base44.entities.Market.list('-created_date', 50),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => unsubRef.current?.(), []);

  useEffect(() => {
    if (!startedRef.current) { startedRef.current = true; startConversation(); }
  }, [markets]);

  const startConversation = async () => {
    if (conversation) return conversation;
    const openMarkets = markets.filter(m => m.status !== 'closed');
    const ctx = openMarkets.map(m => {
      const outcomes = (m.outcomes || []).map(o =>
        `  • ${o.name}: market=${(o.market_price * 100).toFixed(1)}%${o.belief_price != null ? `, belief=${(o.belief_price * 100).toFixed(1)}%` : ''}`
      ).join('\n');
      return `Market: "${m.title}" (b=${m.liquidity_param || 100})\n${outcomes}`;
    }).join('\n\n');

    const conv = await base44.agents.createConversation({
      agent_name: 'lmsr_market_analyst',
      metadata: { name: `LMSR — ${new Date().toLocaleDateString()}` },
    });
    if (ctx) {
      await base44.agents.addMessage(conv, {
        role: 'user',
        content: `Here is my current market data:\n\n${ctx}\n\nKeep this in mind for all analysis.`,
      });
    }
    setConversation(conv);
    unsubRef.current = base44.agents.subscribeToConversation(conv.id, (data) => {
      setMessages(data.messages || []);
    });
    return conv;
  };

  const send = async (text) => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setInput('');
    const conv = conversation || await startConversation();
    await base44.agents.addMessage(conv, { role: 'user', content: text });
    setLoading(false);
  };

  const visibleMessages = messages.filter(m => {
    if (m.role === 'user' && m.content?.startsWith('Here is my current market data:')) return false;
    return true;
  });

  return (
    <div className="flex flex-col" style={{ height: '480px' }}>
      {visibleMessages.length === 0 && (
        <div className="p-4 border-b border-slate-800/60">
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((p, i) => (
              <button key={i} onClick={() => send(p)} className="text-[10px] font-mono px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all">
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {visibleMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-3">
              <Calculator className="w-6 h-6 text-violet-400" />
            </div>
            <p className="text-slate-400 text-sm font-semibold mb-1">LMSR Position Optimizer</p>
            <p className="text-slate-600 text-xs font-mono max-w-xs leading-relaxed">
              Calculate optimal Kelly positions, edge detection, and LMSR cost curves.
            </p>
          </div>
        )}
        {visibleMessages.map((m, i) => <MessageBubble key={i} message={m} />)}
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
              <Calculator className="w-3 h-3 text-violet-400" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 flex items-center gap-2">
              <Loader2 className="w-3 h-3 text-violet-400 animate-spin" />
              <span className="text-xs text-slate-500 font-mono">Calculating…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-slate-800 bg-slate-900/60">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
            placeholder="Kelly sizing, edge analysis, position optimization…"
            className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 font-mono"
          />
          <button onClick={() => send(input)} disabled={!input.trim() || loading}
            className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main hub ───────────────────────────────────────────────────────────────────
export default function MarketIntelHub() {
  const [tab, setTab] = useState('insights');

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex border-b border-slate-800 bg-slate-900/60">
        <button
          onClick={() => setTab('insights')}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'insights' ? 'border-purple-500 text-slate-100' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          AI Market Insights
        </button>
        <button
          onClick={() => setTab('lmsr')}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
            tab === 'lmsr' ? 'border-violet-500 text-slate-100' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <Calculator className="w-4 h-4 text-violet-400" />
          LMSR Analyst
          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400">AI Agent</span>
        </button>
      </div>

      {tab === 'insights' && <InsightsTab />}
      {tab === 'lmsr' && <LmsrTab />}
    </div>
  );
}