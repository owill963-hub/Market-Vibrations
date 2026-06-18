import React from 'react';
import NavBar from '@/components/NavBar';
import BottomTabBar from '@/components/layout/BottomTabBar';
import PageTransition from '@/components/layout/PageTransition';

/**
 * Shared page shell — handles the fixed NavBar, ambient glow, and content padding.
 * Pass `glowColors` to customize the gradient blobs (default: blue + emerald).
 * Pass `topBanner` for a fixed element between the nav and main content (e.g. ConfluenceTicker).
 */
export default function PageShell({
  children,
  navProps = {},
  topBanner = null,
  glowLeft = 'bg-blue-600/5',
  glowRight = 'bg-emerald-600/5',
  extraTopOffset = false,
}) {
  // Nav bar is h-12 (3rem) + safe-area-inset-top handled via env()
  const pt = extraTopOffset ? 'pt-[5.5rem]' : 'pt-[3.25rem]';

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 overscroll-none"
      style={{ minHeight: '100dvh' }}
    >
      <NavBar {...navProps} />

      {topBanner && (
        <div
          className="fixed left-0 right-0 z-40 border-y border-slate-800/40 bg-slate-950/80 backdrop-blur-sm"
          style={{ top: 'calc(3rem + env(safe-area-inset-top))' }}
        >
          {topBanner}
        </div>
      )}

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute top-0 left-1/4 w-96 h-96 ${glowLeft} rounded-full blur-3xl`} />
        <div className={`absolute bottom-0 right-1/4 w-96 h-96 ${glowRight} rounded-full blur-3xl`} />
      </div>

      {/* Main content — extra bottom padding on mobile for bottom tab bar */}
      <div
        className={`relative z-10 max-w-7xl mx-auto px-4 sm:px-6 ${pt} pb-12 md:pb-12`}
        style={{ paddingBottom: 'max(5rem, calc(3.25rem + env(safe-area-inset-bottom)))' }}
      >
        <PageTransition>
          {children}
        </PageTransition>
      </div>

      {/* Mobile bottom tab bar */}
      <BottomTabBar />
    </div>
  );
}