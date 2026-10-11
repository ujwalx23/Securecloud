import React from 'react';
import { SubscriptionsView } from '../components/SubscriptionsView';
import { PageHeader } from '../components/common/PageHeader';
import { Sparkles } from 'lucide-react';

export default function SubscriptionsPage() {
  return (
    <div className="space-y-4 animate-fade-in w-full">
      <PageHeader
        icon={Sparkles}
        title="Plans, Quotas & Upgrades"
        breadcrumb="Plans & Pricing"
        subtitle="Manage zero-knowledge cloud storage tiers, high-bandwidth pipelines, and hardware vault allocations"
        badgeText="Instant Crypto & Stripe Activation"
        badgeColor="purple"
      />

      <SubscriptionsView />
    </div>
  );
}
