import React from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { ChatView } from '../components/ChatView';
import { PageHeader } from '../components/common/PageHeader';
import { MessageSquare } from 'lucide-react';

export default function ChatPage() {
  const { activeConvIdForChat } = useWorkspace();

  return (
    <div className="space-y-4 animate-fade-in w-full">
      <PageHeader
        icon={MessageSquare}
        title="Private Encrypted Chat"
        breadcrumb="Chat"
        subtitle="End-to-end encrypted messaging, zero-knowledge conversation threads, and secure attachments"
        badgeText="Signal Double-Ratchet Modeled"
        badgeColor="emerald"
      />

      <ChatView initialConversationId={activeConvIdForChat} />
    </div>
  );
}
