import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

const ROUTE_ORDER = [
  '/Dashboard',
  '/Watchlist',
  '/MarketOverview',
  '/Options',
  '/DarkPool',
  '/Settings',
];

function getRouteIndex(path) {
  const idx = ROUTE_ORDER.findIndex(r => path.startsWith(r));
  return idx === -1 ? 0 : idx;
}

/**
 * Native-like horizontal slide transition for route changes.
 * Slides left when navigating "forward" (higher index) and right when going "back".
 */
export default function PageTransition({ children }) {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [direction, setDirection] = useState(1); // 1 = slide from right, -1 = slide from left
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    const prevIdx = getRouteIndex(prevPathRef.current);
    const nextIdx = getRouteIndex(location.pathname);
    setDirection(nextIdx >= prevIdx ? 1 : -1);
    prevPathRef.current = location.pathname;

    setVisible(false);
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    return () => cancelAnimationFrame(raf);
  }, [location.pathname]);

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : `translateX(${direction * 18}px)`,
        transition: 'opacity 0.2s ease, transform 0.2s ease',
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}