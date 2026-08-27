import React, { useState } from 'react';
import {
  Shield,
  Upload,
  Search,
  X,
  Bell,
  LogOut,
  ChevronDown,
  User,
  ShieldAlert,
  Sparkles,
  Lock,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = ({
  onOpenUpload,
  onOpenCommandPalette,
  activeTab,
  searchQuery,
  setSearchQuery
}) => {
  const { user, logout } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, title: 'Zero-Knowledge Session Active', time: 'Just now', type: 'shield' },
    { id: 2, title: 'SHA-256 Stream Integrity Verified', time: '10m ago', type: 'check' },
    { id: 3, title: 'RSA-2048 PKI Keypair Synchronized', time: '1h ago', type: 'key' },
  ];

  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'overview': return 'Overview Workspace';
      case 'files': return 'My Cloud Storage';
      case 'recent': return 'Recent Files';
      case 'favorites': return 'Starred Confidential Files';
      case 'shared': return 'Shared With Me';
      case 'shared_links': return 'Public Expirable Links';
      case 'vault': return 'Zero-Knowledge Vault';
      case 'activity': return 'Security Audit & Telemetry';
      case 'integrity': return 'Integrity Center';
      case 'stats': return 'Storage & Quota Analytics';
      case 'trash': return 'Encrypted Trash Repository';
      case 'settings': return 'Workspace Settings';
      default: return 'SecureCloud Storage';
    }
  };

  return (
    <header className="glass-panel sticky top-3 z-30 px-5 py-3 mb-5 flex items-center justify-between transition-all duration-300 border-slate-800/80">
      {/* Left: Breadcrumbs / Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono text-gray-400">SecureCloud</span>
              <span className="text-gray-600">/</span>
              <h2 className="text-xs font-bold font-heading text-gray-100">{getBreadcrumbTitle()}</h2>
            </div>
            <div className="text-[10px] text-cyan-400 font-mono flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              AES-256-GCM Zero-Trust E2EE
            </div>
          </div>
        </div>
      </div>

      {/* Center: Search / Command Palette Trigger */}
      <div className="flex-1 max-w-md mx-6 relative">
        <Search className="w-4 h-4 text-cyan-400/70 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Search files, tags, or press ⌘K for command center..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClick={onOpenCommandPalette}
          className="input-field pl-10 pr-12 py-2 text-xs bg-slate-950/70 border-slate-800 focus:border-cyan-400/80 rounded-xl cursor-pointer"
        />
        <button
          onClick={onOpenCommandPalette}
          className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-cyan-400/80 bg-slate-900 border border-slate-800 rounded hover:border-cyan-500/40"
        >
          ⌘K
        </button>
      </div>

      {/* Right: Actions, Notifications & Profile */}
      <div className="flex items-center gap-3.5">
        {/* Upload Button */}
        <button
          onClick={onOpenUpload}
          className="btn-primary text-xs py-2 px-3.5 shadow-lg shadow-cyan-500/20"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>+ Upload</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-slate-800/60 rounded-xl transition-all relative border border-slate-800/80"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          </button>

          {showNotifications && (
            <div
              className="absolute right-0 top-10 w-72 glass-panel bg-slate-900/95 border-slate-700 py-3 z-40 shadow-2xl rounded-2xl animate-fade-in"
              onMouseLeave={() => setShowNotifications(false)}
            >
              <div className="px-4 pb-2 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold font-heading text-gray-100">Security Telemetry</span>
                <span className="text-[10px] text-emerald-400 font-mono">Live</span>
              </div>
              <div className="divide-y divide-slate-800/60 max-h-56 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="p-3 hover:bg-slate-800/50 transition-colors">
                    <div className="text-xs font-semibold text-gray-200">{n.title}</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">{n.time}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-800/80 hidden sm:block"></div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2.5 p-1.5 pr-2.5 bg-slate-950/60 rounded-xl border border-slate-800 hover:border-slate-700 transition-all"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 border border-indigo-400/40 flex items-center justify-center text-xs font-bold text-white shadow-sm">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-gray-200 truncate max-w-[100px]">
                {user?.full_name || 'Admin'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {showUserDropdown && (
            <div
              className="absolute right-0 top-12 w-56 glass-panel bg-slate-900/95 border-slate-700 py-2 z-40 shadow-2xl rounded-2xl animate-fade-in"
              onMouseLeave={() => setShowUserDropdown(false)}
            >
              <div className="px-3.5 py-2 border-b border-slate-800">
                <div className="text-xs font-bold text-gray-100">{user?.full_name || 'Administrator'}</div>
                <div className="text-[10px] text-cyan-400/80 font-mono truncate">{user?.email}</div>
              </div>

              <div className="py-1">
                <div className="px-3.5 py-1.5 text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>RSA-2048 Vault Certified</span>
                </div>
              </div>

              <div className="pt-1 border-t border-slate-800">
                <button
                  onClick={logout}
                  className="w-full px-3.5 py-2 text-left text-xs text-rose-400 hover:bg-rose-500/15 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out of Vault</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
