import React, { useState, useEffect } from 'react';
import {
  Shield,
  Download,
  Lock,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  KeyRound
} from 'lucide-react';

export const PublicShareView = ({ shareCode, onGoToApp }) => {
  const [shareInfo, setShareInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [password, setPassword] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  const fetchShareInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/shares/${shareCode}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'This share link is invalid, expired, or download limit reached.');
      }
      const data = await res.json();
      setShareInfo(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shareCode) {
      fetchShareInfo();
    }
  }, [shareCode]);

  const handleDownload = async (e) => {
    if (e) e.preventDefault();
    setDownloading(true);
    setDownloadError(null);

    try {
      let url = `/api/shares/${shareCode}/download`;
      if (password) {
        url += `?password=${encodeURIComponent(password)}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Incorrect password or download limit exceeded.');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = shareInfo?.file_info?.name || 'securecloud_file';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setDownloadError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-[#06090e] flex items-center justify-center p-4 lg:p-12 relative overflow-hidden text-gray-100">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-md w-full glass-panel bg-slate-900 border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10 space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold gradient-text">SecureCloud</h2>
              <p className="text-[10px] text-gray-400 font-mono">Encrypted Share Link</p>
            </div>
          </div>

          <button
            onClick={onGoToApp}
            className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-mono"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Sign In
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-mono text-cyan-400 animate-pulse">
            Verifying cryptographic share link...
          </div>
        ) : error ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-100">Access Unavailable</h3>
              <p className="text-xs text-rose-400 mt-1">{error}</p>
            </div>
            <button onClick={onGoToApp} className="btn-secondary text-xs mx-auto">
              Return to Homepage
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* File Card Info */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="truncate flex-1">
                  <h3 className="text-sm font-bold text-gray-100 truncate">
                    {shareInfo?.file_info?.name || 'Encrypted File Document'}
                  </h3>
                  <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                    {formatBytes(shareInfo?.file_info?.size)} • {shareInfo?.file_info?.mime_type || 'Encrypted File'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 pt-2 border-t border-slate-800/80">
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> AES-256-GCM
                </span>
                {shareInfo?.expires_at && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Clock className="w-3.5 h-3.5" /> Expirable Link
                  </span>
                )}
              </div>
            </div>

            {/* Password Form or Direct Download */}
            {shareInfo?.requires_password ? (
              <form onSubmit={handleDownload} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" /> Enter Passcode to Decrypt
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter link password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field text-xs bg-slate-950/90 py-2.5"
                  />
                </div>

                {downloadError && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                    {downloadError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={downloading || !password}
                  className="btn-primary w-full justify-center text-xs py-2.5"
                >
                  <Download className="w-4 h-4" />
                  {downloading ? 'Decrypting Payload...' : 'Unlock & Download File'}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                {downloadError && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                    {downloadError}
                  </div>
                )}

                <button
                  onClick={() => handleDownload()}
                  disabled={downloading}
                  className="btn-primary w-full justify-center text-xs py-2.5"
                >
                  <Download className="w-4 h-4" />
                  {downloading ? 'Decrypting Stream...' : 'Decrypt & Download File'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
