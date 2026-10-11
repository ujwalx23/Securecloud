import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AdminView } from '../components/AdminView';
import { PageHeader } from '../components/common/PageHeader';
import { ShieldAlert, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminPage() {
  const { user } = useAuth();

  if (!user?.is_admin) {
    return (
      <div className="glass-panel p-8 rounded-2xl border border-red-500/30 text-center space-y-4 max-w-lg mx-auto mt-12 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold font-heading text-gray-100">Access Restricted</h2>
        <p className="text-xs text-gray-400">
          Administrator privileges are required to access this command center. Your current security clearance is insufficient.
        </p>
        <Link
          to="/overview"
          className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
        >
          Return to Overview Workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in w-full">
      <PageHeader
        icon={ShieldAlert}
        title="Administrator Command Center"
        breadcrumb="Admin"
        subtitle="Manage registered users, review server telemetry, enforce cryptographic quotas, and system health"
        badgeText="Privileged Root Access"
        badgeColor="rose"
      />

      <AdminView />
    </div>
  );
}
