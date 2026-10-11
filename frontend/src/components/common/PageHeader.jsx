import React from 'react';
import { Shield, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PageHeader = ({
  icon: Icon = Shield,
  title,
  subtitle,
  breadcrumb,
  badgeText = 'End-to-End Encrypted',
  badgeColor = 'cyan',
  onRefresh,
  isRefreshing = false,
  actions
}) => {
  return (
    <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800/80 mb-5 relative overflow-hidden shadow-lg animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Side: Icon, Breadcrumbs, Title */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-indigo-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
              <Link to="/overview" className="hover:text-cyan-400 transition-colors">SecureCloud</Link>
              <span>/</span>
              <span className="text-cyan-300 font-semibold">{breadcrumb || title}</span>
              {badgeText && (
                <span className={`hidden md:inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                  badgeColor === 'emerald'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : badgeColor === 'amber'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : badgeColor === 'purple'
                    ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                    : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {badgeText}
                </span>
              )}
            </div>
            <h1 className="text-base sm:text-lg font-bold font-heading text-gray-100 tracking-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-gray-400 truncate max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Refresh and Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold border border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:border-cyan-500/40 text-gray-300 hover:text-cyan-300 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              aria-label="Refresh data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
};
