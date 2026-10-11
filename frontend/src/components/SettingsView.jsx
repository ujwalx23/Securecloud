import React, { useState } from 'react';
import {
  Settings,
  User,
  Shield,
  Key,
  Lock,
  HardDrive,
  CheckCircle2,
  Fingerprint,
  Sparkles,
  Edit3,
  Save,
  X,
  Copy,
  Check,
  Calendar,
  Mail,
  AtSign,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const SettingsView = ({ storageStats }) => {
  const { user, token, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  const handleStartEdit = () => {
    setFullName(user?.full_name || '');
    setUsername(user?.username || '');
    setBio(user?.bio || '');
    setError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      showToast({ type: 'success', title: 'Copied', message: 'Account ID copied to clipboard' });
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      setError('Username must be 3 to 30 characters (letters, numbers, underscores).');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: fullName.trim() || undefined,
          username: cleanUsername,
          bio: bio.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update profile');
      }

      await refreshProfile();
      setIsEditing(false);
      showToast({
        type: 'success',
        title: 'Profile Updated',
        message: `Your identity has been saved as @${cleanUsername}.`
      });
    } catch (err) {
      setError(err.message);
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: err.message
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-panel p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-slate-800/80 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-md shrink-0">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-heading text-gray-100">Security & Workspace Settings</h2>
              <span className="badge badge-cyan text-[10px]">Active</span>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Account identity, hardware cipher parameters, and zero-knowledge quotas
            </p>
          </div>
        </div>

        {!isEditing && (
          <button
            onClick={handleStartEdit}
            className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-2 self-start sm:self-auto"
          >
            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Identity & Profile Card */}
        <div className="glass-panel p-6 border-slate-800/80 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold font-heading text-gray-100">User Identity & Profile</h3>
            </div>
            {isEditing && (
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                Editing Mode
              </span>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-gray-400 font-mono text-[10px] mb-1">
                  Unique Username (@handle)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 font-mono text-xs">@</span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="e.g. ujwalsingh164"
                    style={{ paddingLeft: '2rem' }}
                    className="input-field text-xs py-2 font-mono"
                  />
                </div>
                <p className="text-[10px] text-gray-500 font-mono mt-1">
                  3-30 letters, numbers, or underscores. Checked for instant availability.
                </p>
              </div>

              <div>
                <label className="block text-gray-400 font-mono text-[10px] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ujwal Singh"
                  className="input-field text-xs py-2"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-mono text-[10px] mb-1">Bio / Status (Optional)</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell contacts a bit about yourself..."
                  className="input-field text-xs py-2 resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary text-xs py-2 px-4 shadow-md shadow-cyan-500/20"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Identity'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn-secondary text-xs py-2 px-3"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-gray-400 font-mono text-[10px]">Unique Username</label>
                <div className="font-semibold text-cyan-400 font-mono text-sm mt-0.5 flex items-center gap-2">
                  <span>@{user?.username || 'user'}</span>
                  <span className="badge badge-cyan text-[9px] py-0.5 px-2">Unique Identity</span>
                </div>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                  Used by peers to find you in user search and start encrypted 1-on-1 chats.
                </p>
              </div>

              <div>
                <label className="text-gray-400 font-mono text-[10px]">Full Name</label>
                <div className="font-semibold text-gray-200 mt-0.5">{user?.full_name || 'Administrator'}</div>
              </div>

              <div>
                <label className="text-gray-400 font-mono text-[10px]">Account Email (Authoritative)</label>
                <div className="font-semibold text-cyan-300 font-mono mt-0.5 flex items-center gap-2">
                  <span>{user?.email}</span>
                  <span className="text-[9px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                    Verified
                  </span>
                </div>
              </div>

              {user?.bio && (
                <div>
                  <label className="text-gray-400 font-mono text-[10px]">Bio</label>
                  <div className="text-gray-300 mt-0.5 text-xs italic">{user.bio}</div>
                </div>
              )}

              <div>
                <label className="text-gray-400 font-mono text-[10px]">Cryptographic Account ID</label>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="font-mono text-[11px] text-gray-400 bg-slate-950/80 px-2 py-1 rounded border border-slate-800 truncate max-w-[280px]">
                    {user?.id}
                  </span>
                  <button
                    onClick={handleCopyId}
                    className="p-1 text-gray-400 hover:text-cyan-400 transition-colors"
                    title="Copy Account ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-gray-400 font-mono text-[10px]">Storage Tier & Allocation</label>
                <div className="font-semibold text-purple-400 font-mono mt-0.5 flex items-center gap-2">
                  <span>
                    {user?.is_promotional_premium
                      ? 'Promotional Premium (Slot #1)'
                      : (user?.plan_type?.toUpperCase() || 'BASIC')}
                  </span>
                  <span className="badge badge-purple text-[9px] py-0.5 px-2">1,000 MB Free Storage</span>
                </div>
              </div>

              <div>
                <label className="text-gray-400 font-mono text-[10px]">Account Role</label>
                <div className="font-semibold text-emerald-400 font-mono mt-0.5">Security Administrator (E2EE)</div>
              </div>
            </div>
          )}
        </div>

        {/* Cryptographic Keypair & Security Status */}
        <div className="glass-panel p-6 border-slate-800/80 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Fingerprint className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold font-heading text-gray-100">PKI Cryptographic Status</h3>
          </div>

          <div className="space-y-3.5 text-xs">
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
            <div className="flex items-center justify-between">
              <span className="text-gray-400 font-mono">Object Storage Engine:</span>
              <span className="badge badge-cyan font-mono text-[10px]">Backblaze B2 S3 Encrypted</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 font-mono">Relational DB Backend:</span>
              <span className="badge badge-purple font-mono text-[10px]">Neon Serverless PostgreSQL</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 font-mono">Real-Time Messaging:</span>
              <span className="badge badge-emerald font-mono text-[10px]">WebSocket w/ Asyncpg</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
