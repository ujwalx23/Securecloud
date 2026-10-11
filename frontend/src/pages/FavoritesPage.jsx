import React from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { FileManager } from '../components/FileManager';
import { PageHeader } from '../components/common/PageHeader';
import { Star, Upload } from 'lucide-react';

export default function FavoritesPage() {
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
        icon={Star}
        title="Starred Confidential Files"
        breadcrumb="Starred"
        subtitle="Quick access repository for bookmarked, prioritized confidential documents and archives"
        badgeText="Priority Files"
        badgeColor="amber"
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
        activeTab="favorites"
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
