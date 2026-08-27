import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  Download,
  Share2,
  Trash2,
  Star,
  Copy,
  Check,
  FileText,
  Calendar,
  HardDrive,
  Cpu,
  KeyRound,
  Eye
} from 'lucide-react';

export const FileDetailsDrawer = ({
  file,
  onClose,
  onPreview,
  onDownload,
  onShare,
  onToggleFavorite,
  onToggleTrash
}) => {
  const [copiedHash, setCopiedHash] = useState(false);

  if (!file) return null;

  const copyHash = () => {
    if (file.checksum_sha256) {
      navigator.clipboard.writeText(file.checksum_sha256);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 glass-panel bg-slate-900/95 border-l border-slate-700/80 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-fade-in backdrop-blur-2xl">
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-heading text-gray-100">File Specification</h3>
              <p className="text-[10px] text-gray-400 font-mono">Hardware E2EE Payload</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File Overview Card */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 shadow-inner">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-bold text-gray-100 break-all">{file.original_name}</h4>
            <button
              onClick={() => onToggleFavorite(file, false)}
              className="p-1 text-gray-400 hover:text-amber-400"
            >
              <Star className={`w-4 h-4 ${file.is_favorite ? 'text-amber-400 fill-amber-400' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <div className="text-[10px] text-gray-400 font-mono">File Size</div>
              <div className="font-bold text-gray-200 font-mono mt-0.5">{formatBytes(file.file_size)}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
              <div className="text-[10px] text-gray-400 font-mono">Version</div>
              <div className="font-bold text-cyan-400 font-mono mt-0.5">v{file.version || 1}.0</div>
            </div>
          </div>
        </div>

        {/* Cryptographic Specifications */}
        <div className="space-y-3">
          <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Cryptographic Security</span>
          </h5>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 font-mono">Payload Cipher:</span>
              <span className="badge badge-cyan font-mono text-[10px]">AES-256-GCM</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400 font-mono">Key Protection:</span>
              <span className="badge badge-purple font-mono text-[10px]">RSA-2048 PKI</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400 font-mono">Stream Integrity:</span>
              <span className="badge badge-emerald font-mono text-[10px]">Verified SHA-256</span>
            </div>

            {/* SHA-256 Checksum Hash */}
            <div className="pt-2 border-t border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                <span>SHA-256 Checksum:</span>
                <button
                  onClick={copyHash}
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedHash ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="p-2 rounded-lg bg-slate-900 text-[10px] font-mono text-cyan-300 break-all select-all border border-slate-800">
                {file.checksum_sha256 || 'Calculated on upload'}
              </p>
            </div>
          </div>
        </div>

        {/* Timestamps & Metadata */}
        <div className="space-y-3">
          <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span>Timestamps</span>
          </h5>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs space-y-2 font-mono text-gray-400">
            <div className="flex justify-between">
              <span>Uploaded:</span>
              <span className="text-gray-200">{new Date(file.created_at).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Modified:</span>
              <span className="text-gray-200">{new Date(file.updated_at || file.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 border-t border-slate-800 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onPreview(file)}
            className="btn-secondary text-xs py-2 px-3 justify-center"
          >
            <Eye className="w-4 h-4" /> Preview
          </button>
          <button
            onClick={() => onDownload(file)}
            className="btn-primary text-xs py-2 px-3 justify-center"
          >
            <Download className="w-4 h-4" /> Download
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onShare(file)}
            className="btn-secondary text-xs py-2 px-3 justify-center"
          >
            <Share2 className="w-4 h-4 text-indigo-400" /> Share Link
          </button>
          <button
            onClick={() => onToggleTrash(file, false)}
            className="btn-secondary text-xs py-2 px-3 justify-center text-rose-400 hover:border-rose-500/40"
          >
            <Trash2 className="w-4 h-4" /> Move to Trash
          </button>
        </div>
      </div>
    </div>
  );
};
