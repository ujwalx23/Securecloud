import React from 'react';
import { ContactView } from '../components/ContactView';
import { PageHeader } from '../components/common/PageHeader';
import { Mail } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="space-y-4 animate-fade-in w-full">
      <PageHeader
        icon={Mail}
        title="Contact Support & Help Desk"
        breadcrumb="Help Desk"
        subtitle="Direct channel to cryptographic security engineering team, incident reporting, and assistance"
        badgeText="24/7 Priority Support"
        badgeColor="emerald"
      />

      <ContactView />
    </div>
  );
}
