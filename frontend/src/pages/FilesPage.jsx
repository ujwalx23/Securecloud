import React from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { FileManager } from '../components/FileManager';
import { PageHeader } from '../components/common/PageHeader';
import { Folder, Upload } from 'lucide-react';

export default function FilesPage() {
  const {
    searchQuery,
    setShowUploadModal,
    setPreviewFile,
    setShareFile,
    setSelectedFileForDrawer,
    handleDownload,
    fetchStats,
    fetchRecentFiles
  } = useWorkspace();

  const handleRefresh = () => {
    fetchStats();
    fetchRecentFiles();
  };

  return (
    <div className="space-y-4 animate-fade-in w-full">
      <PageHeader
        icon={Folder}
        title="My Cloud Storage"
        breadcrumb="My Cloud"
        subtitle="Manage folders, client-side encrypted files, and granular cloud directories"
        badgeText="AES-256-GCM"
        badgeColor="cyan"
        onRefresh={handleRefresh}
        actions={
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-primary text-xs py-2 px-3 shadow-md shadow-cyan-500/20"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload File</span>
          </button>
        }
      />

      <FileManager
        activeTab="files"
        searchQuery={searchQuery}
        onOpenUpload={() => setShowUploadModal(true)}
        onPreview={(file) => setPreviewFile(file)}
        onDownload={handleDownload}
        onShare={(file) => setShareFile(file)}
        onUpdateStats={handleRefresh}
        onInspectFile={(file) => setSelectedFileForDrawer(file)}
      />
    </div>
  );
}
