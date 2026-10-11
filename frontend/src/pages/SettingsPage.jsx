import React from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { SettingsView } from '../components/SettingsView';
import { PageHeader } from '../components/common/PageHeader';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  const { storageStats } = useWorkspace();

  return (
    <div className="space-y-4 animate-fade-in w-full">
      <PageHeader
        icon={Settings}
        title="Workspace & Security Settings"
        breadcrumb="Settings"
        subtitle="Manage zero-knowledge master credentials, active sessions, API keys, and notification channels"
        badgeText="Zero-Knowledge Session Config"
        badgeColor="cyan"
      />

      <SettingsView storageStats={storageStats} />
    </div>
  );
}
