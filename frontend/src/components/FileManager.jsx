import React, { useState, useEffect } from 'react';
import {
  FolderPlus,
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
  Home,
  FileText,
  Folder,
  X,
  History,
  RotateCcw,
  ShieldAlert,
  Download,
  Eye,
  Share2,
  Sparkles,
  ShieldCheck,
  Search,
  ArrowUpRight
} from 'lucide-react';
import { FileCard } from './FileCard';
import { useAuth } from '../context/AuthContext';

export const FileManager = ({
  activeTab,
  searchQuery,
  onOpenUpload,
  onPreview,
  onDownload,
  onShare,
  onUpdateStats,
  onInspectFile
}) => {
  const { token } = useAuth();
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [sharedWithMeItems, setSharedWithMeItems] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(false);
  const [accessError, setAccessError] = useState(null);

  // New folder modal
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Versions modal
  const [versionFile, setVersionFile] = useState(null);
  const [versionsList, setVersionsList] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    setAccessError(null);
    try {
      if (activeTab === 'shared') {
        const res = await fetch('/api/shares/shared-with-me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSharedWithMeItems(data);
        }
        setFolders([]);
        setFiles([]);
        setLoading(false);
        return;
      }

      let folderUrl = `/api/folders?`;
      let fileUrl = `/api/files?`;

      if (searchQuery) {
        fileUrl += `search=${encodeURIComponent(searchQuery)}`;
      } else if (activeTab === 'trash') {
        folderUrl += `is_trashed=true`;
        fileUrl += `is_trashed=true`;
      } else if (activeTab === 'favorites') {
        folderUrl += `is_favorite=true`;
        fileUrl += `is_favorite=true`;
      } else {
        const pId = currentFolder ? currentFolder.id : '';
        if (pId) {
          folderUrl += `parent_id=${pId}`;
          fileUrl += `folder_id=${pId}`;
        }
      }

      const [fRes, filesRes] = await Promise.all([
        fetch(folderUrl, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(fileUrl, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (fRes.ok) setFolders(await fRes.json());
      if (filesRes.ok) setFiles(await filesRes.json());
    } catch (err) {
      console.error('Error fetching file manager data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentFolder, activeTab, searchQuery, token]);

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newFolderName,
          parent_id: currentFolder ? currentFolder.id : null
        })
      });
      if (res.ok) {
        setNewFolderName('');
        setShowFolderModal(false);
        fetchData();
        if (onUpdateStats) onUpdateStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenFolder = (folder) => {
    setCurrentFolder(folder);
    setFolderPath((prev) => [...prev, folder]);
  };

  const handleNavigateBreadcrumb = (index) => {
    if (index === -1) {
      setCurrentFolder(null);
      setFolderPath([]);
    } else {
      const targetFolder = folderPath[index];
      setCurrentFolder(targetFolder);
      setFolderPath(folderPath.slice(0, index + 1));
    }
  };

  const handleToggleFavorite = async (item, isFolder) => {
    const endpoint = isFolder ? `/api/folders/${item.id}/favorite` : `/api/files/${item.id}/favorite`;
    await fetch(endpoint, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchData();
  };

  const handleToggleTrash = async (item, isFolder) => {
    const endpoint = isFolder ? `/api/folders/${item.id}/trash` : `/api/files/${item.id}/trash`;
    await fetch(endpoint, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchData();
    if (onUpdateStats) onUpdateStats();
  };

  const handleDeletePermanent = async (item, isFolder) => {
    const endpoint = isFolder ? `/api/folders/${item.id}` : `/api/files/${item.id}`;
    await fetch(endpoint, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchData();
    if (onUpdateStats) onUpdateStats();
  };

  const handleViewVersions = async (fileItem) => {
    setVersionFile(fileItem);
    try {
      const res = await fetch(`/api/files/${fileItem.id}/versions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setVersionsList(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadSharedFile = async (sharedItem) => {
    setAccessError(null);
    try {
      const res = await fetch(`/api/shares/shared-file/${sharedItem.file_id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Access Denied: Share has been revoked by the owner.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = sharedItem.file_info?.original_name || 'shared_file';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setAccessError(err.message);
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'shared': return 'Files Shared With Me';
      case 'favorites': return 'Starred Confidential Files';
      case 'trash': return 'Encrypted Trash Repository';
      default: return currentFolder ? currentFolder.name : 'Primary Encrypted Storage';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Breadcrumbs Toolbar */}
      <div className="glass-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-slate-800/80 shadow-lg">
        {/* Breadcrumb Path */}
        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium overflow-x-auto">
          <button
            onClick={() => handleNavigateBreadcrumb(-1)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-gray-300 hover:text-cyan-300 transition-all border border-slate-800"
          >
            <Home className="w-3.5 h-3.5 text-cyan-400" />
            <span>Root Vault</span>
          </button>

          {folderPath.map((f, i) => (
            <React.Fragment key={f.id}>
              <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
              <button
                onClick={() => handleNavigateBreadcrumb(i)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-gray-200 hover:text-cyan-300 transition-all border border-slate-800 max-w-[140px] truncate"
              >
                {f.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* View Controls & New Folder */}
        <div className="flex items-center gap-3">
          {activeTab === 'files' && (
            <button
              onClick={() => setShowFolderModal(true)}
              className="btn-secondary text-xs py-2 px-3.5 border-slate-700/80 hover:border-cyan-400/50"
            >
              <FolderPlus className="w-4 h-4 text-cyan-400" />
              <span>New Folder</span>
            </button>
          )}

          <div className="p-1 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {searchQuery && (
        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between text-xs text-cyan-300">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-cyan-400" />
            <span>Search Filter Active: "{searchQuery}" ({files.length} match{files.length === 1 ? '' : 'es'})</span>
          </div>
        </div>
      )}

      {accessError && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-3 shadow-lg shadow-rose-500/10">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{accessError}</span>
        </div>
      )}

      {/* Shared With Me Section */}
      {activeTab === 'shared' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">
              Inbound Shared Files ({sharedWithMeItems.length})
            </h3>
            <span className="badge badge-cyan text-[10px]">RSA Re-encrypted</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sharedWithMeItems.map((item) => (
              <div key={item.id} className="glass-card p-5 space-y-4 relative group hover:border-cyan-500/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 truncate">
                    <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <h4 className="text-sm font-bold text-gray-100 truncate">{item.file_info?.original_name}</h4>
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5 truncate">
                        From: {item.file_info?.owner_name || item.file_info?.owner_email}
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-emerald text-[9px] shrink-0">Active</span>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-800 text-xs">
                  <span className="text-[11px] font-mono text-gray-400">
                    {(item.file_info?.file_size / 1024).toFixed(1)} KB
                  </span>
                  <button
                    onClick={() => handleDownloadSharedFile(item)}
                    className="btn-primary py-1.5 px-3.5 text-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Decrypt & Download
                  </button>
                </div>
              </div>
            ))}
            {sharedWithMeItems.length === 0 && !loading && (
              <div className="p-12 text-center glass-panel col-span-full space-y-3">
                <FileText className="w-12 h-12 text-slate-600 mx-auto opacity-70" />
                <h4 className="text-sm font-bold text-gray-300">No Shared Files Available</h4>
                <p className="text-xs text-gray-400 font-mono">
                  When other vault users share encrypted files with your email, they will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Folders Section */}
      {activeTab !== 'shared' && folders.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">
            Directories ({folders.length})
          </h3>
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
                : 'space-y-2.5'
            }
          >
            {folders.map((f) => (
              <FileCard
                key={f.id}
                item={f}
                isFolder={true}
                viewMode={viewMode}
                onOpenFolder={handleOpenFolder}
                onToggleFavorite={handleToggleFavorite}
                onToggleTrash={handleToggleTrash}
                onDeletePermanent={handleDeletePermanent}
              />
            ))}
          </div>
        </div>
      )}

      {/* Files Section */}
      {activeTab !== 'shared' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">
              Encrypted Objects {files.length > 0 && `(${files.length})`}
            </h3>
            {files.length > 0 && (
              <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> 100% Verified AES-256
              </span>
            )}
          </div>

          {files.length > 0 ? (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
                  : 'space-y-2.5'
              }
            >
              {files.map((file) => (
                <FileCard
                  key={file.id}
                  item={file}
                  isFolder={false}
                  viewMode={viewMode}
                  onPreview={onPreview}
                  onDownload={onDownload}
                  onShare={onShare}
                  onToggleFavorite={handleToggleFavorite}
                  onToggleTrash={handleToggleTrash}
                  onDeletePermanent={handleDeletePermanent}
                  onViewVersions={handleViewVersions}
                  onInspect={onInspectFile}
                />
              ))}
            </div>
          ) : (
            !loading && (
              <div className="p-12 text-center glass-panel space-y-4 border-dashed border-slate-800">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center mx-auto text-cyan-400">
                  <Folder className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-200">No encrypted files in this view</h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                    Upload documents, code, media, or archives with automated hybrid hardware encryption.
                  </p>
                </div>
                <button
                  onClick={onOpenUpload}
                  className="btn-primary text-xs py-2 px-4 mx-auto"
                >
                  Upload First File
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-panel bg-slate-900 border-slate-700 w-full max-w-sm p-6 rounded-2xl shadow-2xl">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <FolderPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-100">Create Encrypted Directory</h3>
                <p className="text-[10px] text-gray-400 font-mono">Organize cloud objects</p>
              </div>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <input
                type="text"
                required
                autoFocus
                placeholder="Folder name (e.g. Q3 Financials)..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="input-field text-xs bg-slate-950/80 py-2.5"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowFolderModal(false)} className="btn-secondary text-xs py-2 px-3.5">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs py-2 px-4">
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {versionFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-panel bg-slate-900 border-slate-700 w-full max-w-lg p-6 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-100">Cryptographic Version History</h3>
                  <p className="text-[10px] text-gray-400 truncate max-w-[240px]">{versionFile.original_name}</p>
                </div>
              </div>
              <button onClick={() => setVersionFile(null)} className="p-1.5 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 space-y-2.5 max-h-64 overflow-y-auto pr-1">
              <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cyan-300">Version {versionFile.version} (Active Release)</span>
                    <span className="badge badge-cyan text-[9px] py-0.5 px-1.5 font-mono">Current</span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-mono mt-1">SHA-256: {versionFile.checksum_sha256.substring(0, 20)}...</p>
                </div>
              </div>

              {versionsList.map((ver) => (
                <div key={ver.id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-gray-200">Version {ver.version_number}</span>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{new Date(ver.created_at).toLocaleString()}</p>
                  </div>
                  <span className="text-[11px] text-gray-400 font-mono">{(ver.file_size / 1024).toFixed(1)} KB</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
