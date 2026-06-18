import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Bot, Loader2, RefreshCw, Zap, Lock, ChevronRight } from 'lucide-react';
import { LEVEL_DESCRIPTIONS, STRATEGY_LEVEL_REQUIREMENTS, canTradeStrategy } from '@/lib/optionsLevels';

const STRATEGY_LABELS = {
  buy_write: 'Buy-Write',
  collar: 'Collar',
  cash_secured_put: 'Cash-Secured Put',
  bull_call_spread: 'Bull Call Spread',
  bear_put_spread: 'Bear Put Spread',
  long_straddle: 'Long Straddle',
  iron_condor: 'Iron Condor',
};

const BIAS_COLORS = {
  bullish:  'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  bearish:  'text-red-400 border-red-500/30 bg-red-500/10',
  neutral:  'text-slate-400 border-slate-600 bg-slate-800/60',
  volatile: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
};

function SuggestionCard({ suggestion, userLevel, onApply }) {
  const allowed = canTradeStrategy(suggestion.strategy, userLevel);
  const reqLevel = STRATEGY_LEVEL_REQUIREMENTS[suggestion.strategy] ?? 1;

  return (
    <div className={`bg-slate-900/60 border rounded-xl p-4 flex flex-col gap-3 transition-all ${
      allowed
        ? 'border-slate-700/80 hover:border-indigo-500/40'
        : 'border-slate-800 opacity-60'
    }`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-base font-bold text-slate-100">{suggestion.symbol}</span>
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${BIAS_COLORS[suggestion.bias] || BIAS_COLORS.neutral}`}>
              {(suggestion.bias || 'neutral').toUpperCase()}
            </span>
            {!allowed && (
              <span className="flex items-center gap-0.5 text-[9px] font-mono text-slate-600">
                <Lock className="w-2.5 h-2.5" /> Lvl {reqLevel} required
              </span>
            )}
          </div>
          <div className="text-[10px] text-indigo-300 font-mono mt-0.5">
            {STRATEGY_LABELS[suggestion.strategy] || suggestion.strategy}
          </div>
        </div>
        <div className="text-right shrink-0">
          {suggestion.entry && (
            <div className="text-xs font-mono text-slate-300">Entry: <span className="font-bold text-slate-100">${suggestion.entry}</span></div>
          )}
          {suggestion.dte && (
            <div className="text-[10px] font-mono text-slate-500">{suggestion.dte}d DTE</div>
          )}
        </div>
      </div>

      {/* Rationale */}
      <p className="text-[11px] text-slate-500 leading-relaxed">{suggestion.rationale}</p>

      {/* Risk/reward row */}
      {(suggestion.target || suggestion.stop) && (
        <div className="flex gap-4 text-[10px] font-mono">
          {suggestion.target && (
            <span className="text-emerald-400">Target: ${suggestion.target}</span>
          )}
          {suggestion.stop && (
            <span className="text-red-400">Stop: ${suggestion.stop}</span>
          )}
        </div>
      )}

      {/* Apply button */}
      <button
        disabled={!allowed}
        onClick={() => onApply(suggestion)}
        className={`self-end flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
          allowed
            ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
        }`}
      >
        {allowed ? <ChevronRight className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
        {allowed ? 'Apply to Builder' : `Requires Level ${reqLevel}`}
      </button>
    </div>
  );
}

export default function AiOptionsSuggestions({ userLevel, onApplySuggestion }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [previewLevel, setPreviewLevel] = useState(userLevel ?? 0);

  const generate = async () => {
    setLoading(true);
    setSuggestions([]);
    try {
      const now = new Date();
      const dayName = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      const hour = now.getHours();
      const session = hour < 9.5 ? 'pre-market' : hour < 16 ? 'market hours' : 'after-hours';

      // Strategies available at the selected preview level
      const availableStrategies = Object.entries(STRATEGY_LEVEL_REQUIREMENTS)
        .filter(([, lvl]) => lvl <= previewLevel)
        .map(([id]) => STRATEGY_LABELS[id] || id)
        .join(', ');

      const result = await base44.integrations.Core.InvokeLLM({
        add_context_from_internet: true,
        model: 'gemini_3_flash',
        prompt: `You are an institutional options trading AI. Today is ${dayName}, session: ${session}.

The trader has OPTIONS LEVEL ${previewLevel} approval. Available strategies for this level: ${availableStrategies}.

Using today's live market news, overnight global moves, and current market conditions, generate exactly 4 specific options trade suggestions suited for an Options Level ${previewLevel} trader.

Each suggestion must:
- Use ONLY strategies from this list: ${availableStrategies}
- Cover diverse sectors/asset classes (mix stocks, ETFs)
- Be based on REAL current market conditions and news catalysts
- Include specific, realistic price levels

Return a JSON array of 4 suggestions. Each suggestion object must have:
- symbol (string): exact ticker e.g. "AAPL"
- strategy (string): one of the following IDs exactly: ${Object.entries(STRATEGY_LEVEL_REQUIREMENTS).filter(([,l])=>l<=previewLevel).map(([id])=>id).join(', ')}
- bias (string): one of "bullish", "bearish", "neutral", "volatile"
- entry (string): entry price or price zone e.g. "185.00" or "182-186"
- target (string): profit target price
- stop (string): stop loss price
- dte (number): days to expiration (e.g. 30)
- rationale (string): 2-3 sentences explaining the setup, the news catalyst, and why this strategy fits`,
        response_json_schema: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  symbol:    { type: 'string' },
                  strategy:  { type: 'string' },
                  bias:      { type: 'string' },
                  entry:     { type: 'string' },
                  target:    { type: 'string' },
                  stop:      { type: 'string' },
                  dte:       { type: 'number' },
                  rationale: { type: 'string' },
                }
              }
            }
          }
        }
      });

      setSuggestions(result?.suggestions || []);
      setGenerated(true);
    } catch (e) {
      console.error('AI suggestions error:', e);
    }
    setLoading(false);
  };

  return (
    <div className="bg-slate-900/40 border border-indigo-500/20 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/60 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-bold text-slate-200">AI Suggested Trades</span>
          <span className="text-[10px] text-slate-600 font-mono hidden sm:inline">· based on today's news & market conditions</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Level selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-slate-500">Preview Level:</span>
            <select
              value={previewLevel}
              onChange={e => setPreviewLevel(Number(e.target.value))}
              className="h-7 px-2 rounded-md bg-slate-800 border border-slate-700 text-indigo-300 text-xs font-mono"
            >
              {Object.entries(LEVEL_DESCRIPTIONS).map(([lvl, desc]) => (
                <option key={lvl} value={lvl}>
                  Level {lvl}{Number(lvl) === (userLevel ?? 0) ? ' (mine)' : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-mono hover:bg-indigo-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : generated ? <RefreshCw className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
            {loading ? 'Analyzing…' : generated ? 'Refresh' : 'Generate Suggestions'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {!generated && !loading && (
          <div className="text-center py-8">
            <Bot className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-semibold mb-1">AI-Powered Options Suggestions</p>
            <p className="text-slate-600 text-xs font-mono max-w-md mx-auto leading-relaxed mb-4">
              Fetches live market news and conditions to generate {Object.entries(STRATEGY_LEVEL_REQUIREMENTS).filter(([,l])=>l<=previewLevel).length} strategy-specific
              trade setups for your Level {previewLevel} approval. Click any card to auto-fill the builder below.
            </p>
            <button
              onClick={generate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors mx-auto"
            >
              <Zap className="w-4 h-4" />
              Generate Level {previewLevel} Suggestions
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="w-7 h-7 text-indigo-400 animate-spin mb-3" />
            <p className="text-slate-400 text-sm font-mono">Scanning live market conditions for Level {previewLevel} setups…</p>
          </div>
        )}

        {!loading && suggestions.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {suggestions.map((s, i) => (
                <SuggestionCard
                  key={i}
                  suggestion={s}
                  userLevel={userLevel ?? 0}
                  onApply={onApplySuggestion}
                />
              ))}
            </div>
            {previewLevel > (userLevel ?? 0) && (
              <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-amber-500/70 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2">
                <Lock className="w-3 h-3 shrink-0" />
                You're previewing Level {previewLevel} strategies. Your current approval is Level {userLevel ?? 0} — locked strategies cannot be applied.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}