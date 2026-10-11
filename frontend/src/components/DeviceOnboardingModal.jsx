import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Bell,
  HardDrive,
  Download,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  ArrowRight,
  FileText,
  Mail,
  Smartphone
} from 'lucide-react';

export const DeviceOnboardingModal = ({
  onOpenLegal,
  onOpenContact,
  installPrompt,
  onTriggerInstall
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [allowNotifications, setAllowNotifications] = useState(true);
  const [hasInstalled, setHasInstalled] = useState(false);

  useEffect(() => {
    const hasConsented = localStorage.getItem('securecloud_device_consented_v1');
    if (!hasConsented) {
      // Small timeout for smooth initial load transition
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAndContinue = async () => {
    // 1. Save consent to localStorage
    localStorage.setItem('securecloud_device_consented_v1', new Date().toISOString());

    // 2. Request Notification permission if toggled
    if (allowNotifications && 'Notification' in window) {
      try {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      } catch (err) {
        console.warn('Notification permission note:', err);
      }
    }

    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
      <div className="glass-panel max-w-xl w-full p-6 sm:p-8 rounded-3xl border border-cyan-500/40 shadow-2xl relative bg-slate-950/95 space-y-6 my-auto">
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="text-center space-y-2 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 flex items-center justify-center mx-auto text-white shadow-xl shadow-cyan-500/30">
            <ShieldCheck className="w-8 h-8 drop-shadow-md" />
          </div>
          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="badge badge-cyan text-[10px] font-mono">Zero-Knowledge Setup</span>
            <span className="badge badge-emerald text-[10px] font-mono">First-Time Device</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-heading text-gray-100">
            Welcome to SecureCloud
          </h2>
          <p className="text-xs text-gray-300 max-w-md mx-auto leading-relaxed">
            Before initializing your zero-knowledge cryptographic vault on this device, please review our essential capabilities and privacy terms.
          </p>
        </div>

        {/* Capabilities & Permissions List */}
        <div className="space-y-3 relative z-10">
          {/* Permission 1: Web Crypto Storage (Essential) */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shrink-0 mt-0.5">
              <HardDrive className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-gray-200">Local Cryptographic Storage</h4>
                <span className="badge badge-cyan text-[9px] font-mono shrink-0">Essential</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                SecureCloud derives AES-256 session keys in-memory and caches your encrypted bearer session locally so all decryption happens entirely on your device.
              </p>
            </div>
          </div>

          {/* Permission 2: Notifications */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0 mt-0.5">
              <Bell className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-gray-200">Shared Files & Chat Notifications</h4>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={allowNotifications}
                    onChange={(e) => setAllowNotifications(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                Receive instant browser notifications when colleagues send you an encrypted file share or private message.
              </p>
            </div>
          </div>

          {/* Permission 3: PWA Web App Option */}
          {installPrompt && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900 border border-purple-500/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-purple-200">Install as Native App</h4>
                  <p className="text-[11px] text-gray-400 truncate">Run standalone on desktop or phone home screen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (onTriggerInstall) {
                    await onTriggerInstall();
                    setHasInstalled(true);
                  }
                }}
                disabled={hasInstalled}
                className="btn-primary text-xs py-1.5 px-3 shrink-0 flex items-center gap-1 shadow-md shadow-purple-500/20"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{hasInstalled ? 'Installed' : 'Install App'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Legal & Policy Links */}
        <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800/80 text-[11px] text-gray-400 space-y-2 relative z-10">
          <p className="leading-relaxed">
            By clicking <strong>"Accept & Continue"</strong>, you acknowledge that SecureCloud is a zero-knowledge service and you agree to our policies:
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px]">
            <button
              type="button"
              onClick={() => onOpenLegal && onOpenLegal('terms')}
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              <FileText className="w-3 h-3" /> Terms of Service
            </button>
            <button
              type="button"
              onClick={() => onOpenLegal && onOpenLegal('privacy')}
              className="text-emerald-400 hover:underline flex items-center gap-1"
            >
              <ShieldCheck className="w-3 h-3" /> Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => onOpenContact && onOpenContact()}
              className="text-purple-400 hover:underline flex items-center gap-1"
            >
              <Mail className="w-3 h-3" /> Contact Support
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 relative z-10">
          <button
            type="button"
            onClick={handleAcceptAndContinue}
            className="btn-primary w-full justify-center text-xs py-3 shadow-xl shadow-cyan-500/25 flex items-center gap-2"
          >
            <span>Accept & Initialize Vault on this Device</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
