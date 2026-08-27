import React, { useState, useEffect } from 'react';
import {
  Search,
  Upload,
  FolderPlus,
  KeyRound,
  Shield,
  PieChart,
  Trash2,
  FileText,
  Star,
  Share2,
  X,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export const CommandPalette = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenUpload,
  onOpenNewFolder,
  recentFiles = []
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const defaultActions = [
    { id: 'upload', label: 'Upload Encrypted File', icon: Upload, category: 'Quick Actions', action: () => { onClose(); onOpenUpload(); } },
    { id: 'folder', label: 'Create New Directory', icon: FolderPlus, category: 'Quick Actions', action: () => { onClose(); onOpenNewFolder(); } },
    { id: 'vault', label: 'Open Zero-Knowledge Vault', icon: KeyRound, category: 'Navigation', action: () => { onClose(); onNavigate('vault'); } },
    { id: 'files', label: 'Browse Primary Storage', icon: FileText, category: 'Navigation', action: () => { onClose(); onNavigate('files'); } },
    { id: 'shared', label: 'View Shared With Me', icon: Share2, category: 'Navigation', action: () => { onClose(); onNavigate('shared'); } },
    { id: 'starred', label: 'View Starred Files', icon: Star, category: 'Navigation', action: () => { onClose(); onNavigate('favorites'); } },
    { id: 'audit', label: 'Inspect Security Audit Log', icon: Shield, category: 'Security', action: () => { onClose(); onNavigate('activity'); } },
    { id: 'stats', label: 'Storage & Quota Analytics', icon: PieChart, category: 'Analytics', action: () => { onClose(); onNavigate('stats'); } },
    { id: 'trash', label: 'Encrypted Trash Bin', icon: Trash2, category: 'System', action: () => { onClose(); onNavigate('trash'); } },
  ];

  const fileActions = recentFiles.map((file) => ({
    id: `file-${file.id}`,
    label: file.original_name,
    sublabel: `${(file.file_size / 1024).toFixed(1)} KB • AES-256 E2EE`,
    icon: FileText,
    category: 'Recent Files',
    action: () => { onClose(); onNavigate('files'); }
  }));

  const allItems = [...defaultActions, ...fileActions];

  const filteredItems = allItems.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    (item.sublabel && item.sublabel.toLowerCase().includes(query.toLowerCase())) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(filteredItems.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(filteredItems.length, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="glass-panel bg-slate-900/95 border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Search Bar Input */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-950/60">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command, filename, or vault section..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-sm text-gray-100 placeholder-gray-500 font-medium"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono text-gray-400 bg-slate-800 border border-slate-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredItems.map((item, idx) => {
            const Icon = item.icon;
            const isSelected = idx === selectedIndex;

            return (
              <button
                key={item.id}
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 border border-cyan-500/40 text-cyan-300'
                    : 'text-gray-300 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-gray-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-semibold">{item.label}</div>
                    {item.sublabel && (
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5 truncate">{item.sublabel}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono text-gray-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {item.category}
                  </span>
                  {isSelected && <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />}
                </div>
              </button>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="p-8 text-center text-xs text-gray-400 font-mono space-y-1">
              <Search className="w-8 h-8 text-gray-600 mx-auto" />
              <p>No matching commands or files found.</p>
            </div>
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-[10px] text-gray-400 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>ESC to close</span>
          </div>
          <span className="text-cyan-400/80 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> SecureCloud Core
          </span>
        </div>
      </div>
    </div>
  );
};
