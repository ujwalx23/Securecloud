import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { OverviewDashboard } from './components/OverviewDashboard';
import { FileManager } from './components/FileManager';
import { VaultView } from './components/VaultView';
import { ActivityLog } from './components/ActivityLog';
import { StorageStats } from './components/StorageStats';
import { IntegrityCenter } from './components/IntegrityCenter';
import { SettingsView } from './components/SettingsView';
import { FileUploadModal } from './components/FileUploadModal';
import { ShareModal } from './components/ShareModal';
import { PreviewModal } from './components/PreviewModal';
import { PublicShareView } from './components/PublicShareView';
import { CommandPalette } from './components/CommandPalette';
import { FileDetailsDrawer } from './components/FileDetailsDrawer';
import { CyberCanvas3D } from './components/CyberCanvas3D';
import {
  Shield,
  Lock,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Eye,
  EyeOff,
  Server,
  Zap,
  Cpu,
  Fingerprint,
  Mail,
  RefreshCw
} from 'lucide-react';

const MainApp = () => {
  const { user, token, loading, login, register, verifyEmail, resendCode } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [storageStats, setStorageStats] = useState(null);
  const [recentFilesList, setRecentFilesList] = useState([]);

  // Command palette state
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // File Details Drawer
  const [selectedFileForDrawer, setSelectedFileForDrawer] = useState(null);

  // URL routing for public share links
  const [shareCode, setShareCode] = useState(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/share\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    const params = new URLSearchParams(window.location.search);
    if (params.get('share')) return params.get('share');
    const hash = window.location.hash;
    const hashMatch = hash.match(/^#\/share\/([a-zA-Z0-9_-]+)/);
    if (hashMatch) return hashMatch[1];
    return null;
  });

  // Auth form states
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Email verification state
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Modals state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [shareFile, setShareFile] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/stats/summary', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setStorageStats(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  const fetchRecentFiles = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/files', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const files = await res.json();
        setRecentFilesList(files);
      }
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const match = path.match(/^\/share\/([a-zA-Z0-9_-]+)/);
      if (match) setShareCode(match[1]);
      else {
        const params = new URLSearchParams(window.location.search);
        setShareCode(params.get('share') || null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    fetchStats();
    fetchRecentFiles();
  }, [fetchStats, fetchRecentFiles, activeTab]);

  // Global Ctrl+K Command Palette Shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (shareCode) {
    return (
      <PublicShareView
        shareCode={shareCode}
        onGoToApp={() => {
          window.history.pushState({}, '', '/');
          setShareCode(null);
        }}
      />
    );
  }

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);

    if (isRegister && password.length < 8) {
      setAuthError('Password must be at least 8 characters long for secure key derivation.');
      return;
    }

    setAuthLoading(true);
    try {
      if (isRegister) {
        await register(email, password, fullName);
        setIsVerifyingEmail(true);
        showToast({
          type: 'info',
          title: 'Verification Code Sent',
          message: `A 6-digit confirmation code was dispatched to ${email}.`
        });
      } else {
        await login(email, password);
        showToast({
          type: 'success',
          title: 'Session Authenticated',
          message: 'Zero-knowledge session decrypted and authorized.'
        });
      }
    } catch (err) {
      if (err.isUnverified) {
        setIsVerifyingEmail(true);
      }
      setAuthError(err.message);
      showToast({
        type: 'error',
        title: 'Authentication Failed',
        message: err.message
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyEmailSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    if (!verificationCode || verificationCode.trim().length !== 6) {
      setAuthError('Please enter the complete 6-digit code.');
      return;
    }
    setAuthLoading(true);
    try {
      await verifyEmail(email, verificationCode.trim());
      showToast({
        type: 'success',
        title: 'Email Verified',
        message: 'Your account is active! Logging in...'
      });
      setIsVerifyingEmail(false);
      setVerificationCode('');
      if (password) {
        await login(email, password);
      } else {
        setIsRegister(false);
      }
    } catch (err) {
      setAuthError(err.message);
      showToast({
        type: 'error',
        title: 'Verification Failed',
        message: err.message
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    try {
      await resendCode(email);
      showToast({
        type: 'info',
        title: 'Code Resent',
        message: `Fresh verification code dispatched to ${email}.`
      });
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Resend Failed',
        message: err.message
      });
    }
  };

  const handleDownload = async (file) => {
    try {
      const res = await fetch(`/api/files/${file.id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast({
        type: 'success',
        title: 'Payload Decrypted',
        message: `Successfully decrypted & downloaded ${file.original_name}`
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Decryption Error',
        message: err.message
      });
    }
  };

  const handleToggleFavorite = async (item, isFolder) => {
    try {
      const endpoint = isFolder ? `/api/folders/${item.id}/favorite` : `/api/files/${item.id}/favorite`;
      await fetch(endpoint, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRecentFiles();
      fetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTrash = async (item, isFolder) => {
    try {
      const endpoint = isFolder ? `/api/folders/${item.id}/trash` : `/api/files/${item.id}/trash`;
      await fetch(endpoint, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRecentFiles();
      fetchStats();
      showToast({
        type: 'warning',
        title: 'Item Moved to Trash',
        message: `${item.original_name || item.name} moved to encrypted trash.`
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePermanent = async (item, isFolder) => {
    try {
      const endpoint = isFolder ? `/api/folders/${item.id}` : `/api/files/${item.id}`;
      await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRecentFiles();
      fetchStats();
      showToast({
        type: 'info',
        title: 'Permanently Deleted',
        message: `Ciphertext erased from storage.`
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050811] flex flex-col items-center justify-center text-cyan-400 font-mono text-xs space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center animate-pulse">
          <Shield className="w-6 h-6 text-cyan-400" />
        </div>
        <p className="animate-pulse">Initializing SecureCloud Hybrid Cryptographic Engine...</p>
      </div>
    );
  }

  // 3D Impressive Authentication & Hero Landing Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-[#050811] flex items-center justify-center p-4 lg:p-12 relative overflow-hidden text-gray-100">
        {/* Background Ambient Glow Lights */}
        <div className="absolute top-1/4 left-1/4 w-[650px] h-[650px] bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[550px] h-[550px] bg-indigo-600/12 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/5 rounded-full blur-[180px] pointer-events-none" />

        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          
          {/* Left Column: 3D Interactive Cyber Canvas & Features */}
          <div className="space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/15 to-indigo-500/15 border border-cyan-500/35 text-cyan-300 text-xs font-mono font-semibold shadow-lg shadow-cyan-500/10">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              RSA-2048 PKI + AES-256-GCM Cryptographic Framework
            </div>

            <h1 className="text-4xl lg:text-5xl font-black font-heading tracking-tight leading-tight">
              Zero-Knowledge <span className="gradient-text">Encrypted Storage</span> & Shared Data Vault
            </h1>

            <p className="text-sm text-gray-400 leading-relaxed max-w-lg font-medium">
              Enterprise-grade hybrid cryptography combining asymmetric 2048-bit RSA key distribution with hardware-accelerated AES-256-GCM authenticated payload ciphers.
            </p>

            {/* Interactive 3D Earth Globe Canvas */}
            <div className="glass-panel p-2 h-72 border-cyan-500/25 relative flex items-center justify-center shadow-2xl overflow-hidden group">
              <CyberCanvas3D />
              <div className="absolute bottom-3 left-4 text-[10px] font-mono text-cyan-300 flex items-center gap-2 pointer-events-none bg-slate-950/80 px-3 py-1 rounded-lg border border-cyan-500/30 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Interactive 3D Cryptographic Earth • Click & Drag to Rotate</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-gray-300">
              <div className="flex items-center gap-2.5 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero-Knowledge Architecture</span>
              </div>
              <div className="flex items-center gap-2.5 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>SHA-256 Stream Integrity</span>
              </div>
              <div className="flex items-center gap-2.5 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Expirable Password Links</span>
              </div>
              <div className="flex items-center gap-2.5 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Real-Time Audit Trail</span>
              </div>
            </div>
          </div>

          {/* Right Column: Glassmorphic Auth Form */}
          <div className="glass-panel p-8 space-y-6 border-slate-800/80 shadow-2xl relative">
            {isVerifyingEmail ? (
              <div className="space-y-6 animate-fade-in">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto shadow-xl shadow-cyan-500/20">
                    <Mail className="w-7 h-7 drop-shadow-md" />
                  </div>
                  <h2 className="text-2xl font-black font-heading text-gray-100">
                    Verify Your Email
                  </h2>
                  <p className="text-xs text-gray-400">
                    Enter the 6-digit confirmation code dispatched to:
                  </p>
                  <p className="text-xs font-mono font-bold text-cyan-400">
                    {email}
                  </p>
                </div>

                <form onSubmit={handleVerifyEmailSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5 text-center">
                      6-Digit Security Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      autoFocus
                      placeholder="• • • • • •"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                      className="input-field text-center font-mono text-2xl tracking-[0.5em] py-3.5 bg-slate-950/90 border-cyan-500/40 text-cyan-300 focus:border-cyan-400"
                    />
                  </div>

                  {authError && (
                    <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
                      <span>{authError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="btn-primary w-full justify-center text-xs py-3 shadow-lg shadow-cyan-500/25"
                  >
                    {authLoading ? 'Verifying Security Code...' : 'Verify & Activate Vault'}{' '}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsVerifyingEmail(false);
                      setAuthError(null);
                    }}
                    className="text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    &larr; Back to Login
                  </button>
                  <button
                    type="button"
                    disabled={resendCooldown > 0}
                    onClick={handleResendCode}
                    className="text-cyan-400 hover:text-cyan-300 font-mono font-semibold disabled:text-gray-600 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? 'animate-spin' : ''}`} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 flex items-center justify-center mx-auto shadow-xl shadow-cyan-500/30">
                    <Shield className="w-7 h-7 text-white drop-shadow-md" />
                  </div>
                  <h2 className="text-2xl font-black font-heading text-gray-100">
                    {isRegister ? 'Initialize Secure Vault' : 'Authenticate Session'}
                  </h2>
                  <p className="text-xs text-gray-400 font-mono">
                    {isRegister ? 'Generates RSA-2048 PKI keypair on registration' : 'Sign in to decrypt stored files and secrets'}
                  </p>
                </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {isRegister && (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-field text-xs py-3"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Account Email</label>
                <input
                  type="email"
                  required
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field text-xs py-3"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Master Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field text-xs py-3 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-400 focus:outline-none transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {isRegister && password && (
                  <div className="space-y-1 mt-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-gray-400">Password Strength:</span>
                      <span className={password.length >= 12 ? 'text-emerald-400 font-semibold' : password.length >= 8 ? 'text-amber-400 font-semibold' : 'text-rose-400 font-semibold'}>
                        {password.length < 8 ? 'Too Short (min 8 chars)' : password.length >= 12 ? 'Strong (High Entropy)' : 'Good'}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          password.length < 8 ? 'w-1/4 bg-rose-500' : password.length >= 12 ? 'w-full bg-emerald-500' : 'w-2/3 bg-amber-500'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {authError && (
                <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="btn-primary w-full justify-center text-xs py-3 shadow-lg shadow-cyan-500/25"
              >
                {authLoading
                  ? 'Verifying Cryptographic Credentials...'
                  : isRegister
                  ? 'Generate RSA Keys & Create Vault'
                  : 'Authenticate & Decrypt Session'}{' '}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>


                <div className="text-center text-xs text-gray-400">
                  {isRegister ? 'Already have an encrypted vault?' : "Don't have a vault account?"}{' '}
                  <button
                    onClick={() => {
                      setIsRegister(!isRegister);
                      setAuthError(null);
                    }}
                    className="text-cyan-400 font-bold hover:underline ml-1"
                  >
                    {isRegister ? 'Sign In' : 'Register Account'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050811] text-gray-100 p-4 md:p-6 max-w-[1680px] mx-auto animate-fade-in">
      <Navbar
        onOpenUpload={() => setShowUploadModal(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        activeTab={activeTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <div className="flex gap-6 items-start">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          storageStats={storageStats}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />

        <main className="flex-1 min-w-0">
          {activeTab === 'overview' && (
            <OverviewDashboard
              user={user}
              storageStats={storageStats}
              recentFiles={recentFilesList}
              onOpenUpload={() => setShowUploadModal(true)}
              onNavigate={(tab) => setActiveTab(tab)}
              onPreview={(file) => setPreviewFile(file)}
              onDownload={handleDownload}
              onShare={(file) => setShareFile(file)}
              onToggleFavorite={handleToggleFavorite}
              onToggleTrash={handleToggleTrash}
              onDeletePermanent={handleDeletePermanent}
              onInspectFile={(file) => setSelectedFileForDrawer(file)}
            />
          )}

          {(activeTab === 'files' || activeTab === 'recent' || activeTab === 'favorites' || activeTab === 'shared' || activeTab === 'shared_links' || activeTab === 'trash') && (
            <FileManager
              activeTab={activeTab}
              searchQuery={searchQuery}
              onOpenUpload={() => setShowUploadModal(true)}
              onPreview={(file) => setPreviewFile(file)}
              onDownload={handleDownload}
              onShare={(file) => setShareFile(file)}
              onUpdateStats={() => { fetchStats(); fetchRecentFiles(); }}
              onInspectFile={(file) => setSelectedFileForDrawer(file)}
            />
          )}

          {activeTab === 'vault' && <VaultView />}
          {activeTab === 'activity' && <ActivityLog />}
          {activeTab === 'integrity' && <IntegrityCenter storageStats={storageStats} />}
          {activeTab === 'stats' && <StorageStats stats={storageStats} />}
          {activeTab === 'settings' && <SettingsView storageStats={storageStats} />}
        </main>
      </div>

      {/* Modals & Drawers */}
      {showUploadModal && (
        <FileUploadModal
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={() => {
            fetchStats();
            fetchRecentFiles();
            showToast({
              type: 'success',
              title: 'Upload Successful',
              message: 'Ciphertext stored with AES-256 Galois/Counter Mode'
            });
          }}
        />
      )}

      {shareFile && (
        <ShareModal
          file={shareFile}
          onClose={() => setShareFile(null)}
        />
      )}

      {previewFile && (
        <PreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onDownload={handleDownload}
        />
      )}

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(tab) => setActiveTab(tab)}
        onOpenUpload={() => setShowUploadModal(true)}
        onOpenNewFolder={() => setActiveTab('files')}
        recentFiles={recentFilesList}
      />

      {selectedFileForDrawer && (
        <FileDetailsDrawer
          file={selectedFileForDrawer}
          onClose={() => setSelectedFileForDrawer(null)}
          onPreview={(file) => setPreviewFile(file)}
          onDownload={handleDownload}
          onShare={(file) => setShareFile(file)}
          onToggleFavorite={handleToggleFavorite}
          onToggleTrash={handleToggleTrash}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </AuthProvider>
  );
}
