import React from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { StorageStats } from '../components/StorageStats';
import { PageHeader } from '../components/common/PageHeader';
import { PieChart } from 'lucide-react';

export default function AnalyticsPage() {
  const { storageStats, fetchStats } = useWorkspace();

  return (
    <div className="space-y-4 animate-fade-in w-full">
      <PageHeader
        icon={PieChart}
        title="Storage & Quota Analytics"
        breadcrumb="Analytics"
        subtitle="MIME-type distribution, storage utilization breakdown, encryption overhead, and quota trends"
        badgeText="Real-Time Quota Telemetry"
        badgeColor="cyan"
        onRefresh={fetchStats}
      />

      <StorageStats stats={storageStats} />
    </div>
  );
}
