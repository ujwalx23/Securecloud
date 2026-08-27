import React from 'react';
import {
  PieChart,
  HardDrive,
  FileText,
  Image as ImageIcon,
  Code,
  Archive,
  Layers,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Server
} from 'lucide-react';

export const StorageStats = ({ stats }) => {
  if (!stats) return null;

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const categories = [
    { label: 'Documents & PDFs', key: 'documents', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', icon: FileText },
    { label: 'Media & Streaming', key: 'media', color: '#00f5ff', bg: 'rgba(0, 245, 255, 0.15)', icon: ImageIcon },
    { label: 'Code & Scripts', key: 'code', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', icon: Code },
    { label: 'Compressed Archives', key: 'archives', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)', icon: Archive },
    { label: 'Other Binary Payloads', key: 'other', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', icon: Layers },
  ];

  const usedBytes = stats.used_bytes || 0;
  const totalBytes = stats.total_quota_bytes || 15 * 1024 * 1024 * 1024;
  const usedPercent = Math.min(100, Math.round((usedBytes / totalBytes) * 100));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="glass-panel p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-slate-800/80 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-md">
            <PieChart className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-100">Storage & Cryptographic Capacity</h2>
              <span className="badge badge-emerald text-[10px]">Active</span>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Live quota distribution, categorical telemetry, and integrity metrics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/60 px-3.5 py-2 rounded-xl border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 font-mono font-semibold">Integrity Verified (SHA-256)</span>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold">
            <span>Used Capacity</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black font-mono gradient-text">{formatBytes(stats.used_bytes)}</h3>
            <p className="text-[11px] text-gray-400 font-mono mt-1">
              {usedPercent}% of {formatBytes(stats.total_quota_bytes)} quota allocated
            </p>
          </div>
        </div>

        <div className="glass-card p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold">
            <span>Available Storage</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black font-mono text-emerald-400">{formatBytes(stats.available_bytes)}</h3>
            <p className="text-[11px] text-gray-400 font-mono mt-1">
              Remaining free space for encrypted uploads
            </p>
          </div>
        </div>

        <div className="glass-card p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold">
            <span>Encrypted Objects</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black font-mono text-purple-300">{stats.file_count} Files</h3>
            <p className="text-[11px] text-gray-400 font-mono mt-1">
              Organized across {stats.folder_count} directories
            </p>
          </div>
        </div>
      </div>

      {/* Categorical Distribution Breakdown */}
      <div className="glass-panel p-6 space-y-6 border-slate-800/80 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-100">Categorical Storage Breakdown</h3>
            <p className="text-xs text-gray-400 font-mono">Calculated by encrypted payload mime-type</p>
          </div>
          <span className="text-xs font-mono text-cyan-400 font-semibold">{formatBytes(stats.used_bytes)} Total</span>
        </div>

        {/* Multi-segmented Progress Bar */}
        <div className="w-full bg-slate-950 h-3.5 rounded-full overflow-hidden flex p-0.5 border border-slate-800 shadow-inner">
          {categories.map((cat) => {
            const size = stats.category_breakdown?.[cat.key] || 0;
            const pct = stats.used_bytes ? (size / stats.used_bytes) * 100 : 0;
            if (pct <= 0) return null;
            return (
              <div
                key={cat.key}
                className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-500 hover:brightness-125 cursor-pointer"
                style={{ width: `${pct}%`, backgroundColor: cat.color }}
                title={`${cat.label}: ${formatBytes(size)} (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>

        {/* Category Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {categories.map((cat) => {
            const size = stats.category_breakdown?.[cat.key] || 0;
            const Icon = cat.icon;
            const pct = stats.used_bytes ? ((size / stats.used_bytes) * 100).toFixed(1) : '0';

            return (
              <div key={cat.key} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all">
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                    style={{ backgroundColor: cat.bg, borderColor: `${cat.color}40`, color: cat.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-200">{cat.label}</h4>
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">{formatBytes(size)}</p>
                  </div>
                </div>
                <span className="badge font-mono text-[10px]" style={{ color: cat.color, backgroundColor: cat.bg }}>
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
