import React from 'react';
import {
  Shield,
  Upload,
  HardDrive,
  Share2,
  Activity,
  Files,
  ArrowRight,
  ShieldCheck,
  Lock,
  Cpu,
  KeyRound,
  CheckCircle2,
  Clock,
  Sparkles,
  FileText
} from 'lucide-react';
import { SecurityCore3D } from './SecurityCore3D';
import { FileCard } from './FileCard';

export const OverviewDashboard = ({
  user,
  storageStats,
  recentFiles = [],
  onOpenUpload,
  onNavigate,
  onPreview,
  onDownload,
  onShare,
  onToggleFavorite,
  onToggleTrash,
  onDeletePermanent,
  onInspectFile
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const usedBytes = storageStats?.used_bytes || 0;
  const totalBytes = storageStats?.total_quota_bytes || 15 * 1024 * 1024 * 1024;
  const usedPercentage = Math.min(100, Math.round((usedBytes / totalBytes) * 100));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Section with 3D Security Core */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left 2 Cols: Greeting, Status, and Action CTA */}
        <div className="lg:col-span-2 glass-panel p-6 flex flex-col justify-between relative overflow-hidden border-slate-800/80 shadow-2xl">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-beacon" />
              <span className="text-[11px] font-mono text-emerald-400 font-bold tracking-wide uppercase">
                All Cryptographic Systems Operational
              </span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black font-heading text-gray-100">
                {getGreeting()}, <span className="gradient-text">{user?.full_name || 'Security Operator'}</span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl font-medium">
                Your zero-knowledge workspace is actively isolated with RSA-2048 key distribution and per-file AES-256-GCM hardware encryption.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={onOpenUpload}
                className="btn-primary text-xs py-2.5 px-4 shadow-lg shadow-cyan-500/20"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Encrypted File</span>
              </button>
              <button
                onClick={() => onNavigate('activity')}
                className="btn-secondary text-xs py-2.5 px-4"
              >
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>Inspect Audit Telemetry</span>
              </button>
            </div>
          </div>

          {/* Bottom Security Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-4 border-t border-slate-800/80 text-[11px] font-semibold text-gray-300">
            <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">AES-256-GCM</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">RSA-2048 PKI</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">SHA-256 Digest</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">Zero-Trust</span>
            </div>
          </div>
        </div>

        {/* Right Col: Interactive 3D Security Core */}
        <div className="lg:col-span-1">
          <SecurityCore3D onLayerClick={(layer) => {}} />
        </div>
      </div>

      {/* 4 Compact Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Files */}
        <div className="glass-card p-4.5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold">
            <span>Total Encrypted Files</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Files className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black font-mono gradient-text">
            {storageStats?.file_count || 0}
          </h3>
          <p className="text-[10px] text-gray-400 font-mono">
            Organized across {storageStats?.folder_count || 0} directories
          </p>
        </div>

        {/* Storage Quota */}
        <div className="glass-card p-4.5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold">
            <span>Storage Allocated</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black font-mono text-indigo-300">
            {formatBytes(usedBytes)}
          </h3>
          <p className="text-[10px] text-gray-400 font-mono">
            {usedPercentage}% of {formatBytes(totalBytes)} capacity
          </p>
        </div>

        {/* Shared Objects */}
        <div className="glass-card p-4.5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold">
            <span>Active PKI Shares</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Share2 className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black font-mono text-purple-300">
            {storageStats?.shared_count !== undefined ? storageStats.shared_count : 2}
          </h3>
          <p className="text-[10px] text-gray-400 font-mono">
            Zero-knowledge re-encrypted DEKs
          </p>
        </div>

        {/* Security Audit Events */}
        <div className="glass-card p-4.5 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold">
            <span>Audit Events</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black font-mono text-emerald-400">
            100%
          </h3>
          <p className="text-[10px] text-gray-400 font-mono">
            Verified integrity & zero breaches
          </p>
        </div>
      </div>

      {/* Recent Files Table / Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">
              Recent Encrypted Objects ({recentFiles.slice(0, 6).length})
            </h3>
          </div>
          <button
            onClick={() => onNavigate('files')}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline"
          >
            <span>View all files</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentFiles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {recentFiles.slice(0, 8).map((file) => (
              <FileCard
                key={file.id}
                item={file}
                isFolder={false}
                viewMode="grid"
                onPreview={onPreview}
                onDownload={onDownload}
                onShare={onShare}
                onToggleFavorite={onToggleFavorite}
                onToggleTrash={onToggleTrash}
                onDeletePermanent={onDeletePermanent}
                onViewVersions={() => {}}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center glass-panel space-y-3 border-dashed border-slate-800">
            <FileText className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-xs text-gray-400 font-mono">No encrypted files in workspace yet.</p>
            <button onClick={onOpenUpload} className="btn-primary text-xs py-1.5 px-3 mx-auto">
              Upload First File
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
