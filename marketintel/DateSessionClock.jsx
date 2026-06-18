import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function DateSessionClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Format time in ET
  const timeStr = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'America/New_York'
  });

  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/New_York'
  });

  // Determine market session based on ET time
  const etHour = parseInt(time.toLocaleTimeString('en-US', { hour: '2-digit', hour12: false, timeZone: 'America/New_York' }));
  const etMinute = parseInt(time.toLocaleTimeString('en-US', { minute: '2-digit', hour12: false, timeZone: 'America/New_York' }));
  const etTime = etHour + etMinute / 60;

  let session = 'PRE-MARKET';
  let sessionColor = 'text-slate-400';

  if (etTime >= 9.5 && etTime < 16) {
    session = 'REGULAR SESSION';
    sessionColor = 'text-emerald-400';
  } else if (etTime >= 16 && etTime < 20) {
    session = 'AFTER-HOURS';
    sessionColor = 'text-amber-400';
  } else if (etTime >= 20 || etTime < 4) {
    session = 'ASIA / EUROPE';
    sessionColor = 'text-blue-400';
  } else if (etTime >= 4 && etTime < 9.5) {
    session = 'PRE-MARKET';
    sessionColor = 'text-slate-400';
  }

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 font-mono">
      {/* Digital clock display */}
      <div className="flex items-end gap-4 mb-4">
        <div className="text-5xl font-black text-slate-100 tracking-tighter leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {timeStr}
        </div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">ET</div>
      </div>

      {/* Date */}
      <div className="text-sm font-mono text-slate-400 mb-4">{dateStr}</div>

      {/* Session indicator */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${sessionColor.replace('text-', 'bg-')}`} style={{
          animation: sessionColor !== 'text-slate-400' ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
        }} />
        <span className={`text-xs font-bold uppercase tracking-wider ${sessionColor}`}>{session}</span>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}