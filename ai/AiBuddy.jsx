import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Send, Bot, Loader2, ChevronDown, Sparkles, TrendingUp, BarChart2, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SYSTEM_PROMPT = `You are an elite AI investment advisor — a CFP, CFA, and quantitative analyst rolled into one. You have deep expertise in:
- LMSR (Logarithmic Market Scoring Rule) prediction markets: cost functions, edge calculation, Kelly criterion, belief pricing
- Technical analysis: RSI, MACD, EMA, ATR, confluence scoring, DCA zones, stop-losses, risk:reward ratios
- Fundamental & macro analysis: sector rotation, market cycles, risk management
- Options, equities, crypto, ETFs

You are direct, precise, and data-driven. You reference specific numbers from the user's live data when relevant.
You never give generic advice — always tie recommendations to the actual data provided.
Format responses with markdown: use **bold** for key numbers/signals, bullet points for clarity, and be concise.`;

const QUICK_PROMPTS = [
  { label: 'Top opportunities', prompt: 'Based on the current screener data, what are the top 3 trade setups right now? Give specific entry, stop, and target.' },
  { label: 'LMSR edge analysis', prompt: 'Analyze my LMSR belief markets — which ones have the best edge vs the market price? Recommend sizing using Kelly.' },
  { label: 'Risk overview', prompt: 'Give me a portfolio risk overview based on the current technical signals. What sectors are overextended? Where should I reduce exposure?' },
  { label: 'DCA strategy', prompt: 'Which assets currently have the best DCA setups? Show me confluence + risk:reward ranked.' },
];

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
        isUser
          ? 'bg-slate-700 text-slate-100 rounded-tr-sm'
          : 'bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-tl-sm'
      }`}>
        {isUser ? (
          <p className="text-sm">{msg.content}</p>
        ) : (
          <ReactMarkdown
            className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5 [&_strong]:text-slate-100"
          >
            {msg.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export default function AiBuddy({ screenerResults = [], markets = [] }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hey! I'm your AI investment advisor 🎯\n\nI have live access to your screener data, LMSR markets, and technical signals. Ask me anything — trade setups, risk analysis, DCA strategies, or LMSR edge calculations."
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages]);

  const buildContext = () => {
    // Top screener signals
    const topSignals = screenerResults
      .filter(r => ['STRONG_BUY', 'BUY', 'STRONG_SELL', 'SELL'].includes(r.signal))
      .sort((a, b) => (b.confluence ?? 0) - (a.confluence ?? 0))
      .slice(0, 15)
      .map(r => `${r.symbol}: signal=${r.signal}, price=$${r.price?.toFixed(2)}, RSI=${r.rsi?.toFixed(0)}, confluence=${r.confluence}/3, R:R=1:${r.rr}, change=${r.change_pct?.toFixed(1)}%`)
      .join('\n');

    // LMSR markets
    const lmsrContext = markets.map(m => {
      const outcomes = (m.outcomes || []).map(o => {
        const ev = ((o.belief_price - o.market_price) * 100).toFixed(1);
        return `  - ${o.name}: market=${(o.market_price * 100).toFixed(1)}¢, belief=${(o.belief_price * 100).toFixed(1)}¢, edge=${ev}¢`;
      }).join('\n');
      return `Market: "${m.title}"\n${outcomes}`;
    }).join('\n\n');

    return [
      screenerResults.length > 0 ? `=== LIVE SCREENER DATA (${screenerResults.length} assets scanned) ===\nTop signals:\n${topSignals}` : '',
      markets.length > 0 ? `=== LMSR BELIEF MARKETS ===\n${lmsrContext}` : '',
    ].filter(Boolean).join('\n\n');
  };

  const send = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput('');

    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    const context = buildContext();
    const conversationHistory = newMessages.map(m => `${m.role === 'user' ? 'User' : 'Advisor'}: ${m.content}`).join('\n\n');

    const prompt = `${SYSTEM_PROMPT}

${context ? `LIVE PORTFOLIO DATA:\n${context}\n\n` : ''}CONVERSATION:
${conversationHistory}

Advisor:`;

    const reply = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
    });

    setMessages(prev => [...prev, { role: 'assistant', content: typeof reply === 'string' ? reply : JSON.stringify(reply) }]);
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-200 ${
          open
            ? 'bg-slate-800 border border-slate-700'
            : 'bg-gradient-to-br from-purple-600 to-blue-600 hover:scale-105'
        }`}
      >
        {open ? <X className="w-5 h-5 text-slate-300" /> : <Sparkles className="w-6 h-6 text-white" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] max-w-[420px] h-[520px] sm:h-[600px] max-h-[calc(100vh-6rem)] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-3 shrink-0 bg-gradient-to-r from-slate-900 to-slate-900/95">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-100">AI Advisor</div>
              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                {screenerResults.length > 0 ? `${screenerResults.length} assets · ${markets.length} markets loaded` : 'Ready'}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-[10px] font-mono text-slate-600">
              <TrendingUp className="w-3 h-3" />
              <BarChart2 className="w-3 h-3" />
              <Zap className="w-3 h-3" />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
            {loading && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                  <span className="text-xs text-slate-500 font-mono">Analysing live data…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto shrink-0">
            {QUICK_PROMPTS.map((q, i) => (
              <button
                key={i}
                onClick={() => send(q.prompt)}
                disabled={loading}
                className="shrink-0 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[10px] text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap font-mono"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-3 pb-3 shrink-0">
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 focus-within:border-purple-500/50 transition-colors">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about trades, LMSR edge, risk…"
                className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none"
                disabled={loading}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="w-7 h-7 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}