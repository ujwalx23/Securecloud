import React from 'react';
import { VaultView } from '../components/VaultView';
import { PageHeader } from '../components/common/PageHeader';
import { KeyRound, ShieldCheck } from 'lucide-react';

export default function VaultPage() {
  return (
    <div className="space-y-4 animate-fade-in w-full">
      <PageHeader
        icon={KeyRound}
        title="Zero-Knowledge Hardware-Grade Vault"
        breadcrumb="Secure Vault"
        subtitle="Ultra-secure isolated enclave protected by client-side PBKDF2-derived master PIN and AES-256-GCM"
        badgeText="Air-Gapped Client Derivation"
        badgeColor="purple"
      />

      <VaultView />
    </div>
  );
}
