import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  CheckCircle2,
  Download,
  Smartphone,
  Mail,
  FileText,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const Navbar = ({
  onOpenUpload,
  onOpenCommandPalette,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  installPrompt,
  onTriggerInstall
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDayMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, title: 'Zero-Knowledge Session Active', time: 'Just now', type: 'shield' },
    { id: 2, title: 'SHA-256 Stream Integrity Verified', time: '10m ago', type: 'check' },
    { id: 3, title: 'RSA-2048 PKI Keypair Synchronized', time: '1h ago', type: 'key' },
  ];

  const getBreadcrumbTitle = () => {
    const path = location?.pathname || '';
    if (path === '/' || path === '/overview') return 'Overview Workspace';
    if (path === '/files') return 'My Cloud Storage';
    if (path === '/recent') return 'Recent Files';
    if (path === '/favorites') return 'Starred Confidential Files';
    if (path === '/shared') return 'Shared With Me';
    if (path === '/shared-links') return 'Public Expirable Links';
    if (path === '/vault') return 'Zero-Knowledge Vault';
    if (path === '/documents' || path === '/notes') return 'Notes & Docs Workspace';
    if (path === '/chat') return 'Private Encrypted Chat';
    if (path === '/contacts') return 'Cryptographic Contacts';
    if (path === '/pricing' || path === '/subscriptions') return 'Plans & Quotas';
    if (path === '/admin') return 'Administrator Command Center';
    if (path === '/activity' || path === '/audit') return 'Security Audit & Telemetry';
    if (path === '/integrity') return 'Integrity Center';
    if (path === '/analytics' || path === '/stats') return 'Storage & Quota Analytics';
    if (path === '/trash') return 'Encrypted Trash Repository';
    if (path === '/settings') return 'Workspace Settings';
    if (path === '/contact') return 'Contact Support & Help Desk';
    if (path === '/terms') return 'Terms of Service';
    if (path === '/privacy') return 'Privacy Policy';
    if (path === '/security') return 'Security Architecture';
    if (path === '/permissions') return 'Device Permissions';

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
      case 'contact': return 'Contact Support & Help Desk';
      case 'terms': return 'Terms, Privacy & Legal Policies';
      default: return 'SecureCloud Storage';
    }
  };

  return (
    <header className="glass-panel sticky top-3 z-30 px-4 sm:px-5 py-3 mb-5 flex items-center justify-between gap-3 transition-all duration-300 border-slate-800/80">
      {/* Left: Breadcrumbs / Title */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs font-bold font-mono text-gray-400 hidden xs:inline">SecureCloud</span>
              <span className="text-gray-600 hidden xs:inline">/</span>
              <h2 className="text-xs font-bold font-heading text-gray-100 truncate">{getBreadcrumbTitle()}</h2>
            </div>
            <div className="text-[10px] text-cyan-400 font-mono flex items-center gap-1.5 mt-0.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate">AES-256-GCM End-to-End Encrypted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Center: Search / Command Palette Trigger (Responsive, no overlap) */}
      <div className="hidden sm:flex flex-1 max-w-xs md:max-w-sm lg:max-w-md mx-2 md:mx-4 min-w-0 relative">
        <Search className="w-4 h-4 text-cyan-400/80 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none shrink-0 z-10" />
        <input
          type="text"
          placeholder="Search files, tags (⌘K)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClick={onOpenCommandPalette}
          style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
          className="input-field py-2 text-xs bg-slate-950/70 border-slate-800 focus:border-cyan-400/80 rounded-xl cursor-pointer truncate placeholder:text-ellipsis"
        />
        <button
          onClick={onOpenCommandPalette}
          className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono text-cyan-400/80 bg-slate-900 border border-slate-800 rounded hover:border-cyan-500/40 shrink-0 z-10"
        >
          ⌘K
        </button>
      </div>

      {/* Right: Actions, Notifications & Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0 ml-auto">
        {/* Install Web App Button */}
        {installPrompt && (
          <button
            onClick={onTriggerInstall}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-cyan-500/20 border border-purple-500/40 hover:border-purple-400 text-purple-300 hover:text-white transition-all shadow-md shadow-purple-500/15"
          >
            <Smartphone className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden xs:inline">Install App</span>
          </button>
        )}

        {/* Theme Toggle (Icon Only) */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-800 text-gray-300 hover:text-cyan-300 transition-all shadow-sm flex items-center justify-center"
        >
          {isDayMode ? (
            <Sun className="w-4 h-4 text-amber-500 animate-spin-slow" />
          ) : (
            <Moon className="w-4 h-4 text-cyan-400" />
          )}
        </button>

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
              <div className="px-3.5 py-2.5 border-b border-slate-800 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-gray-100 truncate">{user?.full_name || 'Administrator'}</div>
                  <div className="text-[10px] text-cyan-400 font-mono">@{user?.username || 'user'}</div>
                </div>
              </div>

              <div className="p-1.5 space-y-0.5">
                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    if (navigate) navigate('/settings');
                    if (setActiveTab) setActiveTab('settings');
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-gray-200 hover:text-cyan-300 hover:bg-slate-800/60 rounded-xl flex items-center gap-2 transition-colors font-medium"
                >
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Account & Profile</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    if (navigate) navigate('/pricing');
                    if (setActiveTab) setActiveTab('subscriptions');
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-gray-200 hover:text-purple-300 hover:bg-slate-800/60 rounded-xl flex items-center justify-between transition-colors font-medium"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>Plan:</span>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-purple-300 uppercase px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
                    {user?.is_promotional_premium ? 'Premium Tier' : (user?.plan_type || 'Basic')}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    if (navigate) navigate('/contact');
                    if (setActiveTab) setActiveTab('contact');
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-gray-200 hover:text-cyan-300 hover:bg-slate-800/60 rounded-xl flex items-center gap-2 transition-colors font-medium"
                >
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Contact Support</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    if (navigate) navigate('/terms');
                    if (setActiveTab) setActiveTab('terms');
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-gray-200 hover:text-cyan-300 hover:bg-slate-800/60 rounded-xl flex items-center gap-2 transition-colors font-medium"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Terms & Privacy</span>
                </button>
              </div>

              <div className="pt-1 border-t border-slate-800 px-1.5">
                <button
                  onClick={logout}
                  className="w-full px-3 py-2 text-left text-xs text-rose-400 hover:bg-rose-500/15 rounded-xl flex items-center gap-2 transition-colors font-medium"
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
