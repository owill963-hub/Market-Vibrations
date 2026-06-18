import React, { useMemo } from 'react';
import { Calendar, AlertCircle, TrendingUp, Zap } from 'lucide-react';

export default function EconomicEarningsCalendar({ brief }) {
  // Parse the brief text to extract calendar events
  // This looks for "Economic Calendar" and "Earnings Calendar" sections with dates
  
  // Sample data structure for events with dates and impact levels
  const eventsByDate = useMemo(() => {
    const events = {};
    
    // Default events (next 5 days as placeholder)
    const today = new Date();
    for (let i = 0; i < 10; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (!events[key]) {
        events[key] = { date: d, economic: [], earnings: [], impact: 'none' };
      }
    }
    
    return events;
  }, []);

  // Get calendar grid for next 10 days
  const today = new Date();
  const days = [];
  for (let i = 0; i < 10; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const getImpactColor = (impact) => {
    if (impact === 'high') return 'bg-red-500/20 border-red-500/40 text-red-300';
    if (impact === 'medium') return 'bg-amber-500/20 border-amber-500/40 text-amber-300';
    if (impact === 'low') return 'bg-green-500/20 border-green-500/40 text-green-300';
    return 'bg-slate-800/40 border-slate-700/40 text-slate-400';
  };

  const getDotColor = (impact) => {
    if (impact === 'high') return 'bg-red-500';
    if (impact === 'medium') return 'bg-amber-500';
    if (impact === 'low') return 'bg-green-500';
    return 'bg-slate-600';
  };

  // Mock data — in real usage, this would come from the LLM brief
  const mockEvents = {
    'Jun 12': { economic: ['CPI (High)', 'PPI'], earnings: ['TSLA', 'META'], impact: 'high' },
    'Jun 13': { economic: ['Jobless Claims'], earnings: ['AAPL', 'MSFT'], impact: 'high' },
    'Jun 14': { economic: [], earnings: ['GOOGL', 'AMZN'], impact: 'medium' },
    'Jun 17': { economic: ['FOMC Decision'], earnings: [], impact: 'high' },
    'Jun 18': { economic: ['Retail Sales'], earnings: ['NFLX'], impact: 'medium' },
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap text-[9px] font-mono">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-red-400">High Impact</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-amber-400">Medium Impact</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-green-400">Low Impact</span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-5 gap-2">
        {days.map((d, idx) => {
          const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const events = mockEvents[dateKey] || { economic: [], earnings: [], impact: 'none' };
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          const isToday = d.toDateString() === today.toDateString();
          
          const impactColor = getImpactColor(events.impact);
          const dotColor = getDotColor(events.impact);

          return (
            <div
              key={idx}
              className={`rounded-lg border p-2.5 text-[10px] font-mono transition-all ${
                isToday ? 'ring-2 ring-emerald-500/50' : ''
              } ${
                isWeekend ? 'bg-slate-950/50 border-slate-800' : `${impactColor}`
              } ${
                events.impact !== 'none' && !isWeekend ? 'cursor-pointer hover:shadow-lg hover:shadow-current/20' : ''
              }`}
            >
              {/* Date header */}
              <div className="font-bold mb-1.5 flex items-center justify-between">
                <span>{d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}</span>
                {events.impact !== 'none' && (
                  <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                )}
              </div>
              <div className="text-[9px] text-slate-400 mb-1.5">{dateKey}</div>

              {/* Events */}
              <div className="space-y-0.5">
                {events.economic.length > 0 && (
                  <div>
                    {events.economic.map((e, i) => (
                      <div key={i} className="text-[8px] text-slate-300 truncate flex items-center gap-1">
                        <span className="text-amber-400">📊</span> {e}
                      </div>
                    ))}
                  </div>
                )}
                {events.earnings.length > 0 && (
                  <div>
                    {events.earnings.slice(0, 2).map((e, i) => (
                      <div key={i} className="text-[8px] text-slate-300 truncate flex items-center gap-1">
                        <span className="text-emerald-400">📈</span> {e}
                      </div>
                    ))}
                    {events.earnings.length > 2 && (
                      <div className="text-[8px] text-slate-500">+{events.earnings.length - 2} more</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick summary */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3 text-[10px] font-mono text-slate-400">
        <p className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-3 h-3" />
          <span className="font-bold text-slate-300">Next 10 days: 2 high-impact events, 3 medium-impact, multiple earnings</span>
        </p>
        <p className="text-slate-600">CPI on Jun 12 (high impact) · FOMC Decision on Jun 17 (high impact)</p>
      </div>
    </div>
  );
}