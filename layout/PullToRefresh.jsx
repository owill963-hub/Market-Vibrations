import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

const THRESHOLD = 72; // px to pull before triggering
const RESIST = 0.4;   // resistance factor

/**
 * Wraps children with a pull-to-refresh gesture on touch devices.
 * onRefresh should return a Promise.
 */
export default function PullToRefresh({ onRefresh, children }) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(null);
  const containerRef = useRef(null);
  const isRefreshingRef = useRef(false);

  const canPull = useCallback(() => {
    return (window.scrollY === 0);
  }, []);

  const onTouchStart = useCallback((e) => {
    if (!canPull()) return;
    startYRef.current = e.touches[0].clientY;
  }, [canPull]);

  const onTouchMove = useCallback((e) => {
    if (startYRef.current === null || isRefreshingRef.current) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta <= 0) { setPullY(0); return; }
    // Only prevent default when we're actually pulling down from top
    if (canPull() && delta > 4) {
      e.preventDefault();
      setPullY(Math.min(delta * RESIST, THRESHOLD * 1.5));
    }
  }, [canPull]);

  const onTouchEnd = useCallback(async () => {
    if (startYRef.current === null) return;
    startYRef.current = null;
    if (pullY >= THRESHOLD && !isRefreshingRef.current) {
      isRefreshingRef.current = true;
      setRefreshing(true);
      setPullY(THRESHOLD);
      try { await onRefresh(); } catch (_) {}
      setRefreshing(false);
      isRefreshingRef.current = false;
    }
    setPullY(0);
  }, [pullY, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  const indicatorProgress = Math.min(pullY / THRESHOLD, 1);
  const showIndicator = pullY > 4 || refreshing;

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator */}
      {showIndicator && (
        <div
          className="absolute left-0 right-0 flex items-center justify-center z-20 pointer-events-none"
          style={{
            top: refreshing ? 8 : Math.max(pullY - 40, -8),
            transition: refreshing ? 'top 0.2s ease' : 'none',
          }}
        >
          <div
            className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg"
            style={{
              opacity: indicatorProgress,
              transform: `scale(${0.6 + indicatorProgress * 0.4})`,
              transition: refreshing ? 'all 0.2s ease' : 'none',
            }}
          >
            <Loader2
              className="w-4 h-4 text-blue-400"
              style={{
                animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
                transform: !refreshing ? `rotate(${indicatorProgress * 270}deg)` : undefined,
              }}
            />
          </div>
        </div>
      )}

      {/* Content shifts down while pulling */}
      <div
        style={{
          transform: pullY > 0 ? `translateY(${pullY}px)` : 'none',
          transition: pullY === 0 ? 'transform 0.3s ease' : 'none',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
}