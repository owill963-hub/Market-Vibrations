import React from 'react';

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-800/50 animate-pulse">
      <td className="py-3 pl-4 pr-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-slate-800 rounded" />
          <div>
            <div className="w-14 h-3.5 bg-slate-800 rounded mb-1.5" />
            <div className="w-10 h-2 bg-slate-800/60 rounded" />
          </div>
        </div>
      </td>
      <td className="py-3 px-2 hidden sm:table-cell">
        <div className="w-28 h-3 bg-slate-800 rounded mb-1.5" />
        <div className="w-16 h-2 bg-slate-800/60 rounded" />
      </td>
      <td className="py-3 px-2">
        <div className="w-16 h-3.5 bg-slate-800 rounded mb-1.5 ml-auto" />
        <div className="w-10 h-2 bg-slate-800/60 rounded ml-auto" />
      </td>
      <td className="py-3 px-2 hidden md:table-cell">
        <div className="flex items-center gap-1.5">
          <div className="w-12 h-1.5 bg-slate-800 rounded-full" />
          <div className="w-6 h-3 bg-slate-800 rounded" />
        </div>
      </td>
      <td className="py-3 px-2">
        <div className="w-16 h-5 bg-slate-800 rounded-full" />
      </td>
      <td className="py-3 px-2 hidden lg:table-cell">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-slate-800 rounded-full" />
          <div className="w-2 h-2 bg-slate-800 rounded-full" />
          <div className="w-2 h-2 bg-slate-800 rounded-full" />
        </div>
      </td>
      <td className="py-3 px-2 hidden lg:table-cell">
        <div className="w-20 h-3 bg-slate-800 rounded" />
      </td>
      <td className="py-3 px-2 hidden lg:table-cell">
        <div className="w-10 h-3.5 bg-slate-800 rounded" />
      </td>
    </tr>
  );
}

export default function ScreenerSkeleton({ rows = 12 }) {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
      {/* Fake toolbar */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2 animate-pulse">
        <div className="w-40 h-7 bg-slate-800 rounded-lg" />
        <div className="w-10 h-7 bg-slate-800 rounded-lg" />
        <div className="w-10 h-7 bg-slate-800 rounded-lg" />
        <div className="w-10 h-7 bg-slate-800 rounded-lg" />
        <div className="ml-auto flex gap-1">
          {[...Array(4)].map((_, i) => <div key={i} className="w-12 h-5 bg-slate-800 rounded" />)}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800 animate-pulse">
              {['Symbol', 'Name', 'Price', 'RSI', 'Signal', 'Conf', 'Power', 'R:R'].map((h, i) => (
                <th key={i} className={`py-2 ${i === 0 ? 'pl-4' : 'px-2'} ${i > 4 ? 'hidden lg:table-cell' : i === 1 ? 'hidden sm:table-cell' : i === 3 ? 'hidden md:table-cell' : ''}`}>
                  <div className="w-12 h-2.5 bg-slate-800 rounded" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(rows)].map((_, i) => <SkeletonRow key={i} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}