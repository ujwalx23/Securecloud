import React from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { FileManager } from '../components/FileManager';
import { PageHeader } from '../components/common/PageHeader';
import { Share2, Upload } from 'lucide-react';

export default function SharedWithMePage() {
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
        icon={Share2}
        title="Shared With Me"
        breadcrumb="Shared"
        subtitle="Encrypted files and folders cryptographically shared with your account by team members"
        badgeText="RSA-2048 PKI Encrypted"
        badgeColor="purple"
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
        activeTab="shared"
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
