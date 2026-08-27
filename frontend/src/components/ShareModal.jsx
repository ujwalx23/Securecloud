import React, { useState, useEffect } from 'react';
import {
  Share2,
  X,
  Copy,
  Check,
  Lock,
  Clock,
  Download,
  UserPlus,
  ShieldAlert,
  Trash2,
  Key,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ShareModal = ({ file, onClose }) => {
  const { token } = useAuth();
  const [tab, setTab] = useState('user'); // 'user' or 'link'

  // User-to-user state
  const [recipientEmail, setRecipientEmail] = useState('');
  const [outgoingShares, setOutgoingShares] = useState([]);
  const [userShareSuccess, setUserShareSuccess] = useState(null);
  const [userShareError, setUserShareError] = useState(null);
  const [sharingUser, setSharingUser] = useState(false);

  // Link state
  const [password, setPassword] = useState('');
  const [expiresInHours, setExpiresInHours] = useState('24');
  const [allowDownload, setAllowDownload] = useState(true);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loadingLink, setLoadingLink] = useState(false);
  const [linkError, setLinkError] = useState(null);

  const fetchOutgoingShares = async () => {
    try {
      const res = await fetch('/api/shares/my-shares', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOutgoingShares(data.filter((s) => s.file_id === file.id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOutgoingShares();
  }, [file.id, token]);

  const handleShareWithUser = async (e) => {
    e.preventDefault();
    setSharingUser(true);
    setUserShareError(null);
    setUserShareSuccess(null);

    try {
      const res = await fetch('/api/shares/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          file_id: file.id,
          recipient_email: recipientEmail
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to share file');

      setUserShareSuccess(`DEK re-encrypted with RSA-2048 and shared with ${recipientEmail}!`);
      setRecipientEmail('');
      fetchOutgoingShares();
    } catch (err) {
      setUserShareError(err.message);
    } finally {
      setSharingUser(false);
    }
  };

  const handleRevokeShare = async (shareId) => {
    try {
      const res = await fetch(`/api/shares/revoke/${shareId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchOutgoingShares();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateShareLink = async () => {
    setLoadingLink(true);
    setLinkError(null);
    try {
      const res = await fetch('/api/shares/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          file_id: file.id,
          password: password || null,
          expires_in_hours: parseInt(expiresInHours, 10),
          allow_download: allowDownload
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to create share link');

      const fullUrl = `${window.location.origin}/share/${data.share_code}`;
      setShareLink(fullUrl);
    } catch (err) {
      setLinkError(err.message);
    } finally {
      setLoadingLink(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="glass-panel bg-slate-900 border-slate-700 w-full max-w-lg p-6 rounded-2xl shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-md">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-100">Hybrid Cryptographic Sharing</h3>
              <p className="text-[11px] text-gray-400 truncate max-w-[240px] font-mono">{file.original_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-950/80 p-1 rounded-xl my-4 border border-slate-800">
          <button
            onClick={() => setTab('user')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'user'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Direct User Sharing (RSA PKI)
          </button>
          <button
            onClick={() => setTab('link')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'link'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Expirable Public Link
          </button>
        </div>

        {/* User-to-User Tab */}
        {tab === 'user' && (
          <div className="space-y-4">
            <form onSubmit={handleShareWithUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-cyan-400" /> Recipient Account Email
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder="e.g. user_b@securecloud.io"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="input-field text-xs bg-slate-950/80"
                  />
                  <button type="submit" disabled={sharingUser} className="btn-primary text-xs shrink-0 py-2 px-4 shadow-lg shadow-cyan-500/20">
                    {sharingUser ? 'Re-encrypting...' : 'Share RSA DEK'}
                  </button>
                </div>
              </div>
            </form>

            {userShareSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-medium flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{userShareSuccess}</span>
              </div>
            )}

            {userShareError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{userShareError}</span>
              </div>
            )}

            {/* Outgoing Shares List & Revocation */}
            <div className="pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-gray-300">Active Recipients ({outgoingShares.length})</h4>
                <span className="text-[10px] font-mono text-cyan-400">Server-Side Enforced</span>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {outgoingShares.map((s) => (
                  <div key={s.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-gray-200">{s.recipient_email}</span>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                        Status: {s.is_revoked ? <span className="text-rose-400 font-semibold">Access Revoked (403)</span> : <span className="text-emerald-400 font-semibold">Access Granted</span>}
                      </p>
                    </div>
                    {!s.is_revoked && (
                      <button
                        onClick={() => handleRevokeShare(s.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 text-[11px] font-semibold transition-all border border-rose-500/30"
                      >
                        Revoke Access
                      </button>
                    )}
                  </div>
                ))}
                {outgoingShares.length === 0 && (
                  <div className="text-center py-4 text-xs text-gray-500 font-mono">Not shared directly with any users yet.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Public Link Tab */}
        {tab === 'link' && (
          <div>
            {!shareLink ? (
              <div className="space-y-4 my-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-cyan-400" /> Link Passcode (Optional Protection)
                  </label>
                  <input
                    type="password"
                    placeholder="Enter link password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field text-xs bg-slate-950/80"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" /> Link Expiration Timer
                  </label>
                  <select
                    value={expiresInHours}
                    onChange={(e) => setExpiresInHours(e.target.value)}
                    className="input-field text-xs bg-slate-950/80"
                  >
                    <option value="1">1 Hour</option>
                    <option value="24">24 Hours (1 Day)</option>
                    <option value="168">7 Days</option>
                    <option value="720">30 Days</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-gray-200">
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Allow Direct Encrypted Download</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={allowDownload}
                    onChange={(e) => setAllowDownload(e.target.checked)}
                    className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                  />
                </div>

                {linkError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs">
                    {linkError}
                  </div>
                )}

                <button
                  onClick={handleCreateShareLink}
                  disabled={loadingLink}
                  className="btn-primary w-full justify-center text-xs py-2.5 mt-2 shadow-lg shadow-cyan-500/25"
                >
                  {loadingLink ? 'Generating Cryptographic Link...' : 'Generate Encrypted Public Link'}
                </button>
              </div>
            ) : (
              <div className="my-6 space-y-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-lg shadow-emerald-500/20">
                  <Check className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-100">Secure Share Link Created!</h4>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">Encrypted with expirable AES-256 payload authorization</p>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <input
                    type="text"
                    readOnly
                    value={shareLink}
                    className="bg-transparent border-none text-xs text-cyan-300 font-mono flex-1 outline-none px-2 truncate select-all"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="btn-primary py-2 px-3.5 text-xs shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
