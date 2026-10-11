import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { PageSkeleton } from './components/common/PageSkeleton';

// Modals
import { FileUploadModal } from './components/FileUploadModal';
import { ShareModal } from './components/ShareModal';
import { PreviewModal } from './components/PreviewModal';
import { CommandPalette } from './components/CommandPalette';
import { FileDetailsDrawer } from './components/FileDetailsDrawer';
import { DeviceOnboardingModal } from './components/DeviceOnboardingModal';

// Lucide
import { Shield } from 'lucide-react';

// Code-split Lazy-Loaded Independent Feature Pages / Sub-websites
const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const FilesPage = lazy(() => import('./pages/FilesPage'));
const RecentFilesPage = lazy(() => import('./pages/RecentFilesPage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const SharedWithMePage = lazy(() => import('./pages/SharedWithMePage'));
const SharedLinksPage = lazy(() => import('./pages/SharedLinksPage'));
const TrashPage = lazy(() => import('./pages/TrashPage'));
const VaultPage = lazy(() => import('./pages/VaultPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const ContactsPage = lazy(() => import('./pages/ContactsPage'));
const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ActivityPage = lazy(() => import('./pages/ActivityPage'));
const IntegrityPage = lazy(() => import('./pages/IntegrityPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const PublicSharePage = lazy(() => import('./pages/PublicSharePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

/**
 * AppLayout: Main shell with persistent route-aware Navbar and Sidebar,
 * lazy-loaded page outlets, and global modals.
 */
const AppLayout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const {
    storageStats,
    recentFilesList,
    searchQuery,
    setSearchQuery,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
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
    fetchStats,
    fetchRecentFiles
  } = useWorkspace();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const handleCommandNavigate = (destination) => {
    if (!destination) return;
    if (destination.startsWith('/')) {
      navigate(destination);
    } else {
      navigate(`/${destination}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#050811] text-gray-100 p-3 sm:p-4 md:p-6 max-w-[1680px] mx-auto animate-fade-in">
      <Navbar
        onOpenUpload={() => setShowUploadModal(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        installPrompt={installPrompt}
        onTriggerInstall={handleTriggerInstall}
      />

      <div className="flex gap-4 sm:gap-6 items-start">
        <Sidebar
          storageStats={storageStats}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          installPrompt={installPrompt}
          onTriggerInstall={handleTriggerInstall}
        />

        <main className="flex-1 min-w-0">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Global Modals & Drawers */}
      {showUploadModal && (
        <FileUploadModal
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={() => {
            fetchStats();
            fetchRecentFiles();
            showToast({
              type: 'success',
              title: 'Upload Successful',
              message: 'Ciphertext stored with AES-256 Galois/Counter Mode'
            });
          }}
        />
      )}

      {shareFile && (
        <ShareModal
          file={shareFile}
          onClose={() => setShareFile(null)}
        />
      )}

      {previewFile && (
        <PreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onDownload={handleDownload}
        />
      )}

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={handleCommandNavigate}
        onOpenUpload={() => setShowUploadModal(true)}
        onOpenNewFolder={() => navigate('/files')}
        recentFiles={recentFilesList}
      />

      {selectedFileForDrawer && (
        <FileDetailsDrawer
          file={selectedFileForDrawer}
          onClose={() => setSelectedFileForDrawer(null)}
          onPreview={(file) => setPreviewFile(file)}
          onDownload={handleDownload}
          onShare={(file) => setShareFile(file)}
          onToggleFavorite={handleToggleFavorite}
          onToggleTrash={handleToggleTrash}
        />
      )}

      {/* First-Time Device Permissions & Onboarding */}
      <DeviceOnboardingModal
        installPrompt={installPrompt}
        onTriggerInstall={handleTriggerInstall}
        onOpenLegal={() => navigate('/terms')}
        onOpenContact={() => navigate('/contact')}
      />
    </div>
  );
};

/**
 * Main application routes orchestrator
 */
const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-[#050811] flex flex-col items-center justify-center text-cyan-400 font-mono text-xs space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center animate-pulse">
          <Shield className="w-6 h-6 text-cyan-400" />
        </div>
        <p className="animate-pulse">Initializing SecureCloud Hybrid Cryptographic Engine...</p>
        <button
          onClick={() => {
            try { localStorage.removeItem('securecloud_token'); } catch {}
            window.location.href = '/login';
          }}
          className="text-[10px] text-gray-500 hover:text-cyan-400 underline font-mono mt-2 transition-colors"
        >
          Taking a moment? Click to open sign-in immediately &rarr;
        </button>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Standalone Pages (Zero main-bundle load) */}
      <Route
        path="/login"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <AuthPage initialMode="login" />
          </Suspense>
        }
      />
      <Route
        path="/register"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <AuthPage initialMode="register" />
          </Suspense>
        }
      />
      <Route
        path="/verify-email"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <AuthPage initialMode="verify" />
          </Suspense>
        }
      />
      <Route
        path="/share/:shareCode"
        element={
          <Suspense fallback={<PageSkeleton />}>
            <PublicSharePage />
          </Suspense>
        }
      />

      {/* Standalone Legal & Help Sub-websites (Accessible public or within app) */}
      <Route
        path="/contact"
        element={
          user ? (
            <AppLayout />
          ) : (
            <Suspense fallback={<PageSkeleton />}>
              <div className="min-h-screen bg-[#050811] p-6 max-w-4xl mx-auto flex items-center">
                <ContactPage />
              </div>
            </Suspense>
          )
        }
      >
        {user && <Route index element={<ContactPage />} />}
      </Route>

      <Route
        path="/terms"
        element={
          user ? (
            <AppLayout />
          ) : (
            <Suspense fallback={<PageSkeleton />}>
              <div className="min-h-screen bg-[#050811] p-6 max-w-5xl mx-auto">
                <LegalPage />
              </div>
            </Suspense>
          )
        }
      >
        {user && <Route index element={<LegalPage />} />}
      </Route>

      <Route
        path="/privacy"
        element={
          user ? (
            <AppLayout />
          ) : (
            <Suspense fallback={<PageSkeleton />}>
              <div className="min-h-screen bg-[#050811] p-6 max-w-5xl mx-auto">
                <LegalPage />
              </div>
            </Suspense>
          )
        }
      >
        {user && <Route index element={<LegalPage />} />}
      </Route>

      <Route
        path="/security"
        element={
          user ? (
            <AppLayout />
          ) : (
            <Suspense fallback={<PageSkeleton />}>
              <div className="min-h-screen bg-[#050811] p-6 max-w-5xl mx-auto">
                <LegalPage />
              </div>
            </Suspense>
          )
        }
      >
        {user && <Route index element={<LegalPage />} />}
      </Route>

      <Route
        path="/permissions"
        element={
          user ? (
            <AppLayout />
          ) : (
            <Suspense fallback={<PageSkeleton />}>
              <div className="min-h-screen bg-[#050811] p-6 max-w-5xl mx-auto">
                <LegalPage />
              </div>
            </Suspense>
          )
        }
      >
        {user && <Route index element={<LegalPage />} />}
      </Route>

      {/* Protected Multi-Page Sub-websites */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/files" element={<FilesPage />} />
        <Route path="/recent" element={<RecentFilesPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/shared" element={<SharedWithMePage />} />
        <Route path="/shared-links" element={<SharedLinksPage />} />
        <Route path="/trash" element={<TrashPage />} />
        <Route path="/vault" element={<VaultPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/notes" element={<DocumentsPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/pricing" element={<SubscriptionsPage />} />
        <Route path="/subscriptions" element={<SubscriptionsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/audit" element={<ActivityPage />} />
        <Route path="/integrity" element={<IntegrityPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/stats" element={<AnalyticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        {/* 404 Sub-website */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <WorkspaceProvider>
              <AppContent />
            </WorkspaceProvider>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
