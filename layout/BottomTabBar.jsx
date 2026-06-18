import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Zap, Eye, LineChart, Grid3X3, Waves, Settings } from 'lucide-react';

const tabs = [
  { path: '/Dashboard',     label: 'Markets',   icon: Zap },
  { path: '/Watchlist',     label: 'Watchlist',  icon: Eye },
  { path: '/MarketOverview',label: 'Overview',   icon: Grid3X3 },
  { path: '/Options',       label: 'Options',    icon: LineChart },
  { path: '/Settings',      label: 'Settings',   icon: Settings },
];

export default function BottomTabBar() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/60 flex md:hidden select-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {tabs.map(({ path, label, icon: Icon }) => {
        const active = location.pathname === path || (path === '/Dashboard' && location.pathname === '/');
        return (
          <Link
            key={path}
            to={path}
            draggable={false}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[3.25rem] transition-colors active:bg-slate-800/40 ${
              active ? 'text-blue-400' : 'text-slate-500'
            }`}
          >
            <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110' : 'scale-100'}`} />
            <span className={`text-[9px] font-medium tracking-wide ${active ? 'text-blue-400' : 'text-slate-600'}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}