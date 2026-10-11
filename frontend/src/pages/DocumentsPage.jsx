import React from 'react';
import { DocumentsView } from '../components/DocumentsView';
import { PageHeader } from '../components/common/PageHeader';
import { FileText } from 'lucide-react';

export default function DocumentsPage() {
  return (
    <div className="space-y-4 animate-fade-in w-full">
      <PageHeader
        icon={FileText}
        title="Notes & Documents Workspace"
        breadcrumb="Notes & Docs"
        subtitle="End-to-end encrypted markdown notes, code snippets, memos, and classified text repositories"
        badgeText="Client-Side Encrypted"
        badgeColor="cyan"
      />

      <DocumentsView />
    </div>
  );
}
