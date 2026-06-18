import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Bot, Loader2, Send, ChevronDown, ChevronUp, Calculator, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const QUICK_PROMPTS = [
  'Analyze all my open markets and rank opportunities by edge',
  'Calculate optimal Kelly positions for every market with a belief price set',
  'Which market has the highest expected value right now?',
  'Show me the LMSR cost to move each market to my belief price',
  'Suggest a diversified portfolio allocation across all open markets',
];

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  if (message.role === 'tool' || !message.content) return null;
  return (
    <div className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0 mt-0.5">
          <Calculator className="w-3 h-3 text-violet-400" />
        </div>
      )}
      <div className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
        isUser
          ? 'bg-slate-700 text-slate-100'
          : 'bg-slate-900 border border-slate-800 text-slate-300'
      }`}>
        {isUser ? (
          <span>{message.content}</span>
        ) : (
          <ReactMarkdown
            className="prose prose-sm prose-invert max-w-none [&_table]:text-[10px] [&_table]:w-full [&_th]:text-slate-400 [&_td]:text-slate-300 [&_tr]:border-b [&_tr]:border-slate-800 [&_p]:my-1 [&_ul]:pl-4 [&_li]:my-0.5 [&_strong]:text-slate-100 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-slate-200 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-slate-300 [&_code]:bg-slate-800 [&_code]:px-1 [&_code]:rounded [&_code]:text-violet-300"
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export default function LmsrAgentChat({ autoStart = false }) {
  const [open, setOpen] = useState(autoStart);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const unsubRef = useRef(null);
  const hasAutoStarted = useRef(false);

  const { data: markets = [] } = useQuery({
    queryKey: ['markets'],
    queryFn: () => base44.entities.Market.list('-created_date', 50),
  });

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup subscription
  useEffect(() => () => unsubRef.current?.(), []);

  // Auto-start: open and initialize conversation on load
  useEffect(() => {
    if (autoStart && markets.length >= 0 && !hasAutoStarted.current && !conversation) {
      hasAutoStarted.current = true;
      startConversation();
    }
  }, [autoStart, markets]);

  const startConversation = async () => {
    if (conversation) return conversation;
    const openMarkets = markets.filter(m => m.status !== 'closed');
    const ctx = openMarkets.map(m => {
      const outcomes = (m.outcomes || []).map(o =>
        `  • ${o.name}: market=${(o.market_price * 100).toFixed(1)}%${o.belief_price != null ? `, belief=${(o.belief_price * 100).toFixed(1)}%` : ''}`
      ).join('\n');
      return `Market: "${m.title}" (b=${m.liquidity_param || 100}, status=${m.status})\n${outcomes}`;
    }).join('\n\n');

    const conv = await base44.agents.createConversation({
      agent_name: 'lmsr_market_analyst',
      metadata: { name: `LMSR Analysis — ${new Date().toLocaleDateString()}` },
    });

    // Prime with market context
    if (ctx) {
      await base44.agents.addMessage(conv, {
        role: 'user',
        content: `Here is my current market data:\n\n${ctx}\n\nPlease keep this context in mind for all subsequent analysis.`,
      });
    }

    setConversation(conv);

    // Subscribe to updates
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

  const openMarketCount = markets.filter(m => m.status !== 'closed').length;
  const marketsWithEdge = markets.filter(m =>
    (m.outcomes || []).some(o => o.belief_price != null && Math.abs(o.belief_price - o.market_price) > 0.03)
  ).length;

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/60 hover:bg-slate-900/80 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Calculator className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-bold text-slate-100">LMSR Market Analyst</h2>
          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border bg-violet-500/10 border-violet-500/20 text-violet-400">
            AI Agent
          </span>
          <span className="text-[10px] text-slate-600 font-mono hidden sm:inline">· Kelly sizing · edge detection · position optimization</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {openMarketCount > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
              <span className="text-slate-300 font-bold">{openMarketCount}</span> markets
              {marketsWithEdge > 0 && (
                <>
                  <span className="text-slate-700">·</span>
                  <span className="text-emerald-400 font-bold">{marketsWithEdge}</span> with edge
                </>
              )}
            </div>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {open && (
        <div className="flex flex-col" style={{ height: '480px' }}>
          {/* Quick prompts */}
          {messages.length === 0 && (
            <div className="p-4 border-b border-slate-800/60">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Sparkles className="w-3 h-3 text-violet-400" />
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Quick Analysis</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((p, i) => (
                  <button key={i} onClick={() => send(p)}
                    className="text-[10px] font-mono px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all text-left">
                    {p}
                  </button>
                ))}
              </div>
              {openMarketCount === 0 && (
                <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-amber-500/70 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2">
                  <span>⚠</span> No open markets found. Add markets with belief prices to unlock LMSR analysis.
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-3">
                  <Calculator className="w-6 h-6 text-violet-400" />
                </div>
                <p className="text-slate-400 text-sm font-semibold mb-1">LMSR Position Optimizer</p>
                <p className="text-slate-600 text-xs font-mono max-w-xs leading-relaxed">
                  Ask me to calculate optimal positions, Kelly bet sizes, edge analysis, and LMSR cost curves across your prediction markets.
                </p>
              </div>
            )}
            {messages
              .filter(m => {
                // Hide the context-priming message
                if (m.role === 'user' && m.content?.startsWith('Here is my current market data:')) return false;
                return true;
              })
              .map((m, i) => <MessageBubble key={i} message={m} />)}
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

          {/* Input */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/60">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
                placeholder="Ask about LMSR pricing, Kelly sizing, edge analysis…"
                className="flex-1 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50 font-mono"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}