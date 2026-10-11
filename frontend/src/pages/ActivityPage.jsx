import React from 'react';
import { ActivityLog } from '../components/ActivityLog';
import { PageHeader } from '../components/common/PageHeader';
import { Shield } from 'lucide-react';

export default function ActivityPage() {
  return (
    <div className="space-y-4 animate-fade-in w-full">
      <PageHeader
        icon={Shield}
        title="Security Audit & Telemetry"
        breadcrumb="Activity Log"
        subtitle="Immutable chronological ledger of cryptographic operations, authentication handshakes, and access logs"
        badgeText="Immutable Audit Log"
        badgeColor="cyan"
      />

      <ActivityLog />
    </div>
  );
}
