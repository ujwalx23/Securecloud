import React, { useState } from 'react';
import {
  Folder,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Code,
  Archive,
  Download,
  Share2,
  Trash2,
  Star,
  MoreVertical,
  Lock,
  Eye,
  History,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Info
} from 'lucide-react';

export const FileCard = ({
  item,
  isFolder = false,
  viewMode = 'grid',
  onOpenFolder,
  onPreview,
  onDownload,
  onShare,
  onToggleFavorite,
  onToggleTrash,
  onDeletePermanent,
  onViewVersions,
  onInspect
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const getIconConfig = () => {
    if (isFolder) {
      return {
        icon: Folder,
        color: '#00f5ff',
        bg: 'rgba(0, 245, 255, 0.12)',
        border: 'rgba(0, 245, 255, 0.25)',
        label: 'Folder'
      };
    }

    const mime = item.mime_type?.toLowerCase() || '';
    const name = item.original_name?.toLowerCase() || '';

    if (mime.includes('image') || name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      return {
        icon: ImageIcon,
        color: '#818cf8',
        bg: 'rgba(129, 140, 248, 0.12)',
        border: 'rgba(129, 140, 248, 0.25)',
        label: 'Image'
      };
    }
    if (mime.includes('video') || name.match(/\.(mp4|webm|mkv|mov)$/i)) {
      return {
        icon: Video,
        color: '#f43f5e',
        bg: 'rgba(244, 63, 94, 0.12)',
        border: 'rgba(244, 63, 94, 0.25)',
        label: 'Video'
      };
    }
    if (mime.includes('audio') || name.match(/\.(mp3|wav|ogg)$/i)) {
      return {
        icon: Music,
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.25)',
        label: 'Audio'
      };
    }
    if (name.match(/\.(py|js|jsx|ts|tsx|html|css|json|md|c|cpp|go|rs|sh)$/i)) {
      return {
        icon: Code,
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.25)',
        label: 'Source Code'
      };
    }
    if (name.match(/\.(zip|tar|gz|7z|rar)$/i)) {
      return {
        icon: Archive,
        color: '#c084fc',
        bg: 'rgba(192, 132, 252, 0.12)',
        border: 'rgba(192, 132, 252, 0.25)',
        label: 'Archive'
      };
    }
    return {
      icon: FileText,
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.12)',
      border: 'rgba(56, 189, 248, 0.25)',
      label: 'Document'
    };
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const config = getIconConfig();
  const Icon = config.icon;

  if (viewMode === 'list') {
    return (
      <div className="glass-card px-4 py-3 flex items-center justify-between group relative hover:border-cyan-500/50 transition-all duration-200">
        <div
          className="flex items-center gap-3.5 flex-1 cursor-pointer overflow-hidden"
          onClick={() => (isFolder ? onOpenFolder(item) : (onInspect ? onInspect(item) : onPreview(item)))}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
            style={{ backgroundColor: config.bg, borderColor: config.border, color: config.color }}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-gray-100 group-hover:text-cyan-300 transition-colors truncate font-heading">
                {isFolder ? item.name : item.original_name}
              </h4>
              {!isFolder && item.version > 1 && (
                <span className="badge badge-amber text-[9px] py-0.2 px-1.5 font-mono">v{item.version}</span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 font-mono mt-0.5 flex items-center gap-2">
              <span>{isFolder ? 'Folder Directory' : formatSize(item.file_size)}</span>
              {!isFolder && (
                <>
                  <span>•</span>
                  <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                    <ShieldCheck className="w-3 h-3" /> AES-256 E2EE
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onToggleFavorite(item, isFolder)}
            className="p-2 text-gray-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-all"
            title={item.is_favorite ? "Remove Star" : "Add Star"}
          >
            <Star className={`w-4 h-4 ${item.is_favorite ? 'text-amber-400 fill-amber-400' : ''}`} />
          </button>

          {!isFolder && !item.is_trashed && (
            <>
              {onInspect && (
                <button
                  onClick={() => onInspect(item)}
                  title="Inspect Security Specs"
                  className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all"
                >
                  <Info className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => onPreview(item)}
                title="Preview File"
                className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-all"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDownload(item)}
                title="Decrypt & Download"
                className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-all"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => onShare(item)}
                title="Share Encrypted Link"
                className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            onClick={() => onToggleTrash(item, isFolder)}
            title={item.is_trashed ? "Restore Item" : "Move to Encrypted Trash"}
            className="p-2 text-gray-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
          >
            {item.is_trashed ? <RotateCcw className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4.5 flex flex-col justify-between group relative h-44 hover:border-cyan-500/50 transition-all duration-300">
      {/* Top Header */}
      <div className="flex items-start justify-between">
        <div
          className="cursor-pointer flex items-center gap-3"
          onClick={() => (isFolder ? onOpenFolder(item) : (onInspect ? onInspect(item) : onPreview(item)))}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-md transition-transform group-hover:scale-105 duration-200"
            style={{ backgroundColor: config.bg, borderColor: config.border, color: config.color }}
          >
            <Icon className="w-6 h-6" />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleFavorite(item, isFolder)}
            className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-all"
          >
            <Star className={`w-4 h-4 ${item.is_favorite ? 'text-amber-400 fill-amber-400' : ''}`} />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-slate-800 rounded-lg transition-all"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div
                className="absolute right-0 top-7 w-48 glass-panel bg-slate-900/95 border-slate-700 py-2 z-20 shadow-2xl rounded-xl text-xs backdrop-blur-xl"
                onMouseLeave={() => setShowMenu(false)}
              >
                {!isFolder && !item.is_trashed && (
                  <>
                    {onInspect && (
                      <button
                        onClick={() => { setShowMenu(false); onInspect(item); }}
                        className="w-full px-3.5 py-2 text-left text-gray-300 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                      >
                        <Info className="w-4 h-4 text-indigo-400" /> Security Details
                      </button>
                    )}
                    <button
                      onClick={() => { setShowMenu(false); onPreview(item); }}
                      className="w-full px-3.5 py-2 text-left text-gray-300 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                    >
                      <Eye className="w-4 h-4 text-cyan-400" /> Preview File
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); onDownload(item); }}
                      className="w-full px-3.5 py-2 text-left text-gray-300 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                    >
                      <Download className="w-4 h-4 text-emerald-400" /> Decrypt & Download
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); onShare(item); }}
                      className="w-full px-3.5 py-2 text-left text-gray-300 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                    >
                      <Share2 className="w-4 h-4 text-indigo-400" /> Share Secure Link
                    </button>
                    {onViewVersions && (
                      <button
                        onClick={() => { setShowMenu(false); onViewVersions(item); }}
                        className="w-full px-3.5 py-2 text-left text-gray-300 hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                      >
                        <History className="w-4 h-4 text-amber-400" /> Version History
                      </button>
                    )}
                  </>
                )}

                <button
                  onClick={() => { setShowMenu(false); onToggleTrash(item, isFolder); }}
                  className="w-full px-3.5 py-2 text-left text-rose-400 hover:bg-rose-500/15 flex items-center gap-2.5 transition-colors"
                >
                  {item.is_trashed ? <RotateCcw className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                  {item.is_trashed ? 'Restore Item' : 'Move to Trash'}
                </button>

                {item.is_trashed && (
                  <button
                    onClick={() => { setShowMenu(false); onDeletePermanent(item, isFolder); }}
                    className="w-full px-3.5 py-2 text-left text-rose-400 hover:bg-rose-600/20 font-semibold flex items-center gap-2.5 border-t border-slate-800 mt-1 pt-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Permanently
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File Details */}
      <div
        className="cursor-pointer space-y-1.5"
        onClick={() => (isFolder ? onOpenFolder(item) : (onInspect ? onInspect(item) : onPreview(item)))}
      >
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold font-heading text-gray-200 group-hover:text-cyan-300 truncate max-w-[170px] transition-colors">
            {isFolder ? item.name : item.original_name}
          </h4>
          {!isFolder && item.version > 1 && (
            <span className="badge badge-amber text-[8px] py-0 px-1 font-mono">v{item.version}</span>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono pt-1 border-t border-slate-800/80">
          <span>{isFolder ? 'Folder' : formatSize(item.file_size)}</span>
          {!isFolder ? (
            <span className="flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              <Lock className="w-2.5 h-2.5" /> AES-256
            </span>
          ) : (
            <span className="text-cyan-400 text-[9px]">Directory</span>
          )}
        </div>
      </div>
    </div>
  );
};
