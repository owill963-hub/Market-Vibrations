import React, { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Landmark, Plus, Loader2, BarChart2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AddAssetDialog({ open, onOpenChange, onAdd, existingSymbols = [] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addedSymbols, setAddedSymbols] = useState(new Set());
  const debounceRef = useRef(null);

  const search = useCallback((q) => {
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await base44.functions.invoke('fetchAssetStats', { query: q });
      setResults(res.data?.results || []);
      setSearching(false);
    }, 350);
  }, []);

  const handleInput = (e) => {
    setQuery(e.target.value);
    search(e.target.value);
  };

  const handleAdd = (asset) => {
    onAdd({
      symbol: asset.symbol,
      name: asset.name,
      exchange: asset.exchange || asset.exchDisp || '',
      sector: asset.sector || '',
      asset_type: asset.type === 'CRYPTOCURRENCY' ? 'crypto' : asset.type === 'ETF' ? 'etf' : 'stock',
      belief_price: 0,
      current_price: 0,
      edge_threshold: 5,
      alert_direction: 'both',
      is_active: true,
    });
    setAddedSymbols(prev => new Set([...prev, asset.symbol]));
  };

  const isAdded = (sym) => existingSymbols.includes(sym) || addedSymbols.has(sym);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setQuery(''); setResults([]); setAddedSymbols(new Set()); } }}>
      <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 sm:max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-slate-100 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-blue-400" />
            Add Asset to Watchlist
          </DialogTitle>
        </DialogHeader>

        {/* Search input */}
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <Input
            value={query}
            onChange={handleInput}
            autoFocus
            placeholder="Search any stock, ETF, crypto, index across all exchanges…"
            className="pl-9 pr-9 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 text-sm"
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 animate-spin" />}
        </div>

        {/* Results list */}
        <div className="overflow-y-auto flex-1 -mx-1">
          {results.length > 0 ? (
            <div className="space-y-1 px-1 py-1">
              {results.map(asset => {
                const added = isAdded(asset.symbol);
                return (
                  <div
                    key={asset.symbol}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                      added ? 'opacity-50' : 'hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-16 shrink-0">
                        <span className="font-mono text-sm font-bold text-slate-100">{asset.symbol}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-slate-300 truncate">{asset.name}</div>
                        <div className="text-[10px] text-slate-600">
                          {[asset.exchange, asset.type].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={added ? 'ghost' : 'outline'}
                      onClick={() => !added && handleAdd(asset)}
                      disabled={added}
                      className={`h-7 shrink-0 ${added ? 'text-slate-600' : 'border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                    >
                      {added ? 'Added' : <><Plus className="w-3 h-3 mr-1" />Add</>}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : query && !searching ? (
            <div className="text-center py-10 text-slate-600 text-sm">No results found for "{query}"</div>
          ) : !query ? (
            <div className="flex flex-col items-center justify-center py-14 gap-2 text-center">
              <BarChart2 className="w-10 h-10 text-slate-800" />
              <p className="text-slate-600 text-sm">Search across all global exchanges</p>
              <p className="text-[10px] text-slate-700">NYSE · NASDAQ · LSE · TSX · ASX · Crypto · ETFs · Indices</p>
              <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
                {['AAPL', 'NVDA', 'BTC-USD', 'SPY', 'MSFT', 'TSLA'].map(sym => (
                  <button key={sym} onClick={() => { setQuery(sym); search(sym); }}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-full text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors">
                    {sym}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}