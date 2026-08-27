import React from 'react';
import {
  LayoutDashboard,
  Folder,
  Clock,
  Star,
  Share2,
  Link as LinkIcon,
  KeyRound,
  Shield,
  ShieldCheck,
  PieChart,
  Trash2,
  Settings,
  HardDrive,
  ChevronLeft,
  ChevronRight,
  Server
} from 'lucide-react';

export const Sidebar = ({
  activeTab,
  setActiveTab,
  storageStats,
  isCollapsed,
  setIsCollapsed
}) => {
  const navSections = [
    {
      title: 'WORKSPACE',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'files', label: 'My Cloud', icon: Folder, badge: storageStats?.file_count || null },
        { id: 'recent', label: 'Recent', icon: Clock },
        { id: 'favorites', label: 'Starred', icon: Star },
        { id: 'shared', label: 'Shared With Me', icon: Share2 },
        { id: 'shared_links', label: 'Shared Links', icon: LinkIcon },
      ]
    },
    {
      title: 'SECURITY',
      items: [
        { id: 'vault', label: 'Zero-Knowledge Vault', icon: KeyRound, isSpecial: true },
        { id: 'activity', label: 'Security Audit', icon: Shield },
        { id: 'integrity', label: 'Integrity Center', icon: ShieldCheck },
      ]
    },
    {
      title: 'ANALYTICS',
      items: [
        { id: 'stats', label: 'Storage Analytics', icon: PieChart },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { id: 'trash', label: 'Encrypted Trash', icon: Trash2 },
        { id: 'settings', label: 'Settings', icon: Settings },
      ]
    }
  ];

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const usedBytes = storageStats?.used_bytes || 0;
  const totalBytes = storageStats?.total_quota_bytes || 15 * 1024 * 1024 * 1024;
  const percentage = Math.min(100, Math.round((usedBytes / totalBytes) * 100));

  return (
    <aside
      className={`glass-panel p-3.5 flex flex-col justify-between shrink-0 transition-all duration-300 border-slate-800/80 min-h-[calc(100vh-110px)] ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Header & Navigation */}
      <div className="space-y-4">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pb-3 border-b border-slate-800/80">
          {!isCollapsed ? (
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black font-heading gradient-text tracking-tight">SecureCloud</h1>
                <span className="badge badge-cyan text-[9px] py-0 px-1.5 font-mono">v2.0</span>
              </div>
              <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Protected
              </p>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-indigo-600 flex items-center justify-center mx-auto text-white shadow-md">
              <Shield className="w-4 h-4" />
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-slate-800/60 rounded-lg transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="space-y-3.5">
          {navSections.map((sec) => (
            <div key={sec.title} className="space-y-1">
              {!isCollapsed && (
                <div className="px-2.5 text-[9px] font-bold text-gray-500 uppercase tracking-widest font-mono">
                  {sec.title}
                </div>
              )}

              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group relative ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500/20 via-indigo-500/15 to-purple-500/10 text-cyan-300 border border-cyan-500/40 shadow-md shadow-cyan-500/10'
                        : 'text-gray-400 hover:text-gray-100 hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className={`p-1.5 rounded-lg transition-colors ${
                        isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-900/60 text-gray-400 group-hover:text-cyan-400'
                      }`}>
                        <Icon className="w-4 h-4 shrink-0" />
                      </div>
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!isCollapsed && item.badge !== null && item.badge > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-900 text-cyan-400 border border-cyan-500/30">
                        {item.badge}
                      </span>
                    )}

                    {!isCollapsed && item.isSpecial && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Storage Quota Card */}
      {!isCollapsed ? (
        <div className="space-y-2 pt-3 border-t border-slate-800/80">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-gray-200">
              <div className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>Storage</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                {percentage}%
              </span>
            </div>

            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(percentage, 2)}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-gray-400 font-mono">
              <span>{formatBytes(usedBytes)} used</span>
              <span>{formatBytes(totalBytes)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="pt-2 border-t border-slate-800 flex justify-center">
          <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400" title={`Storage: ${percentage}% used`}>
            <HardDrive className="w-4 h-4" />
          </div>
        </div>
      )}
    </aside>
  );
};
