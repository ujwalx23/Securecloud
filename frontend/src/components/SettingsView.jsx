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
  AlertCircle,
  KeyRound,
  Send,
  Eye,
  EyeOff,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const SettingsView = ({ storageStats }) => {
  const { user, token, refreshProfile } = useAuth();
  const { showToast } = useToast();

  // Profile Editor state
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  // Security & Password Management state
  const [passwordMode, setPasswordMode] = useState('otp'); // 'otp' | 'change'
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState(null);
  const [passwordErrMsg, setPasswordErrMsg] = useState(null);

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
        title: 'Update Error',
        message: err.message
      });
    } finally {
      setSaving(false);
    }
  };

  // Send 6-digit OTP for master password
  const handleSendOtp = async () => {
    setOtpLoading(true);
    setPasswordErrMsg(null);
    setPasswordSuccessMsg(null);
    try {
      const res = await fetch('/api/auth/send-password-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email: user?.email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Could not send OTP');
      setOtpSent(true);
      setPasswordSuccessMsg(`6-digit OTP sent to ${user?.email}. Check your inbox!`);
      showToast({
        type: 'success',
        title: 'OTP Dispatched',
        message: `Verification code sent to ${user?.email}`
      });
    } catch (err) {
      setPasswordErrMsg(err.message);
      showToast({
        type: 'error',
        title: 'Failed to Send OTP',
        message: err.message
      });
    } finally {
      setOtpLoading(false);
    }
  };

  // Submit password set with OTP
  const handleSetPasswordWithOtp = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordErrMsg('New password and confirm password do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordErrMsg('Password must be at least 8 characters.');
      return;
    }

    setPasswordLoading(true);
    setPasswordErrMsg(null);
    setPasswordSuccessMsg(null);
    try {
      const res = await fetch('/api/auth/set-password-with-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          otp_code: otpCode.trim(),
          new_password: newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to set password');
      setPasswordSuccessMsg(data.message || 'Master Password configured successfully!');
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpSent(false);
      showToast({
        type: 'success',
        title: 'Master Password Active',
        message: 'You can now use this password to unlock your Zero-Knowledge Vault.'
      });
    } catch (err) {
      setPasswordErrMsg(err.message);
      showToast({
        type: 'error',
        title: 'Verification Failed',
        message: err.message
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Submit standard password change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordErrMsg('New password and confirm password do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordErrMsg('New password must be at least 8 characters.');
      return;
    }

    setPasswordLoading(true);
    setPasswordErrMsg(null);
    setPasswordSuccessMsg(null);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to change password');
      setPasswordSuccessMsg('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast({
        type: 'success',
        title: 'Password Updated',
        message: 'Your account password has been changed.'
      });
    } catch (err) {
      setPasswordErrMsg(err.message);
      showToast({
        type: 'error',
        title: 'Password Change Failed',
        message: err.message
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Settings Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 border-slate-800/80 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-md">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-heading text-gray-100">Account & Security Hub</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Profile customization, master vault passwords, and cryptographic telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge badge-cyan font-mono text-[10px]">
            {user?.plan_type === 'premium' ? '1 GB PREMIUM' : 'BASIC TIER'}
          </span>
          <span className="badge badge-emerald font-mono text-[10px]">Zero-Knowledge</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMN 1 & 2: User Profile Card */}
        <div className="lg:col-span-2 glass-panel p-6 border-slate-800/80 space-y-6 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold font-heading text-gray-100">Profile & Public Identity</h3>
            </div>

            {!isEditing && (
              <button
                onClick={handleStartEdit}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 hover:border-cyan-500/40"
              >
                <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-gray-400 font-mono text-[10px] mb-1">
                  Unique Username (@handle)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cyan-400 font-mono text-xs">
                    @
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="username"
                    className="input-field pl-7 text-xs py-2 font-mono"
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
                <div className="font-semibold text-gray-200 mt-0.5">{user?.full_name || 'User'}</div>
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
                <label className="text-gray-400 font-mono text-[10px]">Storage Allocation</label>
                <div className="font-semibold text-purple-400 font-mono mt-0.5 flex items-center gap-2">
                  <span>
                    {user?.plan_type === 'premium' ? 'Premium Tier' : 'Basic Tier'}
                  </span>
                  <span className="badge badge-purple text-[9px] py-0.5 px-2">
                    {user?.plan_type === 'premium' ? '1 GB Cloud Storage' : 'Markdown Notes Only'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* COLUMN 3: PKI Cryptographic Status */}
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
              <span className="badge badge-emerald font-mono text-[10px]">Client Sealed</span>
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

      {/* MASTER PASSWORD & SECURITY MANAGEMENT CARD */}
      <div className="glass-panel p-6 border border-cyan-500/30 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950/25 to-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-heading text-gray-100 flex items-center gap-2">
                <span>Master Password & Zero-Knowledge Vault Access</span>
                <span className="badge badge-cyan text-[9px] font-mono">AES-256</span>
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Set or change your master account password used to unseal your encrypted vault
              </p>
            </div>
          </div>

          {/* Toggle between OTP setup and Traditional Password Change */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/90 rounded-xl border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => {
                setPasswordMode('otp');
                setPasswordErrMsg(null);
                setPasswordSuccessMsg(null);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                passwordMode === 'otp'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Email OTP Setup (Google / Forgot)
            </button>
            <button
              onClick={() => {
                setPasswordMode('change');
                setPasswordErrMsg(null);
                setPasswordSuccessMsg(null);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                passwordMode === 'change'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Change Known Password
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {passwordSuccessMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{passwordSuccessMsg}</span>
          </div>
        )}
        {passwordErrMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{passwordErrMsg}</span>
          </div>
        )}

        {passwordMode === 'otp' ? (
          /* EMAIL OTP FLOW FOR GOOGLE SIGN-IN OR FORGOTTEN PASSWORDS */
          <div className="space-y-4 max-w-xl">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-gray-300 space-y-2">
              <p className="font-semibold text-cyan-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Google Sign-in & Zero-Knowledge Vault Access
              </p>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                If you signed in via Google, your account does not have a user-defined password yet. Requesting a 6-digit OTP sent to your verified email (<strong className="text-gray-200 font-mono">{user?.email}</strong>) allows you to securely establish your Master Password anytime.
              </p>
            </div>

            {!otpSent ? (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpLoading}
                  className="btn-primary text-xs py-2.5 px-5 shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{otpLoading ? 'Dispatching OTP to Email...' : 'Send 6-Digit Security OTP to My Email'}</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSetPasswordWithOtp} className="space-y-4 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-gray-400 font-mono text-[11px]">
                      Enter 6-Digit Email OTP
                    </label>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpLoading}
                      className="text-[11px] text-cyan-400 hover:underline font-mono flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Resend OTP
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="e.g. 849201"
                    className="input-field text-center font-mono text-base tracking-widest py-2 bg-slate-950/90 border-slate-700"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 font-mono text-[11px] mb-1">
                      New Master Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        className="input-field text-xs py-2 pr-9 bg-slate-950/90 border-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-400"
                      >
                        {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 font-mono text-[11px] mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="input-field text-xs py-2 bg-slate-950/90 border-slate-700"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="btn-primary text-xs py-2.5 px-6 shadow-lg shadow-cyan-500/25 flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{passwordLoading ? 'Verifying & Setting Password...' : 'Verify OTP & Set Master Password'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="btn-secondary text-xs py-2.5 px-3"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* TRADITIONAL PASSWORD CHANGE (CURRENT + NEW) */
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-gray-400 font-mono text-[11px] mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your existing account password"
                className="input-field text-xs py-2 bg-slate-950/90 border-slate-700"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-400 font-mono text-[11px] mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="input-field text-xs py-2 pr-9 bg-slate-950/90 border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-400"
                  >
                    {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-mono text-[11px] mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="input-field text-xs py-2 bg-slate-950/90 border-slate-700"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className="btn-primary text-xs py-2.5 px-6 shadow-lg shadow-cyan-500/25 flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>{passwordLoading ? 'Updating Password...' : 'Change Password'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
