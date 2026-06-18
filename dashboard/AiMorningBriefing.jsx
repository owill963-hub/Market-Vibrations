import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Bot, Loader2, RefreshCw, Target, Sunrise, TrendingUp, AlertTriangle,
  Newspaper, Globe, Zap, Eye, BarChart2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

function Section({ icon: Icon, color, title, children, wide = false }) {
  return (
    <div className={`bg-slate-900/60 border border-slate-800 rounded-xl p-4 ${wide ? 'sm:col-span-2' : ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className={`text-[10px] font-mono uppercase tracking-wider font-bold ${color}`}>{title}</span>
      </div>
      <div className="text-xs text-slate-400 leading-relaxed prose prose-sm prose-invert max-w-none [&_ul]:pl-4 [&_li]:my-0.5 [&_strong]:text-slate-200 [&_a]:text-indigo-400">
        {children}
      </div>
    </div>
  );
}

function isMarketOpen() {
  const now = new Date();
  const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const h = nyTime.getHours() + nyTime.getMinutes() / 60;
  const day = nyTime.getDay();
  return day >= 1 && day <= 5 && h >= 9.5 && h < 16;
}

export default function AiMorningBriefing() {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => base44.entities.WatchlistItem.list('-created_date', 200),
  });

  const marketOpen = isMarketOpen();

  const generateBriefing = async () => {
    setLoading(true);
    setBriefing(null);
    try {
      const now = new Date();
      const hour = now.getHours();
      const timeLabel = hour < 9.5 ? 'pre-market' : hour < 12 ? 'morning' : hour < 15 ? 'midday' : 'after-hours';
      const dayName = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

      // Build portfolio context
      const portfolioCtx = items
        .filter(i => i.current_price)
        .slice(0, 25)
        .map(i => [
          `${i.symbol}(${i.name}): $${i.current_price?.toFixed(2)}`,
          i.rsi != null ? `RSI=${i.rsi.toFixed(0)}(${i.rsi_signal || 'neutral'})` : '',
          i.ema_signal ? `EMA=${i.ema_signal}` : '',
          i.macd_signal ? `MACD=${i.macd_signal}` : '',
          i.belief_price ? `target=$${i.belief_price.toFixed(2)}` : '',
          i.edge_threshold ? `edge_thresh=${i.edge_threshold}%` : '',
        ].filter(Boolean).join(' | '))
        .join('\n');

      const hasPortfolio = items.filter(i => i.current_price).length > 0;

      const result = await base44.integrations.Core.InvokeLLM({
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        prompt: `You are an institutional trading desk AI, generating a comprehensive market briefing for ${dayName} at ${now.toLocaleTimeString('en-US', { timeZone: 'America/New_York' })} ET (${timeLabel}).

${hasPortfolio ? `USER'S WATCHLIST / PORTFOLIO:\n${portfolioCtx}` : 'User has no watchlist data yet.'}

Generate a DETAILED, NEWS-DRIVEN market briefing. For each section, use REAL current data you can find on the internet:

1. **news** — Yesterday's top 5–7 market-moving headlines from verified sources (Reuters, Bloomberg, WSJ, FT, CNBC, AP). Include the source name in parentheses. Cover: earnings, Fed/macro, geopolitical, sector-specific. Format as a markdown bullet list with **bold** ticker/topic followed by the headline and source.

2. **global** — Overnight global market moves: Europe (FTSE, DAX, CAC), Asia (Nikkei, Hang Seng, Shanghai), currencies (DXY, EUR/USD, USD/JPY), commodities (oil WTI, gold, bitcoin). Explain how each may affect US markets at open. Use actual % moves if available.

3. **strategies** — 4–6 concrete, actionable trade setups for TODAY across ALL asset classes (not just the user's watchlist). Include: the specific ticker, the strategy type (e.g. "Bull Call Spread," "Covered Call," "Momentum long," "Short squeeze fade"), entry price/zone, target, stop, and 1-sentence rationale. Mix stocks, ETFs, and at least 1 options strategy.

4. **risks** — 3–4 specific risk factors to watch today: macro events (Fed speakers, economic data releases with times ET), sector risks, technical levels to watch (support/resistance), and any geopolitical or earnings landmines.

5. **portfolio_watch** — ${hasPortfolio ? `Based ONLY on the user's actual watchlist above, give a concise summary of: which holdings have the strongest signals today, any approaching key levels, options opportunities on their specific holdings, and what to monitor during ${marketOpen ? 'today\'s session' : 'the next session'}. Be specific with prices from their data.` : 'User has no watchlist yet. Suggest 3 high-conviction assets to add to a watchlist based on today\'s market conditions.'}

Be specific, data-driven, and actionable. Use real prices and dates. Format each section in clean markdown with bullet points.`,
        response_json_schema: {
          type: 'object',
          properties: {
            news: { type: 'string' },
            global: { type: 'string' },
            strategies: { type: 'string' },
            risks: { type: 'string' },
            portfolio_watch: { type: 'string' },
          }
        }
      });

      setBriefing(result);
      setGenerated(true);
    } catch (e) {
      console.error('Briefing error:', e);
    }
    setLoading(false);
  };

  const now = new Date();
  const hour = now.getHours();
  const sessionLabel = hour < 9.5 ? 'Pre-Market' : hour < 16 ? 'Market Hours' : 'After-Hours';

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-2 flex-wrap">
          <Bot className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-100">AI Market Insights</h2>
          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
            hour < 9.5
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              : hour < 16
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {sessionLabel}
          </span>
          <span className="text-[9px] text-slate-600 font-mono hidden sm:inline">· news + global markets + trade setups · powered by live web search</span>
        </div>
        <button
          onClick={generateBriefing}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-mono hover:bg-indigo-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : generated
            ? <RefreshCw className="w-3.5 h-3.5" />
            : <Sunrise className="w-3.5 h-3.5" />
          }
          {loading ? 'Analyzing…' : generated ? 'Refresh' : 'Generate Briefing'}
        </button>
      </div>

      {/* Body */}
      <div className="p-5">
        {!generated && !loading && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
              <Bot className="w-7 h-7 text-indigo-400" />
            </div>
            <h3 className="text-slate-300 font-semibold mb-1">Comprehensive AI Market Briefing</h3>
            <p className="text-slate-500 text-xs font-mono max-w-md mb-2 leading-relaxed">
              Pulls <strong className="text-slate-400">live news</strong> from verified sources, overnight <strong className="text-slate-400">global market moves</strong>, 
              actionable <strong className="text-slate-400">trade & options setups</strong> across all assets, key <strong className="text-slate-400">risk factors</strong>, 
              and a <strong className="text-slate-400">portfolio watch</strong> summary.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-5 text-[9px] font-mono text-slate-600">
              {['Reuters · Bloomberg · WSJ', 'Europe · Asia · FX · Commodities', 'Stocks · ETFs · Options', 'Your Portfolio Summary'].map(t => (
                <span key={t} className="px-2 py-1 rounded border border-slate-800 bg-slate-900">{t}</span>
              ))}
            </div>
            <button
              onClick={generateBriefing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
            >
              <Sunrise className="w-4 h-4" />
              Generate {sessionLabel} Briefing
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-14">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
            <p className="text-slate-400 text-sm font-mono">Fetching live news & global market data…</p>
            <p className="text-slate-600 text-xs font-mono mt-1">Analyzing Reuters, Bloomberg, overnight markets, and trade setups</p>
          </div>
        )}

        {briefing && !loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Row 1: News (wide) */}
            <Section icon={Newspaper} color="text-sky-400" title="Yesterday's Key News — Verified Sources" wide>
              <ReactMarkdown>{briefing.news}</ReactMarkdown>
            </Section>

            {/* Row 2: Global markets */}
            <Section icon={Globe} color="text-cyan-400" title="Global Markets & Overnight Impact">
              <ReactMarkdown>{briefing.global}</ReactMarkdown>
            </Section>

            {/* Row 2: Risk factors */}
            <Section icon={AlertTriangle} color="text-amber-400" title="Risk Factors & Levels to Watch">
              <ReactMarkdown>{briefing.risks}</ReactMarkdown>
            </Section>

            {/* Row 3: Trade strategies (wide) */}
            <Section icon={Zap} color="text-emerald-400" title="Today's Trade & Options Setups — All Assets" wide>
              <ReactMarkdown>{briefing.strategies}</ReactMarkdown>
            </Section>

            {/* Row 4: Portfolio watch (wide) */}
            <Section icon={Eye} color="text-indigo-400" title={`Portfolio Watch — ${marketOpen ? 'Today\'s Session' : 'Next Session'}`} wide>
              <ReactMarkdown>{briefing.portfolio_watch}</ReactMarkdown>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}