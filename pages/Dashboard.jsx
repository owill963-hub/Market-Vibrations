import React, { useCallback } from 'react';
import PageShell from '@/components/layout/PageShell';
import PullToRefresh from '@/components/layout/PullToRefresh';
import AiBuddy from '@/components/ai/AiBuddy';
import { useQueryClient } from '@tanstack/react-query';

import MarketOverviewWidget from '@/components/dashboard/MarketOverviewWidget';
import CryptoGainersLosers from '@/components/dashboard/CryptoGainersLosers';
import BuySellPanel from '@/components/dashboard/BuySellPanel';
import DarkPoolWidget from '@/components/dashboard/DarkPoolWidget';
import DateSessionClock from '@/components/marketintel/DateSessionClock';
import EconomicEarningsCalendar from '@/components/marketintel/EconomicEarningsCalendar';
import { Calendar } from 'lucide-react';

import MarketIntelHub from '@/components/dashboard/MarketIntelHub';
import LegislationCryptoPanel from '@/components/dashboard/LegislationCryptoPanel';

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex-1 h-px bg-slate-800/60" />
      <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest whitespace-nowrap">{children}</span>
      <div className="flex-1 h-px bg-slate-800/60" />
    </div>
  );
}

export default function Dashboard() {
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);

  return (
    <PageShell glowLeft="bg-indigo-600/4" glowRight="bg-emerald-600/5">

    <PullToRefresh onRefresh={handleRefresh}>
      {/* ── Row 1: Digital Clock (left) · Buy & Sell (right) ── */}
      <section className="mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2">
            <DateSessionClock />
          </div>
          <div>
            <SectionLabel>Buy &amp; Sell</SectionLabel>
            <BuySellPanel />
          </div>
        </div>
      </section>

      {/* ── Row 2: Dark Pool Scanner (left) · same width as Buy&Sell column ── */}
      <section className="mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2">
            <SectionLabel>Dark Pool Scanner</SectionLabel>
            <DarkPoolWidget />
          </div>
          <div>
            {/* spacer to keep alignment */}
          </div>
        </div>
      </section>

      {/* ── Market Overview ──────────────────────────── */}
      <section className="mb-4">
        <SectionLabel>Market Overview</SectionLabel>
        <MarketOverviewWidget />
      </section>

      {/* ── Crypto Movers ─────────────────────────────── */}
      <section className="mb-4">
        <SectionLabel>Top Crypto Movers</SectionLabel>
        <CryptoGainersLosers />
      </section>

      {/* ── Economic & Earnings Calendar ─────────────── */}
      <section className="mb-6">
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-200">Economic &amp; Earnings Calendar</h3>
          </div>
          <EconomicEarningsCalendar />
        </div>
      </section>

      {/* ── AI Market Insights + LMSR (combined) ─────── */}
      <section className="mb-6">
        <SectionLabel>Market Intelligence</SectionLabel>
        <MarketIntelHub />
      </section>

      {/* ── Legislation Crypto Tracker ───────────────── */}
      <section className="mb-6">
        <SectionLabel>GENIUS &amp; CLARITY Act Assets</SectionLabel>
        <LegislationCryptoPanel />
      </section>

      <AiBuddy screenerResults={[]} markets={[]} />
    </PullToRefresh>
    </PageShell>
  );
}