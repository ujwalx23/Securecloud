import React from 'react';
import {
  Settings,
  User,
  Shield,
  Key,
  Lock,
  HardDrive,
  CheckCircle2,
  Fingerprint,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SettingsView = ({ storageStats }) => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-panel p-6 flex items-center justify-between border-slate-800/80 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-md">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-heading text-gray-100">Security & Workspace Settings</h2>
              <span className="badge badge-cyan text-[10px]">Active</span>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Account identity, hardware cipher parameters, and quota limits
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Identity */}
        <div className="glass-panel p-6 border-slate-800/80 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <User className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold font-heading text-gray-100">User Identity & Profile</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-gray-400 font-mono text-[10px]">Full Name</label>
              <div className="font-semibold text-gray-200 mt-0.5">{user?.full_name || 'Administrator'}</div>
            </div>
            <div>
              <label className="text-gray-400 font-mono text-[10px]">Account Email</label>
              <div className="font-semibold text-cyan-300 font-mono mt-0.5">{user?.email}</div>
            </div>
            <div>
              <label className="text-gray-400 font-mono text-[10px]">Account Role</label>
              <div className="font-semibold text-emerald-400 font-mono mt-0.5">Security Administrator (E2EE)</div>
            </div>
          </div>
        </div>

        {/* Cryptographic Keypair Status */}
        <div className="glass-panel p-6 border-slate-800/80 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Fingerprint className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold font-heading text-gray-100">PKI Key Status</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 font-mono">Asymmetric Key Type:</span>
              <span className="badge badge-purple font-mono text-[10px]">RSA-2048 OAEP</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 font-mono">Private Key Cipher:</span>
              <span className="badge badge-cyan font-mono text-[10px]">PBKDF2HMAC + AES-256</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 font-mono">Zero-Knowledge State:</span>
              <span className="badge badge-emerald font-mono text-[10px]">Hardware Verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
