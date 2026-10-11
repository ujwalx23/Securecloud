import React from 'react';
import { Shield } from 'lucide-react';

export const PageSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse w-full max-w-7xl mx-auto py-2">
      {/* Header Skeleton */}
      <div className="glass-panel p-5 border border-slate-800/80 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center">
            <Shield className="w-5 h-5 text-cyan-500/40 animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-40 bg-slate-800 rounded-md" />
            <div className="h-2.5 w-64 bg-slate-800/60 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 bg-slate-800/80 rounded-xl" />
          <div className="h-8 w-24 bg-cyan-950/40 border border-cyan-500/20 rounded-xl" />
        </div>
      </div>

      {/* Grid Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-3">
          <div className="h-3 w-28 bg-slate-800 rounded" />
          <div className="h-7 w-20 bg-slate-800/80 rounded" />
          <div className="h-2 w-full bg-slate-800/40 rounded-full" />
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-3">
          <div className="h-3 w-28 bg-slate-800 rounded" />
          <div className="h-7 w-20 bg-slate-800/80 rounded" />
          <div className="h-2 w-full bg-slate-800/40 rounded-full" />
        </div>
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 space-y-3">
          <div className="h-3 w-28 bg-slate-800 rounded" />
          <div className="h-7 w-20 bg-slate-800/80 rounded" />
          <div className="h-2 w-full bg-slate-800/40 rounded-full" />
        </div>
      </div>

      {/* Main Body Skeleton */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800/80 space-y-4 min-h-[420px]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/60">
          <div className="h-4 w-48 bg-slate-800 rounded" />
          <div className="h-7 w-32 bg-slate-800 rounded-xl" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 w-full bg-slate-900/40 border border-slate-800/50 rounded-xl flex items-center px-4 justify-between">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-slate-800" />
                <div className="h-3 w-44 bg-slate-800 rounded" />
              </div>
              <div className="h-3 w-24 bg-slate-800/60 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
