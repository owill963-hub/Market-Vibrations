import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/layout/PageShell';
import ReactMarkdown from 'react-markdown';
import {
  Newspaper, Send, Loader2, Sparkles, RefreshCw, Globe,
  TrendingUp, Zap, MessageSquare, Calendar
} from 'lucide-react';
import DateSessionClock from '@/components/marketintel/DateSessionClock';
import EconomicEarningsCalendar from '@/components/marketintel/EconomicEarningsCalendar';

// ── Shared message bubble ────────────────────────────────────────────────────
function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  if (message.role === 'tool' || !message.content) return null;
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
        </div>
      )}
      <div className={`max-w-[90%] rounded-xl px-4 py-3 text-xs leading-relaxed ${
        isUser
          ? 'bg-slate-700 text-slate-100'
          : 'bg-slate-900 border border-slate-800 text-slate-300'
      }`}>
        {isUser ? (
          <span>{message.content}</span>
        ) : (
          <ReactMarkdown className="prose prose-sm prose-invert max-w-none [&_table]:text-[10px] [&_table]:w-full [&_th]:text-slate-400 [&_th]:font-semibold [&_td]:text-slate-300 [&_tr]:border-b [&_tr]:border-slate-800/60 [&_p]:my-1.5 [&_ul]:pl-4 [&_li]:my-0.5 [&_strong]:text-slate-100 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-slate-100 [&_h2]:mt-4 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-slate-300 [&_h3]:mt-2 [&_code]:bg-slate-800 [&_code]:px-1 [&_code]:rounded [&_code]:text-emerald-300 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-700 [&_blockquote]:pl-3 [&_blockquote]:text-slate-400 [&_hr]:border-slate-800">
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

// ── Intel Brief Tab ──────────────────────────────────────────────────────────
const BRIEF_SECTIONS = [
  { id: 'overnight', icon: '🌍', label: 'Overnight / Geo' },
  { id: 'htf', icon: '📈', label: 'HTF Trend (D/4H)' },
  { id: 'ttf', icon: '🕐', label: 'TTF Entries (1H/15M)' },
  { id: 'ltf', icon: '🔬', label: 'LTF Fine-Tune (5M)' },
  { id: 'confluence', icon: '🔀', label: 'Confluence & Bias' },
  { id: 'ifthen', icon: '📋', label: 'If/Then Plan' },
  { id: 'risks', icon: '⚠️', label: 'Top Risks' },
];

function IntelBriefTab() {
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const bottomRef = useRef(null);
  const unsubRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => unsubRef.current?.(), []);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York'
  });

  const BRIEF_PROMPT = `Today is ${today} (New York time).

Generate a complete Daily Price Action Intel Brief for a professional trader. Focus entirely on price action and structure — do NOT include economic calendar tables or earnings calendar lists. Instead, note only the upcoming macro events that have a direct, meaningful impact on price action (e.g. "CPI tomorrow — expect compression today, gap risk overnight"). Structure your response exactly as follows:

---

## 🌍 Overnight Context & Macro Impact on Price
Briefly summarize overnight Asia/Europe sessions and any breaking macro news (geopolitical, Fed speakers, oil/gold/crypto). For each item, explain the DIRECT PRICE ACTION IMPLICATION — what gap risk, compression, or momentum it creates for US open.

---

## 📈 Higher Timeframe Analysis — Daily & 4H (Trend Definition)
For SPY, QQQ, IWM (and BTC if relevant):
- **Daily trend**: Identify the primary trend (uptrend/downtrend/range). Name the key swing highs/lows, HTF order blocks, fair value gaps (FVGs), and weekly/monthly open levels with exact price levels.
- **4H structure**: Identify the intermediate trend direction. Note any 4H BOS (break of structure), 4H OBs, 4H FVGs, and POIs (points of interest) that are currently in play or within reach.
- **HTF Bias**: State clearly — BULLISH / BEARISH / RANGING and at what price levels the bias flips.

---

## 🕐 Trading Timeframe — 1H & 15M (Entry Framework)
For each major index above:
- **1H structure**: Current trend, 1H BOS levels, 1H order blocks, 1H FVGs to be filled. Which direction is the 1H path of least resistance?
- **15M entry zones**: Specific price levels where a trader should be looking to enter. Note the setup type (e.g. 15M OB + FVG confluence, liquidity sweep into daily level, VWAP reclaim).
- **Entry criteria**: What confirmation is needed on 15M before entering? (e.g. 15M candle close above OB, sweep + reversal candle, MACD cross)

---

## 🔬 Lower Timeframe — 5M (Entry Fine-Tuning, Optional)
For the highest-conviction trade setup of the day:
- Describe how to use the 5M chart to fine-tune the entry identified on 15M.
- Note 5M entry trigger (e.g. 5M BOS after sweep, first pullback after 5M reclaim, 5M FVG fill).
- Define exact entry price area, stop placement (below/above the swept liquidity or OB), and initial target (first 15M FVG or HTF level).

---

## 🔀 Confluence & Directional Bias
- Overall bias for today's session: BULLISH / BEARISH / NEUTRAL
- List the top 3 confluences supporting this bias (specific price levels + why)
- Note any conflicting signals that reduce conviction

---

## 📋 If/Then Conditional Trade Plan
Provide 3–5 specific scenarios:
**IF** [price action trigger at specific level] **THEN** [entry direction, target, stop]
Both long and short scenarios. Include invalidation levels.

---

## ⚠️ Top Risks to the Bias
3 tail risks that could invalidate the directional read today.

---

Be specific with price levels. Cite the current approximate prices for SPY, QQQ, IWM. This is for an ICT/SMC-aware professional trader.`;

  const generate = async () => {
    if (loading) return;
    setLoading(true);

    // Fresh conversation each time
    unsubRef.current?.();
    const newConv = await base44.agents.createConversation({
      agent_name: 'market_news_analyst',
      metadata: { name: `Intel Brief — ${today}` },
    });
    setConv(newConv);
    setMessages([]);
    setGenerated(true);

    unsubRef.current = base44.agents.subscribeToConversation(newConv.id, (data) => {
      setMessages(data.messages || []);
    });

    await base44.agents.addMessage(newConv, { role: 'user', content: BRIEF_PROMPT });
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Date & Session Clock */}
      <DateSessionClock />

      {/* Economic & Earnings Calendar */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-slate-200">Economic & Earnings Calendar</h3>
        </div>
        <EconomicEarningsCalendar />
      </div>

      {/* Content */}
      <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!generated && (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                <Zap className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-slate-200 text-base font-bold mb-2">Daily Intel Brief</p>
              <p className="text-slate-500 text-xs font-mono max-w-md leading-relaxed mb-2">
                One click generates a full ICT/SMC price action brief — HTF trend definition (Daily/4H), trading timeframe entries (1H/15M), LTF fine-tuning (5M), confluence analysis, and a specific If/Then trade plan.
              </p>
              <p className="text-slate-600 text-[10px] font-mono mb-6">Today: {today}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-xl w-full mb-8">
                {BRIEF_SECTIONS.map(s => (
                  <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/40 text-slate-500 text-[10px] font-mono">
                    <span>{s.icon}</span><span>{s.label}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={generate}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors"
              >
                <Zap className="w-4 h-4" /> Generate Today's Intel Brief
              </button>
            </div>
          )}

          {loading && messages.length === 0 && (
            <div className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
                <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                <div>
                  <p className="text-xs text-slate-300 font-semibold">Building your Intel Brief…</p>
                  <p className="text-[10px] text-slate-600 font-mono mt-0.5">Analyzing HTF structure · 4H/1H entries · 5M fine-tune · overnight context</p>
                </div>
              </div>
            </div>
          )}

          {messages.filter(m => m.content && m.role !== 'tool' && m.role !== 'user').map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}

          {loading && messages.length > 0 && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <span className="text-xs text-slate-500 font-mono">Continuing analysis…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}

// ── Research Chat Tab ────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  "What are the top 5 market-moving stories right now?",
  "Summarize today's macro events: Fed signals, inflation data, jobs market",
  "Which sectors are showing unusual strength or weakness this week?",
  "What's happening in crypto markets? Major catalysts?",
  "Analyze commodity markets: oil, gold, copper — what's driving moves?",
  "What are the biggest earnings surprises or warnings this week?",
  "Identify 3 international market opportunities outside the US",
  "What geopolitical risks should traders be watching right now?",
];

const SOURCES = ['Reuters', 'Bloomberg', 'FT', 'WSJ', 'CNBC', 'Seeking Alpha', 'Yahoo Finance', 'Barron\'s'];

function ResearchChatTab() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const bottomRef = useRef(null);
  const unsubRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => unsubRef.current?.(), []);

  const startConversation = async () => {
    if (conversation) return conversation;
    setInitializing(true);
    const conv = await base44.agents.createConversation({
      agent_name: 'market_news_analyst',
      metadata: { name: `Research Chat — ${new Date().toLocaleDateString()}` },
    });
    setConversation(conv);
    unsubRef.current = base44.agents.subscribeToConversation(conv.id, (data) => {
      setMessages(data.messages || []);
    });
    setInitializing(false);
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

  const newSession = () => {
    unsubRef.current?.();
    setConversation(null);
    setMessages([]);
    setInput('');
  };

  const visibleMessages = messages.filter(m => m.content && m.role !== 'tool');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
          {SOURCES.map(s => (
            <span key={s} className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-500">{s}</span>
          ))}
        </div>
        {conversation && (
          <button onClick={newSession} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-mono transition-colors ml-auto">
            <RefreshCw className="w-3 h-3" /> New Session
          </button>
        )}
      </div>

      <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {visibleMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                <TrendingUp className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="text-slate-300 text-sm font-semibold mb-1">Global Market Research</p>
              <p className="text-slate-600 text-xs font-mono max-w-sm leading-relaxed mb-6">
                Ask about any market, asset, sector, or macro event. Cross-referenced across Reuters, Bloomberg, FT, WSJ, CNBC, and more.
              </p>
              <div className="flex items-center gap-1.5 mb-3">
                <Sparkles className="w-3 h-3 text-slate-600" />
                <span className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">Quick Analysis</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl w-full">
                {QUICK_PROMPTS.map((p, i) => (
                  <button key={i} onClick={() => send(p)} disabled={loading || initializing}
                    className="text-left text-[10px] font-mono px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all disabled:opacity-40">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {visibleMessages.map((m, i) => <MessageBubble key={i} message={m} />)}

          {(loading || initializing) && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />
                <span className="text-xs text-slate-500 font-mono">{initializing ? 'Initializing…' : 'Researching sources…'}</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900/60">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
              placeholder="Ask about any market, sector, asset, or macro event…"
              className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 font-mono"
            />
            <button onClick={() => send(input)} disabled={!input.trim() || loading || initializing}
              className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'brief', icon: Zap, label: 'Intel Brief', desc: 'Full daily briefing' },
  { id: 'research', icon: MessageSquare, label: 'Research Chat', desc: 'Ask anything' },
];

export default function MarketIntel() {
  const [activeTab, setActiveTab] = useState('brief');

  return (
    <PageShell glowLeft="bg-emerald-600/5" glowRight="bg-blue-600/4">
      <div className="flex flex-col h-[calc(100vh-6rem)]">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
            <Newspaper className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100">Market Intelligence</h1>
            <p className="text-[10px] text-slate-500 font-mono">HTF trend · TTF entries · LTF fine-tune · confluence · If/Then plans</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 shrink-0 bg-slate-900/60 border border-slate-800 rounded-xl p-1 w-fit">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  active
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {active && <span className="text-[9px] font-mono opacity-70 hidden sm:inline">— {tab.desc}</span>}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0">
          {activeTab === 'brief' ? <IntelBriefTab /> : <ResearchChatTab />}
        </div>

      </div>
    </PageShell>
  );
}