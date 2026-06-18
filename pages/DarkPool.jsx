import React, { useState } from 'react';
import PageShell from '@/components/layout/PageShell';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, Search, Eye, Plus, X, AlertCircle, CalendarDays } from 'lucide-react';
import DarkPoolSummaryBar from '@/components/darkpool/DarkPoolSummaryBar';
import DarkPoolTickerCard from '@/components/darkpool/DarkPoolTickerCard';

const DEFAULT_TICKERS = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'AMZN', 'META', 'SPY', 'QQQ', 'GS', 'JPM'];

export default function DarkPool() {
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
    <PageShell glowLeft="bg-purple-600/5" glowRight="bg-red-600/4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-red-700 flex items-center justify-center">
            <Eye className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Dark Pool Scanner</h1>
            <p className="text-xs text-slate-500 font-mono">
              Detects institutional block trades via intraday volume anomaly detection
            </p>
          </div>
        </div>

        {scanDate && (
          <div className="flex items-center gap-1.5 mt-2 text-[10px] font-mono text-slate-600">
            <CalendarDays className="w-3 h-3" />
            <span>Scan date: {scanDate}</span>
            {scannedAt && <span className="ml-2 text-slate-700">· Run at {new Date(scannedAt).toLocaleTimeString()}</span>}
          </div>
        )}
      </div>

      {/* Ticker builder */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 mb-6">
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3">Tickers to Scan</div>
        <div className="flex flex-wrap gap-2 mb-3">
          {tickers.map(sym => (
            <div key={sym} className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1">
              <span className="text-xs font-mono font-bold text-slate-200">{sym}</span>
              <button onClick={() => removeTicker(sym)} className="text-slate-600 hover:text-red-400 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={inputVal}
            onChange={e => setInputVal(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && addTicker()}
            placeholder="Add ticker (e.g. GOOGL)"
            className="flex-1 h-8 text-xs font-mono bg-slate-900 border-slate-700 text-slate-200 placeholder-slate-600"
            maxLength={10}
          />
          <Button onClick={addTicker} size="sm" variant="outline" className="h-8 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700">
            <Plus className="w-3.5 h-3.5" />
          </Button>
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
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-950/40 border border-red-800/60 rounded-xl p-4 mb-6 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {tickers.slice(0, 6).map(t => (
            <div key={t} className="bg-slate-900/40 border border-slate-800 rounded-xl px-4 py-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-4 w-12 bg-slate-800 rounded" />
                <div className="h-5 w-20 bg-slate-800 rounded-full" />
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full" />
                <div className="h-4 w-16 bg-slate-800 rounded" />
                <div className="h-4 w-10 bg-slate-800 rounded" />
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

          {/* Methodology note */}
          <div className="bg-slate-900/30 border border-slate-800/60 rounded-lg px-4 py-2.5 mb-4 text-[10px] font-mono text-slate-600 leading-relaxed">
            <span className="text-slate-500 font-bold">Methodology: </span>
            Minute bars with volume ≥ 3× session average + price range &lt;1% flagged as block prints.
            Bias = close vs day VWAP. Intensity: Notable (3–5×), Significant (5–10×), Massive (10×+).
            Data from Massive API /v2/aggs — end-of-day / 15-min delayed on current plan.
          </div>

          <div className="space-y-3">
            {results.map(r => (
              <DarkPoolTickerCard key={r.ticker} result={r} />
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {!results && !loading && !error && (
        <div className="text-center py-20">
          <Eye className="w-14 h-14 text-slate-800 mx-auto mb-4" />
          <p className="text-slate-500 text-sm mb-1">Dark Pool Scanner Ready</p>
          <p className="text-slate-700 text-xs font-mono max-w-md mx-auto">
            Add tickers and click "Run Scan" to detect institutional block trades
            using volume anomaly detection on intraday minute bars.
          </p>
        </div>
      )}
    </PageShell>
  );
}