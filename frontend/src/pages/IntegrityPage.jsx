import React from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { IntegrityCenter } from '../components/IntegrityCenter';
import { PageHeader } from '../components/common/PageHeader';
import { ShieldCheck } from 'lucide-react';

export default function IntegrityPage() {
  const { storageStats, fetchStats } = useWorkspace();

  return (
    <div className="space-y-4 animate-fade-in w-full">
      <PageHeader
        icon={ShieldCheck}
        title="Integrity Center"
        breadcrumb="Integrity"
        subtitle="SHA-256 cryptographic checksum validations, bit-rot scans, and Merkle tree block consistency"
        badgeText="SHA-256 Block Proofs"
        badgeColor="emerald"
        onRefresh={fetchStats}
      />

      <IntegrityCenter storageStats={storageStats} />
    </div>
  );
}
