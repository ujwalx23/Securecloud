import React, { useState, useRef } from 'react';
import { Upload, X, Shield, CheckCircle2, Lock, File, Trash2, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const FileUploadModal = ({ folderId, onClose, onUploadComplete }) => {
  const { token } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isEncrypted, setIsEncrypted] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      setSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    setError(null);
    setProgress(10);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        if (folderId) formData.append('folder_id', folderId);
        formData.append('is_encrypted', isEncrypted ? 'true' : 'false');

        const res = await fetch('/api/files/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || `Failed to upload ${file.name}`);
        }

        setProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
      }

      onUploadComplete();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="glass-panel bg-slate-900 border-slate-700 w-full max-w-lg p-6 rounded-2xl shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-100">Upload to Encrypted Vault</h3>
              <p className="text-[11px] text-gray-400 font-mono">Automated RSA-2048 + AES-256-GCM Hybrid Cipher</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drop Area */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="my-5 p-8 border-2 border-dashed border-slate-700/80 hover:border-cyan-400/60 rounded-2xl bg-slate-950/50 text-center cursor-pointer transition-all hover:bg-slate-900/60 group"
        >
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center mx-auto mb-3 text-cyan-400 group-hover:scale-110 transition-transform">
            <Shield className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-gray-200 group-hover:text-cyan-300 transition-colors">
            Drag & drop files here or click to browse
          </h4>
          <p className="text-xs text-gray-400 mt-1 font-mono">
            Encrypted with per-file symmetric DEK + asymmetric RSA public key
          </p>
        </div>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="mb-4 max-h-36 overflow-y-auto space-y-2 pr-1">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 truncate flex-1 mr-2">
                  <File className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-gray-200 font-medium truncate">{file.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-gray-400 font-mono text-[11px]">{(file.size / 1024).toFixed(1)} KB</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                    className="text-gray-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Encryption Settings Toggle */}
        <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-gray-200">
            <Lock className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="font-semibold">Zero-Knowledge Hardware Payload Encryption</div>
              <div className="text-[10px] text-gray-400 font-mono">AES-256-GCM 256-bit Galois/Counter Mode</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={isEncrypted}
            onChange={(e) => setIsEncrypted(e.target.checked)}
            className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
          />
        </div>

        {/* Progress Bar */}
        {uploading && (
          <div className="mb-4 space-y-1.5">
            <div className="flex justify-between text-xs font-mono text-cyan-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                Encrypting & Storing Payload...
              </span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div
                className="bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button onClick={onClose} className="btn-secondary text-xs py-2 px-4">
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading}
            className="btn-primary text-xs py-2 px-4 shadow-lg shadow-cyan-500/25"
          >
            {uploading ? 'Encrypting & Uploading...' : `Upload ${selectedFiles.length} File${selectedFiles.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
};
