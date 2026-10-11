import React from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { FileManager } from '../components/FileManager';
import { PageHeader } from '../components/common/PageHeader';
import { Trash2 } from 'lucide-react';

export default function TrashPage() {
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
        icon={Trash2}
        title="Encrypted Trash Repository"
        breadcrumb="Trash"
        subtitle="Recover deleted files within retention period or perform irreversible cryptographic shredding"
        badgeText="30-Day Recovery Buffer"
        badgeColor="amber"
        onRefresh={handleRefresh}
      />

      <FileManager
        activeTab="trash"
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
