import React, { useState, useMemo } from 'react';
import PageShell from '@/components/layout/PageShell';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SCREENER_ASSETS } from '@/lib/screenerAssets';
import { canTradeStrategy, LEVEL_DESCRIPTIONS, STRATEGY_LEVEL_REQUIREMENTS } from '@/lib/optionsLevels';
import { Search, Bot, Loader2, FlaskConical, ChevronDown, ChevronUp, Info, ShoppingCart, CheckCircle2, BookOpen, Lock, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import SymbolQuoteBar from '@/components/options/SymbolQuoteBar';
import PayoffDiagram from '@/components/options/PayoffDiagram';
import GreeksPanel from '@/components/options/GreeksPanel';
import ActiveStrategies from '@/components/options/ActiveStrategies';
import SchwabOptionsChain from '@/components/options/SchwabOptionsChain';
import TradeBuilder from '@/components/options/TradeBuilder';
import OrderTicket from '@/components/options/OrderTicket';
import AiOptionsSuggestions from '@/components/options/AiOptionsSuggestions';

const STRATEGIES = [
  { id: 'buy_write',         label: 'Buy-Write',          bias: 'neutral',  desc: 'Buy 100 shares and simultaneously sell a covered call against them. You collect premium income upfront and cap your upside at the strike price. Ideal for generating yield on a stock you want to own.' },
  { id: 'collar',            label: 'Collar',             bias: 'neutral',  desc: 'Own 100 shares, sell a covered call above the current price, and buy a protective put below it. The call premium offsets the put cost. Limits both upside and downside — a conservative hedging strategy.' },
  { id: 'cash_secured_put',  label: 'Cash-Secured Equity Put', bias: 'bullish',  desc: 'Sell a put option and hold enough cash to buy the shares if assigned. Great for acquiring a stock you like at a discount while collecting premium income while you wait.' },
  { id: 'bull_call_spread',  label: 'Bull Call Spread',   bias: 'bullish',  desc: 'Buy a lower-strike call, sell a higher-strike call. You profit if the stock rises moderately. Your loss is limited to the net premium you paid.' },
  { id: 'bear_put_spread',   label: 'Bear Put Spread',    bias: 'bearish',  desc: 'Buy a higher-strike put, sell a lower-strike put. You profit if the stock falls. Loss is capped at the net debit paid.' },
  { id: 'iron_condor',       label: 'Iron Condor',        bias: 'neutral',  desc: 'Sell a put spread and a call spread simultaneously. Profits when the stock stays in a range. Best in low-volatility environments.' },
  { id: 'long_straddle',     label: 'Long Straddle',      bias: 'volatile', desc: 'Buy both a call and a put at the same strike. Profits if the stock makes a big move in either direction — perfect around earnings.' },
];

const DTE_OPTIONS = [4, 11, 18, 25, 32, 39];

function buildSetup({ asset, strategy, dte, strikeOffset, positionSize }) {
  const price = asset.current_price || 100;
  const s = STRATEGIES.find(s => s.id === strategy);
  const offset = strikeOffset / 100;
  let legs = [], maxProfit = 0, maxLoss = 0, breakeven = [];

  if (strategy === 'buy_write') {
    const sellStrike = Math.round(price * (1 + offset) / 0.5) * 0.5;
    const premium = parseFloat((price * 0.015).toFixed(2));
    legs = [
      { type: 'Buy',  contract: 'Stock', strike: price,      premium: price },
      { type: 'Sell', contract: 'Call',  strike: sellStrike, premium },
    ];
    maxProfit = (sellStrike - price + premium) * 100;
    maxLoss   = (price - premium) * 100;
    breakeven = [price - premium];
  } else if (strategy === 'collar') {
    const sellStrike = Math.round(price * (1 + offset) / 0.5) * 0.5;
    const buyStrike  = Math.round(price * (1 - offset) / 0.5) * 0.5;
    const callPremium = parseFloat((price * 0.015).toFixed(2));
    const putPremium  = parseFloat((price * 0.012).toFixed(2));
    const netCost = putPremium - callPremium;
    legs = [
      { type: 'Buy',  contract: 'Stock', strike: price,      premium: price },
      { type: 'Sell', contract: 'Call',  strike: sellStrike, premium: callPremium },
      { type: 'Buy',  contract: 'Put',   strike: buyStrike,  premium: putPremium },
    ];
    maxProfit = (sellStrike - price - netCost) * 100;
    maxLoss   = (price - buyStrike + netCost) * 100;
    breakeven = [price + netCost];
  } else if (strategy === 'bull_call_spread') {
    const buyStrike = Math.round(price * (1 - offset) / 0.5) * 0.5;
    const sellStrike = Math.round(price * (1 + offset) / 0.5) * 0.5;
    const premium = parseFloat((price * 0.02).toFixed(2));
    legs = [
      { type: 'Buy',  contract: 'Call', strike: buyStrike,  premium },
      { type: 'Sell', contract: 'Call', strike: sellStrike, premium: parseFloat((premium * 0.6).toFixed(2)) },
    ];
    const net = legs[0].premium - legs[1].premium;
    maxLoss = net * 100; maxProfit = (sellStrike - buyStrike - net) * 100;
    breakeven = [buyStrike + net];
  } else if (strategy === 'bear_put_spread') {
    const buyStrike = Math.round(price * (1 + offset) / 0.5) * 0.5;
    const sellStrike = Math.round(price * (1 - offset) / 0.5) * 0.5;
    const premium = parseFloat((price * 0.02).toFixed(2));
    legs = [
      { type: 'Buy',  contract: 'Put', strike: buyStrike,  premium },
      { type: 'Sell', contract: 'Put', strike: sellStrike, premium: parseFloat((premium * 0.6).toFixed(2)) },
    ];
    const net = legs[0].premium - legs[1].premium;
    maxLoss = net * 100; maxProfit = (buyStrike - sellStrike - net) * 100;
    breakeven = [buyStrike - net];
  } else if (strategy === 'covered_call') {
    const sellStrike = Math.round(price * (1 + offset) / 0.5) * 0.5;
    const premium = parseFloat((price * 0.015).toFixed(2));
    legs = [{ type: 'Sell', contract: 'Call', strike: sellStrike, premium }];
    maxProfit = (sellStrike - price + premium) * 100; maxLoss = (price - premium) * 100;
    breakeven = [price - premium];
  } else if (strategy === 'cash_secured_put') {
    const sellStrike = Math.round(price * (1 - offset) / 0.5) * 0.5;
    const premium = parseFloat((price * 0.015).toFixed(2));
    legs = [{ type: 'Sell', contract: 'Put', strike: sellStrike, premium }];
    maxProfit = premium * 100; maxLoss = (sellStrike - premium) * 100;
    breakeven = [sellStrike - premium];
  } else if (strategy === 'iron_condor') {
    const p1 = Math.round(price * 0.90 / 0.5) * 0.5;
    const p2 = Math.round(price * 0.95 / 0.5) * 0.5;
    const c1 = Math.round(price * 1.05 / 0.5) * 0.5;
    const c2 = Math.round(price * 1.10 / 0.5) * 0.5;
    const premium = parseFloat((price * 0.012).toFixed(2));
    legs = [
      { type: 'Buy',  contract: 'Put',  strike: p1, premium: parseFloat((premium * 0.5).toFixed(2)) },
      { type: 'Sell', contract: 'Put',  strike: p2, premium },
      { type: 'Sell', contract: 'Call', strike: c1, premium },
      { type: 'Buy',  contract: 'Call', strike: c2, premium: parseFloat((premium * 0.5).toFixed(2)) },
    ];
    const netCredit = legs[1].premium + legs[2].premium - legs[0].premium - legs[3].premium;
    maxProfit = netCredit * 100; maxLoss = ((p2 - p1) - netCredit) * 100;
    breakeven = [p2 - netCredit, c1 + netCredit];
  } else if (strategy === 'long_straddle') {
    const strike = Math.round(price / 0.5) * 0.5;
    const premium = parseFloat((price * 0.03).toFixed(2));
    legs = [
      { type: 'Buy', contract: 'Call', strike, premium },
      { type: 'Buy', contract: 'Put',  strike, premium },
    ];
    const totalPremium = premium * 2;
    maxProfit = Infinity; maxLoss = totalPremium * 100;
    breakeven = [strike - totalPremium, strike + totalPremium];
  }

  return { asset, strategy: s, dte, legs, maxProfit, maxLoss, breakeven, currentPrice: price, positionSize };
}

export default function Options() {
  const [symbolQuery, setSymbolQuery]     = useState('');
  const [showDrop, setShowDrop]           = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [strategy, setStrategy]           = useState('buy_write');
  const [dte, setDte]                     = useState(30);
  const [strikeOffset, setStrikeOffset]   = useState(5);
  const [positionSize, setPositionSize]   = useState(1000);
  const [orderType, setOrderType]         = useState('limit');
  const [quantity, setQuantity]           = useState(1);

  const [builderOpen, setBuilderOpen]     = useState(true);
  const [chainOpen, setChainOpen]         = useState(true);
  const [reviewOpen, setReviewOpen]       = useState(false);
  const [orderPlaced, setOrderPlaced]     = useState(false);
  const [savedTab, setSavedTab]           = useState(false);

  const [aiPicking, setAiPicking]         = useState(false);
  const [aiRationale, setAiRationale]     = useState('');
  const [setup, setSetup]                 = useState(null);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const userLevel = user?.options_level ?? 0;

  const { data: watchlistItems = [] } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => base44.entities.WatchlistItem.list('-created_date', 200),
  });

  const saveMutation = useMutation({
    mutationFn: (s) => base44.entities.OptionStrategy.create({
      symbol: s.asset.symbol,
      strategy_name: s.strategy.label,
      dte: s.dte,
      max_profit: isFinite(s.maxProfit) ? s.maxProfit : 9999999,
      max_loss: s.maxLoss,
      breakeven: s.breakeven,
      legs: s.legs,
      status: 'open',
    }),
    onMutate: async (s) => {
      await queryClient.cancelQueries({ queryKey: ['option-strategies'] });
      const previous = queryClient.getQueryData(['option-strategies']);
      // Optimistically add a placeholder entry
      const optimistic = {
        id: `optimistic-${Date.now()}`,
        symbol: s.asset.symbol,
        strategy_name: s.strategy.label,
        dte: s.dte,
        max_profit: isFinite(s.maxProfit) ? s.maxProfit : 9999999,
        max_loss: s.maxLoss,
        breakeven: s.breakeven,
        legs: s.legs,
        status: 'open',
      };
      queryClient.setQueryData(['option-strategies'], (old = []) => [optimistic, ...old]);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['option-strategies'], ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['option-strategies'] }),
  });

  const watchlistMap = useMemo(() => {
    const map = {};
    for (const i of watchlistItems) {
      map[i.symbol] = {
        current_price: i.current_price,
        rsi: i.rsi,
        signal: i.rsi_signal === 'oversold' ? 'BUY' : i.rsi_signal === 'overbought' ? 'SELL' : 'NEUTRAL',
      };
    }
    return map;
  }, [watchlistItems]);

  const allAssets = useMemo(() => SCREENER_ASSETS.map(a => ({
    ...a,
    current_price: watchlistMap[a.symbol]?.current_price ?? null,
    rsi: watchlistMap[a.symbol]?.rsi ?? null,
    signal: watchlistMap[a.symbol]?.signal ?? 'NEUTRAL',
    inWatchlist: !!watchlistMap[a.symbol],
  })), [watchlistMap]);

  const filteredSymbols = useMemo(() => {
    if (!symbolQuery.trim()) return allAssets.filter(a => a.inWatchlist).slice(0, 20);
    const q = symbolQuery.toLowerCase();
    return allAssets.filter(a =>
      a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
    ).slice(0, 30);
  }, [allAssets, symbolQuery]);

  const selectedAsset = allAssets.find(a => a.symbol === selectedSymbol) || null;

  const handleSelectSymbol = (sym) => {
    setSelectedSymbol(sym);
    setSymbolQuery('');
    setShowDrop(false);
    setAiRationale('');
    setSetup(null);
    setReviewOpen(false);
    setOrderPlaced(false);
  };

  const handleApplySuggestion = (suggestion) => {
    // Auto-fill symbol, strategy, and DTE from AI suggestion
    if (suggestion.symbol) setSelectedSymbol(suggestion.symbol.toUpperCase());
    if (suggestion.strategy && STRATEGIES.find(s => s.id === suggestion.strategy)) setStrategy(suggestion.strategy);
    if (suggestion.dte && DTE_OPTIONS.includes(suggestion.dte)) setDte(suggestion.dte);
    else if (suggestion.dte) {
      // Pick closest DTE option
      const closest = DTE_OPTIONS.reduce((a, b) => Math.abs(b - suggestion.dte) < Math.abs(a - suggestion.dte) ? b : a);
      setDte(closest);
    }
    setAiRationale(suggestion.rationale || '');
    setSetup(null);
    setReviewOpen(false);
    setOrderPlaced(false);
    // Scroll to builder
    setTimeout(() => window.scrollTo({ top: 300, behavior: 'smooth' }), 100);
  };

  const handleContinue = () => {
    if (!selectedAsset) return;
    const s = buildSetup({ asset: selectedAsset, strategy, dte, strikeOffset, positionSize });
    setSetup(s);
    setReviewOpen(true);
    setOrderPlaced(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePlaceOrder = () => {
    if (!setup) return;
    saveMutation.mutate(setup);
    setOrderPlaced(true);
  };

  const handleAiPick = async () => {
    setAiPicking(true);
    setAiRationale('');
    const ctx = allAssets.filter(a => a.inWatchlist && a.current_price).slice(0, 25)
      .map(a => `${a.symbol}: $${a.current_price?.toFixed(2)}, signal=${a.signal}, RSI=${a.rsi?.toFixed(0) ?? 'N/A'}`)
      .join('\n');
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an options trading analyst. Pick the SINGLE BEST asset and strategy from this data:\n${ctx}\n\nAvailable strategies: buy_write, collar, cash_secured_put, bull_call_spread, bear_put_spread, iron_condor, long_straddle\n\nRespond ONLY valid JSON: {"symbol":"TICKER","strategy":"id","dte":30,"rationale":"2-3 sentences"}`,
      response_json_schema: { type: 'object', properties: { symbol: { type: 'string' }, strategy: { type: 'string' }, dte: { type: 'number' }, rationale: { type: 'string' } } },
    });
    if (result?.symbol) {
      setSelectedSymbol(result.symbol.toUpperCase());
      if (result.strategy && STRATEGIES.find(s => s.id === result.strategy)) setStrategy(result.strategy);
      if (result.dte && DTE_OPTIONS.includes(result.dte)) setDte(result.dte);
      setAiRationale(result.rationale || '');
      setSetup(null);
      setReviewOpen(false);
    }
    setAiPicking(false);
  };

  return (
    <PageShell glowLeft="bg-indigo-600/4" glowRight="bg-violet-600/4">

      {/* ─── PAGE HEADER ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 gap-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-indigo-400" />
          <h1 className="text-lg font-bold text-slate-200 tracking-tight">Options Lab</h1>
          <span className="text-[10px] font-mono text-slate-600 bg-slate-800/60 border border-slate-700 px-2 py-0.5 rounded">
            Schwab-style order flow
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Options Level Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">Options Level</span>
            <span className="font-bold text-indigo-300">{userLevel}</span>
            <span className="text-slate-600 hidden sm:inline">— {LEVEL_DESCRIPTIONS[userLevel]}</span>
          </div>
          <button onClick={() => setSavedTab(t => !t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
              savedTab ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}>
            <BookOpen className="w-3.5 h-3.5" />
            Saved Strategies
          </button>
        </div>
      </div>

      {/* ─── SAVED STRATEGIES VIEW ───────────────────────────────── */}
      {savedTab ? (
        <ActiveStrategies />
      ) : (

      <div className="space-y-0">

        {/* ═══════════════════════════════════════════════════════════
            AI SUGGESTIONS
        ═══════════════════════════════════════════════════════════ */}
        <div className="mb-6">
          <AiOptionsSuggestions
            userLevel={userLevel}
            onApplySuggestion={handleApplySuggestion}
          />
        </div>

        {/* ═══════════════════════════════════════════════════════════
            STEP 1 — SYMBOL SEARCH
        ═══════════════════════════════════════════════════════════ */}
        <SectionCard
          step="1"
          title="Search for a Symbol"
          note="Enter a stock ticker (e.g. AAPL, TSLA, SPY). This loads the live quote and enables the options chain below."
          defaultOpen
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Search input */}
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
              <Input
                value={symbolQuery}
                onChange={e => { setSymbolQuery(e.target.value); setShowDrop(true); }}
                onFocus={() => setShowDrop(true)}
                onBlur={() => setTimeout(() => setShowDrop(false), 150)}
                placeholder={selectedSymbol ? selectedSymbol : 'Search symbol or company name…'}
                className="pl-8 h-9 bg-slate-800 border-slate-700 text-slate-100 text-sm placeholder:text-slate-500 w-full"
              />
              {showDrop && (
                <div className="absolute z-50 top-full mt-1 left-0 w-full min-w-[280px] bg-slate-900 border border-slate-700 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
                  {filteredSymbols.length === 0 && (
                    <div className="text-center py-6 text-slate-600 text-xs font-mono">No results</div>
                  )}
                  {filteredSymbols.map(a => (
                    <button key={a.symbol} onMouseDown={() => handleSelectSymbol(a.symbol)}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-800 flex items-center justify-between gap-2 border-b border-slate-800/60 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-sm font-bold text-slate-100 w-14 shrink-0">{a.symbol}</span>
                        <span className="text-xs text-slate-500 truncate">{a.name}</span>
                        {a.inWatchlist && <span className="text-purple-400 text-[9px] shrink-0">★ watchlist</span>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono text-slate-500">
                        {a.current_price && <span className="text-slate-300">${a.current_price.toFixed(2)}</span>}
                        <span>{a.exchange}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* AI Pick */}
            <button onClick={handleAiPick} disabled={aiPicking}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-mono hover:bg-indigo-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
              {aiPicking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
              {aiPicking ? 'AI analyzing…' : 'AI Pick Best Trade'}
            </button>
          </div>

          {/* AI Rationale */}
          {aiRationale && (
            <div className="mt-3 flex gap-2 bg-indigo-500/8 border border-indigo-500/20 rounded-lg px-3 py-2.5">
              <Bot className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-200/80 leading-relaxed">{aiRationale}</p>
            </div>
          )}

          {/* Quote bar */}
          {selectedAsset && <div className="mt-3"><SymbolQuoteBar asset={selectedAsset} /></div>}
        </SectionCard>

        {/* Connector */}
        <StepConnector active={!!selectedAsset} />

        {/* ═══════════════════════════════════════════════════════════
            STEP 2 — OPTIONS CHAIN
        ═══════════════════════════════════════════════════════════ */}
        <SectionCard
          step="2"
          title="Options Chain"
          note="Each row is an options contract for a specific strike price. Calls (green) profit when the stock goes UP. Puts (red) profit when the stock goes DOWN. Click any Bid or Ask price to auto-fill the Trade Builder below."
          open={chainOpen}
          onToggle={() => setChainOpen(o => !o)}
          disabled={!selectedAsset}
        >
          <SchwabOptionsChain
            asset={selectedAsset}
            dte={dte}
            onDteChange={setDte}
            dteOptions={DTE_OPTIONS}
            onSelectLeg={(leg) => {
              // Auto-map single leg click → best matching strategy
              if (leg.contract === 'Call' && leg.type === 'Sell') setStrategy('buy_write');
              else if (leg.contract === 'Put' && leg.type === 'Buy') setStrategy('collar');
              else if (leg.contract === 'Put' && leg.type === 'Sell') setStrategy('cash_secured_put');
              else if (leg.contract === 'Call' && leg.type === 'Buy') setStrategy('bull_call_spread');
              setBuilderOpen(true);
            }}
          />
        </SectionCard>

        {/* Connector */}
        <StepConnector active={!!selectedAsset} />

        {/* ═══════════════════════════════════════════════════════════
            STEP 3 — TRADE BUILDER
        ═══════════════════════════════════════════════════════════ */}
        <SectionCard
          step="3"
          title="Trade Builder"
          note="Choose your strategy type, how many days until expiry (DTE), and how far from the current price your strikes should be (OTM Offset). The builder calculates your legs automatically."
          open={builderOpen}
          onToggle={() => setBuilderOpen(o => !o)}
          disabled={!selectedAsset}
        >
          <TradeBuilder
            strategies={STRATEGIES}
            strategy={strategy}
            onStrategyChange={setStrategy}
            userLevel={userLevel}
            dte={dte}
            onDteChange={setDte}
            dteOptions={DTE_OPTIONS}
            strikeOffset={strikeOffset}
            onStrikeOffsetChange={setStrikeOffset}
            positionSize={positionSize}
            onPositionSizeChange={setPositionSize}
            orderType={orderType}
            onOrderTypeChange={setOrderType}
            quantity={quantity}
            onQuantityChange={setQuantity}
            selectedAsset={selectedAsset}
            onContinue={handleContinue}
          />
        </SectionCard>

        {/* Connector */}
        <StepConnector active={!!setup} />

        {/* ═══════════════════════════════════════════════════════════
            STEP 4 — ORDER TICKET / REVIEW
        ═══════════════════════════════════════════════════════════ */}
        <SectionCard
          step="4"
          title="Review Order"
          note="Review all details before placing. Check your max profit, max loss, and breakeven prices. 'Place Order' saves this strategy to your log — no real money is involved in this simulator."
          open={reviewOpen}
          onToggle={() => setReviewOpen(o => !o)}
          disabled={!setup}
        >
          {setup && (
            <OrderTicket
              setup={setup}
              orderType={orderType}
              quantity={quantity}
              orderPlaced={orderPlaced}
              saving={saveMutation.isPending}
              onPlaceOrder={handlePlaceOrder}
              onReset={() => { setSetup(null); setReviewOpen(false); setOrderPlaced(false); }}
            />
          )}
          {setup && <div className="mt-5 space-y-4"><PayoffDiagram setup={setup} /><GreeksPanel setup={setup} /></div>}
        </SectionCard>

      </div>
      )}
    </PageShell>
  );
}

// ─── Shared section card wrapper ─────────────────────────────────────────────
function SectionCard({ step, title, note, children, open = true, onToggle, disabled = false, defaultOpen }) {
  const [localOpen, setLocalOpen] = useState(defaultOpen !== false);
  const isControlled = onToggle !== undefined;
  const isOpen = isControlled ? open : localOpen;
  const toggle = isControlled ? onToggle : () => setLocalOpen(o => !o);

  return (
    <div className={`border-l-2 pl-6 pb-2 ml-4 relative ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
      style={{ borderColor: disabled ? '#334155' : '#6366f1' }}>
      {/* Step dot */}
      <div className={`absolute -left-3 top-3 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
        disabled ? 'bg-slate-900 border-slate-700 text-slate-600' : 'bg-indigo-600 border-indigo-400 text-white'
      }`}>{step}</div>

      {/* Card */}
      <div className={`bg-slate-900/40 border rounded-xl overflow-hidden mb-2 ${
        disabled ? 'border-slate-800' : 'border-slate-700/80'
      }`}>
        {/* Header */}
        <button onClick={toggle} disabled={disabled}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/30 transition-colors text-left">
          <div>
            <span className="text-sm font-semibold text-slate-200">{title}</span>
            {note && isOpen && (
              <div className="flex items-start gap-1.5 mt-1">
                <Info className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-500 leading-relaxed max-w-2xl">{note}</p>
              </div>
            )}
          </div>
          {onToggle !== undefined && (
            isOpen ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
          )}
        </button>

        {/* Body */}
        {isOpen && (
          <div className="px-5 pb-5 pt-1 border-t border-slate-800">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

function StepConnector({ active }) {
  return <div className={`ml-4 w-0.5 h-4 ${active ? 'bg-indigo-600' : 'bg-slate-800'}`} />;
}