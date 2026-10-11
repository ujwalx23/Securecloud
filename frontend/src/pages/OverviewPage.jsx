import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { OverviewDashboard } from '../components/OverviewDashboard';
import { PageHeader } from '../components/common/PageHeader';
import { LayoutDashboard, Upload, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function OverviewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    storageStats,
    recentFilesList,
    setShowUploadModal,
    setPreviewFile,
    setShareFile,
    setSelectedFileForDrawer,
    handleDownload,
    handleToggleFavorite,
    handleToggleTrash,
    handleDeletePermanent,
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
        icon={LayoutDashboard}
        title="Overview Workspace"
        breadcrumb="Overview"
        subtitle="Zero-knowledge cryptographic command center, storage metrics, and quick actions"
        badgeText="AES-256 Real-Time Sync"
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

      <OverviewDashboard
        user={user}
        storageStats={storageStats}
        recentFiles={recentFilesList}
        onOpenUpload={() => setShowUploadModal(true)}
        onNavigate={(tab) => {
          if (tab === 'files') navigate('/files');
          else if (tab === 'vault') navigate('/vault');
          else if (tab === 'documents') navigate('/documents');
          else if (tab === 'chat') navigate('/chat');
          else if (tab === 'activity') navigate('/activity');
          else if (tab === 'integrity') navigate('/integrity');
          else if (tab === 'subscriptions' || tab === 'pricing') navigate('/pricing');
          else if (tab === 'stats' || tab === 'analytics') navigate('/analytics');
          else if (tab === 'settings') navigate('/settings');
          else navigate(`/${tab}`);
        }}
        onPreview={(file) => setPreviewFile(file)}
        onDownload={handleDownload}
        onShare={(file) => setShareFile(file)}
        onToggleFavorite={handleToggleFavorite}
        onToggleTrash={handleToggleTrash}
        onDeletePermanent={handleDeletePermanent}
        onInspectFile={(file) => setSelectedFileForDrawer(file)}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
