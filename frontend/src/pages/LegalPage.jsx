import React from 'react';
import { useLocation } from 'react-router-dom';
import { LegalView } from '../components/LegalView';
import { PageHeader } from '../components/common/PageHeader';
import { FileText } from 'lucide-react';

export default function LegalPage() {
  const location = useLocation();

  const getInitialTab = () => {
    const path = location.pathname;
    if (path.includes('privacy')) return 'privacy';
    if (path.includes('permissions')) return 'permissions';
    if (path.includes('security')) return 'security';
    return 'terms';
  };

  return (
    <div className="space-y-4 animate-fade-in w-full">
      <PageHeader
        icon={FileText}
        title="Legal, Privacy & Security Policies"
        breadcrumb="Legal & Compliance"
        subtitle="Zero-knowledge privacy commitments, terms of service, security architecture, and device permissions"
        badgeText="GDPR & Zero-Knowledge Compliant"
        badgeColor="cyan"
      />

      <LegalView initialTab={getInitialTab()} />
    </div>
  );
}
