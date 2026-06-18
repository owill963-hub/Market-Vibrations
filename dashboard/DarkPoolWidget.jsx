import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, Search, Eye, Plus, X, AlertCircle, CalendarDays } from 'lucide-react';
import DarkPoolSummaryBar from '@/components/darkpool/DarkPoolSummaryBar';
import DarkPoolTickerCard from '@/components/darkpool/DarkPoolTickerCard';

const DEFAULT_TICKERS = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'AMZN', 'META', 'SPY', 'QQQ', 'GS', 'JPM'];

export default function DarkPoolWidget() {
  const [tickers, setTickers] = useState(DEFAULT_TICKERS);
  const [inputVal, setInputVal] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scanDate, setScanDate] = useState(null);
  const [scannedAt, setScannedAt] = useState(null);

  const addTicker = () => {
    const sym = inputVal.trim().toUpperCase();
    if (!sym || tickers.includes(sym)) { setInputVal(''); return; }
    setTickers(t => [...t, sym]);
    setInputVal('');
  };

  const removeTicker = (sym) => setTickers(t => t.filter(s => s !== sym));

  const runScan = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await base44.functions.invoke('darkPoolScanner', { tickers });
      if (res.data?.error) throw new Error(res.data.error);
      setResults(res.data.results || []);
      setScanDate(res.data.scan_date || null);
      setScannedAt(res.data.scanned_at || null);
    } catch (e) {
      setError(e.message || 'Scan failed');
    }
    setLoading(false);
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-600 to-red-700 flex items-center justify-center shrink-0">
            <Eye className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">Dark Pool Scanner</h2>
            {scanDate && (
              <div className="flex items-center gap-1 text-[9px] font-mono text-slate-600">
                <CalendarDays className="w-2.5 h-2.5" />
                {scanDate}
                {scannedAt && <span className="ml-1">· {new Date(scannedAt).toLocaleTimeString()}</span>}
              </div>
            )}
          </div>
        </div>
        <Button
          onClick={runScan}
          disabled={loading || tickers.length === 0}
          className="h-8 bg-gradient-to-r from-purple-600 to-red-700 hover:from-purple-700 hover:to-red-800 text-white text-xs font-bold"
        >
          {loading
            ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Scanning…</>
            : results
            ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Re-Scan</>
            : <><Search className="w-3.5 h-3.5 mr-1.5" />Run Scan</>
          }
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Ticker builder */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
          <div className="text-[9px] font-mono uppercase tracking-widest text-slate-600 mb-2">Tickers to Scan</div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tickers.map(sym => (
              <div key={sym} className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded px-2 py-1">
                <span className="text-[10px] font-mono font-bold text-slate-200">{sym}</span>
                {/* min 44×44 touch target for remove button */}
                <button
                  onClick={() => removeTicker(sym)}
                  className="text-slate-600 hover:text-red-400 transition-colors flex items-center justify-center w-6 h-6 -mr-1"
                  aria-label={`Remove ${sym}`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={inputVal}
              onChange={e => setInputVal(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && addTicker()}
              placeholder="Add ticker…"
              className="flex-1 h-10 text-sm font-mono bg-slate-900 border-slate-700 text-slate-200 placeholder-slate-600"
              maxLength={10}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              inputMode="text"
            />
            <Button onClick={addTicker} size="sm" variant="outline" className="h-10 w-10 p-0 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-950/40 border border-red-800/60 rounded-xl p-3 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-2">
            {tickers.slice(0, 5).map(t => (
              <div key={t} className="bg-slate-900/40 border border-slate-800 rounded-xl px-4 py-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-12 bg-slate-800 rounded" />
                  <div className="h-4 w-20 bg-slate-800 rounded-full" />
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full" />
                  <div className="h-4 w-16 bg-slate-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {results && !loading && (
          <>
            <DarkPoolSummaryBar results={results} />
            <div className="bg-slate-900/30 border border-slate-800/60 rounded-lg px-4 py-2 text-[9px] font-mono text-slate-600 leading-relaxed">
              <span className="text-slate-500 font-bold">Methodology: </span>
              Volume ≥ 3× session avg + range &lt;1% = block print. Intensity: Notable (3–5×) · Significant (5–10×) · Massive (10×+).
            </div>
            <div className="space-y-3 overscroll-contain">
              {results.map(r => <DarkPoolTickerCard key={r.ticker} result={r} />)}
            </div>
          </>
        )}

        {/* Empty state */}
        {!results && !loading && !error && (
          <div className="text-center py-10">
            <Eye className="w-10 h-10 text-slate-800 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Dark Pool Scanner Ready</p>
            <p className="text-slate-700 text-xs font-mono mt-1 max-w-sm mx-auto">
              Click "Run Scan" to detect institutional block trades via volume anomaly detection
            </p>
          </div>
        )}
      </div>
    </div>
  );
}