import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const WorkspaceContext = createContext(null);

export const WorkspaceProvider = ({ children }) => {
  const { token, user } = useAuth();
  const { showToast } = useToast();

  const [storageStats, setStorageStats] = useState(null);
  const [recentFilesList, setRecentFilesList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeConvIdForChat, setActiveConvIdForChat] = useState(null);

  // Modals and Drawers
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [shareFile, setShareFile] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [selectedFileForDrawer, setSelectedFileForDrawer] = useState(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // PWA Prompt
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleTriggerInstall = async () => {
    if (!installPrompt) return;
    try {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        showToast({
          type: 'success',
          title: 'SecureCloud Installed',
          message: 'Web App successfully installed to your device!'
        });
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
    setInstallPrompt(null);
  };

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/stats/summary', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setStorageStats(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  const fetchRecentFiles = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/files', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const files = await res.json();
        setRecentFilesList(files);
      }
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchStats();
      fetchRecentFiles();
    }
  }, [token, fetchStats, fetchRecentFiles]);

  // Global Ctrl+K Shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDownload = async (file) => {
    try {
      const res = await fetch(`/api/files/${file.id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast({
        type: 'success',
        title: 'Payload Decrypted',
        message: `Successfully decrypted & downloaded ${file.original_name}`
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Decryption Error',
        message: err.message
      });
    }
  };

  const handleToggleFavorite = async (item, isFolder) => {
    try {
      const endpoint = isFolder ? `/api/folders/${item.id}/favorite` : `/api/files/${item.id}/favorite`;
      await fetch(endpoint, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRecentFiles();
      fetchStats();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTrash = async (item, isFolder) => {
    try {
      const endpoint = isFolder ? `/api/folders/${item.id}/trash` : `/api/files/${item.id}/trash`;
      await fetch(endpoint, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRecentFiles();
      fetchStats();
      showToast({
        type: 'warning',
        title: 'Item Moved to Trash',
        message: `${item.original_name || item.name} moved to encrypted trash.`
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePermanent = async (item, isFolder) => {
    try {
      const endpoint = isFolder ? `/api/folders/${item.id}` : `/api/files/${item.id}`;
      await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRecentFiles();
      fetchStats();
      showToast({
        type: 'info',
        title: 'Permanently Deleted',
        message: `Ciphertext erased from storage.`
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        storageStats,
        setStorageStats,
        recentFilesList,
        setRecentFilesList,
        fetchStats,
        fetchRecentFiles,
        searchQuery,
        setSearchQuery,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        activeConvIdForChat,
        setActiveConvIdForChat,
        showUploadModal,
        setShowUploadModal,
        shareFile,
        setShareFile,
        previewFile,
        setPreviewFile,
        selectedFileForDrawer,
        setSelectedFileForDrawer,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        installPrompt,
        handleTriggerInstall,
        handleDownload,
        handleToggleFavorite,
        handleToggleTrash,
        handleDeletePermanent
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
