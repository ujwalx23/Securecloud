import React from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { ContactsView } from '../components/ContactsView';
import { PageHeader } from '../components/common/PageHeader';
import { Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ContactsPage() {
  const { setActiveConvIdForChat } = useWorkspace();
  const navigate = useNavigate();

  const handleStartChat = (convId) => {
    setActiveConvIdForChat(convId);
    navigate('/chat');
  };

  return (
    <div className="space-y-4 animate-fade-in w-full">
      <PageHeader
        icon={Users}
        title="Cryptographic Contacts Directory"
        breadcrumb="Contacts"
        subtitle="Manage verified public keys, trusted peer connections, and initiate zero-knowledge dialogues"
        badgeText="Verified Key Ring"
        badgeColor="cyan"
      />

      <ContactsView onStartChat={handleStartChat} />
    </div>
  );
}
