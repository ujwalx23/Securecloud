import React, { useState, useEffect } from 'react';
import { X, Download, ShieldCheck, FileText, Copy, Check, Lock, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const PreviewModal = ({ file, onClose, onDownload }) => {
  const { token } = useAuth();
  const [contentUrl, setContentUrl] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const mime = file.mime_type?.toLowerCase() || '';
  const isImage = mime.includes('image') || file.original_name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
  const isVideo = mime.includes('video') || file.original_name.match(/\.(mp4|webm|mkv)$/i);
  const isAudio = mime.includes('audio') || file.original_name.match(/\.(mp3|wav|ogg)$/i);
  const isText = mime.includes('text') || mime.includes('json') || file.original_name.match(/\.(txt|md|py|js|jsx|ts|tsx|css|html|json|c|cpp|go|rs|sh)$/i);

  useEffect(() => {
    let objectUrl = null;
    const loadContent = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/files/${file.id}/preview`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Preview unavailable');

        const blob = await res.blob();
        if (isText) {
          const text = await blob.text();
          setTextContent(text);
        } else {
          objectUrl = URL.createObjectURL(blob);
          setContentUrl(objectUrl);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file.id, token]);

  const copyText = () => {
    navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="glass-panel bg-slate-900 border-slate-700 w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4.5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-100">{file.original_name}</h3>
                <span className="badge badge-emerald text-[9px] py-0 px-1.5 font-mono">Decrypted Preview</span>
              </div>
              <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                AES-256 Authenticated Plaintext Stream • {file.mime_type}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isText && (
              <button
                onClick={copyText}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Content' : 'Copy'}</span>
              </button>
            )}

            <button onClick={() => onDownload(file)} className="btn-primary text-xs py-1.5 px-3.5 shadow-lg shadow-cyan-500/20">
              <Download className="w-4 h-4" /> Download
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-auto flex items-center justify-center bg-slate-950/60 min-h-[300px]">
          {loading ? (
            <div className="text-center space-y-2 text-cyan-400 font-mono text-xs animate-pulse">
              <Sparkles className="w-6 h-6 mx-auto" />
              <p>Decrypting RSA DEK & AES-256 Stream...</p>
            </div>
          ) : isImage && contentUrl ? (
            <img src={contentUrl} alt={file.original_name} className="max-h-[68vh] max-w-full object-contain rounded-xl border border-slate-800 shadow-2xl" />
          ) : isVideo && contentUrl ? (
            <video src={contentUrl} controls className="max-h-[68vh] w-full rounded-xl shadow-2xl" />
          ) : isAudio && contentUrl ? (
            <div className="p-8 glass-panel text-center w-full max-w-md space-y-4 border-slate-800">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                <Sparkles className="w-8 h-8" />
              </div>
              <audio src={contentUrl} controls className="w-full" />
            </div>
          ) : isText ? (
            <pre className="w-full h-full p-4.5 rounded-xl bg-slate-950/90 border border-slate-800/80 text-xs font-mono text-cyan-300 overflow-auto whitespace-pre-wrap leading-relaxed select-text shadow-inner">
              {textContent}
            </pre>
          ) : (
            <div className="text-center space-y-3">
              <FileText className="w-14 h-14 text-gray-500 mx-auto opacity-70" />
              <h4 className="text-base font-bold text-gray-200">Inline preview not available for this binary format</h4>
              <p className="text-xs text-gray-400">Download the file to view its decrypted contents locally.</p>
              <button onClick={() => onDownload(file)} className="btn-secondary text-xs mx-auto mt-2">
                <Download className="w-3.5 h-3.5" /> Download Decrypted File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
