import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  ShieldAlert,
  Users,
  HardDrive,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  Activity,
  RefreshCw,
  UserX,
  UserCheck,
  Mail,
  Trash2,
  Edit,
  Search,
  Filter,
  Eye,
  Send,
  MessageSquare,
  Shield,
  AlertTriangle,
  Server,
  Database,
  ArrowUpRight,
  Sliders,
  X,
  Lock,
  RotateCcw
} from 'lucide-react';

export const AdminView = () => {
  const { token, user } = useAuth();
  const { showToast } = useToast();

  const [activeAdminTab, setActiveAdminTab] = useState('overview'); // 'overview', 'users', 'inquiries', 'security'
  const [overview, setOverview] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [slotsList, setSlotsList] = useState([]);
  const [inquiriesList, setInquiriesList] = useState([]);
  const [auditLogsList, setAuditLogsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Filters & Search
  const [userSearch, setUserSearch] = useState('');
  const [userPlanFilter, setUserPlanFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');

  const [inquirySearch, setInquirySearch] = useState('');
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState('all');
  const [inquiryCategoryFilter, setInquiryCategoryFilter] = useState('all');

  // Modals
  const [selectedInquiryModal, setSelectedInquiryModal] = useState(null);
  const [quotaEditModal, setQuotaEditModal] = useState(null); // { user, quotaMB }
  const [passwordResetModal, setPasswordResetModal] = useState(null); // { user, newPassword }

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [ovRes, uRes, sRes, inqRes, logsRes] = await Promise.all([
        fetch('/api/admin/overview', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/slots', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/contact-inquiries', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/audit-logs?limit=40', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (ovRes.ok) setOverview(await ovRes.json());
      if (uRes.ok) setUsersList(await uRes.json());
      if (sRes.ok) setSlotsList(await sRes.json());
      if (inqRes.ok) setInquiriesList(await inqRes.json());
      if (logsRes.ok) setAuditLogsList(await logsRes.json());
    } catch (err) {
      console.error('Error fetching admin telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  // User Actions
  const handleUserAction = async (targetUserId, action) => {
    setActionLoading(`${targetUserId}-${action}`);
    try {
      const res = await fetch(`/api/admin/users/${targetUserId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Action failed');
      showToast({ type: 'success', title: 'Action Executed', message: data.message });
      await fetchAdminData();
    } catch (err) {
      showToast({ type: 'error', title: 'Action Failed', message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyEmail = async (targetUserId) => {
    setActionLoading(`${targetUserId}-verify`);
    try {
      const res = await fetch(`/api/admin/users/${targetUserId}/verify-email`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to verify user email');
      showToast({ type: 'success', title: 'Email Verified', message: data.message });
      await fetchAdminData();
    } catch (err) {
      showToast({ type: 'error', title: 'Verification Failed', message: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveQuota = async () => {
    if (!quotaEditModal) return;
    try {
      const quotaBytes = Math.max(0, parseInt(quotaEditModal.quotaMB, 10)) * 1024 * 1024;
      const res = await fetch(`/api/admin/users/${quotaEditModal.user.id}/quota`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ storage_quota_bytes: quotaBytes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update storage quota');
      showToast({ type: 'success', title: 'Quota Updated', message: data.message });
      setQuotaEditModal(null);
      await fetchAdminData();
    } catch (err) {
      showToast({ type: 'error', title: 'Quota Error', message: err.message });
    }
  };

  const handleResetPassword = async () => {
    if (!passwordResetModal) return;
    try {
      const res = await fetch(`/api/admin/users/${passwordResetModal.user.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ new_password: passwordResetModal.newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to reset password');
      showToast({ type: 'success', title: 'Password Reset', message: data.message });
      setPasswordResetModal(null);
      await fetchAdminData();
    } catch (err) {
      showToast({ type: 'error', title: 'Password Reset Failed', message: err.message });
    }
  };

  const handleToggleAdminRole = async (targetUser) => {
    if (window.confirm(`Are you sure you want to toggle administrator permissions for @${targetUser.username}?`)) {
      try {
        const res = await fetch(`/api/admin/users/${targetUser.id}/toggle-admin`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to toggle admin role');
        showToast({ type: 'success', title: 'Admin Role Updated', message: data.message });
        await fetchAdminData();
      } catch (err) {
        showToast({ type: 'error', title: 'Failed to Toggle Role', message: err.message });
      }
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (window.confirm(`PERMANENT WARNING: Delete user @${targetUser.username} (${targetUser.email}) and purge all encrypted files?`)) {
      try {
        const res = await fetch(`/api/admin/users/${targetUser.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to delete user');
        showToast({ type: 'success', title: 'User Purged', message: data.message });
        await fetchAdminData();
      } catch (err) {
        showToast({ type: 'error', title: 'Delete Failed', message: err.message });
      }
    }
  };

  // Inquiry Actions
  const handleUpdateInquiryStatus = async (inquiryId, newStatus) => {
    try {
      const res = await fetch(`/api/admin/contact-inquiries/${inquiryId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update status');
      showToast({ type: 'success', title: 'Inquiry Updated', message: data.message });
      setInquiriesList(prev => prev.map(inq => inq.id === inquiryId ? { ...inq, status: newStatus } : inq));
      if (selectedInquiryModal && selectedInquiryModal.id === inquiryId) {
        setSelectedInquiryModal(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Status Error', message: err.message });
    }
  };

  const handleDeleteInquiry = async (inquiryId) => {
    if (window.confirm('Delete this contact inquiry permanently?')) {
      try {
        const res = await fetch(`/api/admin/contact-inquiries/${inquiryId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to delete inquiry');
        showToast({ type: 'success', title: 'Inquiry Removed', message: data.message });
        setInquiriesList(prev => prev.filter(inq => inq.id !== inquiryId));
        setSelectedInquiryModal(null);
      } catch (err) {
        showToast({ type: 'error', title: 'Delete Failed', message: err.message });
      }
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Filtered Users
  const filteredUsers = usersList.filter(u => {
    const matchesSearch = !userSearch || 
      u.email.toLowerCase().includes(userSearch.toLowerCase()) || 
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.full_name && u.full_name.toLowerCase().includes(userSearch.toLowerCase()));
    const matchesPlan = userPlanFilter === 'all' || u.plan_type === userPlanFilter;
    const matchesStatus = userStatusFilter === 'all' || 
      (userStatusFilter === 'active' && u.is_active) || 
      (userStatusFilter === 'suspended' && !u.is_active) ||
      (userStatusFilter === 'unverified' && !u.is_verified);
    return matchesSearch && matchesPlan && matchesStatus;
  });

  // Filtered Inquiries
  const filteredInquiries = inquiriesList.filter(inq => {
    const matchesSearch = !inquirySearch || 
      inq.email.toLowerCase().includes(inquirySearch.toLowerCase()) || 
      inq.name.toLowerCase().includes(inquirySearch.toLowerCase()) ||
      inq.subject.toLowerCase().includes(inquirySearch.toLowerCase()) ||
      inq.message.toLowerCase().includes(inquirySearch.toLowerCase());
    const matchesStatus = inquiryStatusFilter === 'all' || inq.status === inquiryStatusFilter;
    const matchesCategory = inquiryCategoryFilter === 'all' || inq.category === inquiryCategoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-7xl mx-auto">
      {/* Top Executive Header */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-rose-500/40 bg-gradient-to-r from-rose-950/20 via-slate-900 to-indigo-950/20 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-rose-500/30 shrink-0">
              <ShieldAlert className="w-6 h-6 drop-shadow-md" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black font-heading text-gray-100 tracking-tight">
                  Admin Command & Security Center
                </h1>
                <span className="badge badge-rose text-[9px] font-mono uppercase tracking-widest px-2 py-0.5">
                  Full Authority
                </span>
              </div>
              <p className="text-xs text-gray-300 font-mono mt-0.5">
                Executive control over accounts, contact inquiries, storage quotas, and cryptographic telemetry.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={fetchAdminData}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-cyan-400 text-gray-200 hover:text-white text-xs font-semibold shadow-lg transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Live Data</span>
            </button>
          </div>
        </div>

        {/* Console Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-6 mt-4 border-t border-slate-800/80 relative z-10">
          <button
            onClick={() => setActiveAdminTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-2 ${
              activeAdminTab === 'overview'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-md shadow-rose-500/10'
                : 'text-gray-400 hover:text-gray-200 bg-slate-950/60 border border-slate-800'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Telemetry & Quotas</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-2 ${
              activeAdminTab === 'users'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-md shadow-cyan-500/10'
                : 'text-gray-400 hover:text-gray-200 bg-slate-950/60 border border-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Directory ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveAdminTab('inquiries')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-2 relative ${
              activeAdminTab === 'inquiries'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-md shadow-purple-500/10'
                : 'text-gray-400 hover:text-gray-200 bg-slate-950/60 border border-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Contact Queries ({inquiriesList.length})</span>
            {inquiriesList.filter(i => i.status === 'pending').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse ml-1" />
            )}
          </button>

          <button
            onClick={() => setActiveAdminTab('security')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-2 ${
              activeAdminTab === 'security'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md shadow-emerald-500/10'
                : 'text-gray-400 hover:text-gray-200 bg-slate-950/60 border border-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Security Audit Logs</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SYSTEM TELEMETRY & QUOTAS */}
      {activeAdminTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics Grid */}
          {overview && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-4 rounded-2xl glass-panel border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-gray-400 font-mono uppercase font-bold">Registered Users</span>
                <div className="text-2xl font-black text-gray-100 font-heading">{overview.total_users}</div>
                <span className="text-[10px] text-emerald-400 font-mono">{overview.verified_users} Verified</span>
              </div>

              <div className="p-4 rounded-2xl glass-panel border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-gray-400 font-mono uppercase font-bold">Files Stored</span>
                <div className="text-2xl font-black text-cyan-300 font-heading">{overview.total_files}</div>
                <span className="text-[10px] text-cyan-400 font-mono">B2 / S3 Encrypted</span>
              </div>

              <div className="p-4 rounded-2xl glass-panel border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-gray-400 font-mono uppercase font-bold">Premium Slots</span>
                <div className="text-2xl font-black text-indigo-300 font-heading">{overview.active_slots} / 10</div>
                <span className="text-[10px] text-indigo-400 font-mono">1,000 MB per slot</span>
              </div>

              <div className="p-4 rounded-2xl glass-panel border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-gray-400 font-mono uppercase font-bold">Storage Used</span>
                <div className="text-xl font-black text-purple-300 font-heading truncate">
                  {formatBytes(overview.total_storage_used_bytes)}
                </div>
                <span className="text-[10px] text-gray-400 font-mono truncate">Of {formatBytes(overview.total_storage_allocated_bytes)}</span>
              </div>

              <div className="p-4 rounded-2xl glass-panel border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-gray-400 font-mono uppercase font-bold">Contact Inquiries</span>
                <div className="text-2xl font-black text-amber-300 font-heading">{overview.total_inquiries}</div>
                <span className="text-[10px] text-rose-400 font-mono">{overview.pending_inquiries} Pending</span>
              </div>

              <div className="p-4 rounded-2xl glass-panel border border-slate-800/80 space-y-1">
                <span className="text-[10px] text-gray-400 font-mono uppercase font-bold">Vault Secrets</span>
                <div className="text-2xl font-black text-emerald-300 font-heading">{overview.total_vault_items}</div>
                <span className="text-[10px] text-emerald-400 font-mono">{overview.total_documents} Notes</span>
              </div>
            </div>
          )}

          {/* Dedicated Premium Slots Allocation */}
          <div className="p-5 sm:p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-200 font-heading flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>10 Dedicated Premium Slots (1,000 MB Each)</span>
              </h3>
              <span className="badge badge-cyan text-[10px] font-mono">
                {slotsList.filter(s => s.user_id).length} Occupied • {10 - slotsList.filter(s => s.user_id).length} Vacant
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {slotsList.map((slot) => {
                const isOccupied = !!slot.user_id;
                return (
                  <div
                    key={slot.slot_number}
                    className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-3 transition-all ${
                      isOccupied
                        ? 'bg-gradient-to-b from-cyan-950/30 to-slate-900 border-cyan-500/40 text-cyan-200 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-950/40 border-slate-800/80 text-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono font-bold">
                      <span>Slot #{slot.slot_number}</span>
                      <span className={`w-2 h-2 rounded-full ${isOccupied ? 'bg-cyan-400 animate-pulse' : 'bg-gray-700'}`} />
                    </div>

                    <div className="text-xs truncate">
                      {isOccupied ? (
                        <>
                          <div className="font-bold text-gray-200 truncate">@{slot.username}</div>
                          <div className="text-[10px] text-gray-400 truncate font-mono">{slot.email}</div>
                          <div className="text-[9px] text-cyan-400 font-mono font-bold mt-1">1,000 MB Active</div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteUser({ id: slot.user_id, username: slot.username, email: slot.email });
                            }}
                            className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[10px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                            title={`Delete account @${slot.username} and vacate Slot #${slot.slot_number}`}
                          >
                            <Trash2 className="w-3 h-3 text-rose-400" />
                            <span>Delete User</span>
                          </button>
                        </>
                      ) : (
                        <div className="py-2 text-center text-gray-600 italic text-[11px]">Vacant Slot</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER DIRECTORY & MANAGEMENT */}
      {activeAdminTab === 'users' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="p-4 rounded-2xl glass-panel border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search username, email, name..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                className="input-field text-xs py-2 bg-slate-950/80 border-slate-800 rounded-xl w-full"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                value={userPlanFilter}
                onChange={(e) => setUserPlanFilter(e.target.value)}
                className="input-field text-xs py-2 px-3 bg-slate-950/80 border-slate-800 rounded-xl"
              >
                <option value="all">All Plans</option>
                <option value="basic">Basic Plan</option>
                <option value="premium">Premium Plan</option>
                <option value="custom">Custom Plan</option>
              </select>

              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="input-field text-xs py-2 px-3 bg-slate-950/80 border-slate-800 rounded-xl"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="suspended">Suspended Only</option>
                <option value="unverified">Unverified Email</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-gray-400 font-mono uppercase bg-slate-950/60">
                    <th className="py-3 px-4">User & Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Plan & Quota</th>
                    <th className="py-3 px-4">Files / Used</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Admin Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-xs uppercase">
                            {u.username ? u.username.charAt(0) : 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-gray-200">@{u.username}</div>
                            {u.full_name && <div className="text-[10px] text-gray-400">{u.full_name}</div>}
                          </div>
                          {u.is_admin && (
                            <span className="badge badge-rose text-[8px] py-0 px-1 font-mono">ADMIN</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-gray-300">
                        <div>{u.email}</div>
                        <div className="text-[10px]">
                          {u.is_verified ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Verified
                            </span>
                          ) : (
                            <span className="text-amber-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Pending Verification
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span className={`badge text-[9px] py-0 px-1.5 ${
                            u.plan_type === 'premium' ? 'badge-cyan' : 'bg-slate-800 text-gray-400'
                          }`}>
                            {u.plan_type.toUpperCase()}
                            {u.is_promotional_premium && ' (PREMIUM)'}
                          </span>
                          <div className="text-[10px] text-gray-400">
                            {formatBytes(u.storage_quota_bytes)}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-gray-400">
                        <div>{u.file_count} files</div>
                        <div className="text-[10px] text-cyan-400">{formatBytes(u.storage_used_bytes)}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          u.is_active 
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                            : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                        }`}>
                          {u.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {!u.is_verified && (
                            <button
                              onClick={() => handleVerifyEmail(u.id)}
                              disabled={actionLoading === `${u.id}-verify`}
                              className="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 text-[10px] font-bold"
                              title="Force verify email"
                            >
                              Verify
                            </button>
                          )}

                          <button
                            onClick={() => setQuotaEditModal({ user: u, quotaMB: Math.round(u.storage_quota_bytes / (1024 * 1024)) })}
                            className="px-2 py-1 rounded-lg bg-slate-800 text-gray-300 hover:text-white border border-slate-700 text-[10px] font-bold"
                            title="Edit storage quota"
                          >
                            Quota
                          </button>

                          <button
                            onClick={() => setPasswordResetModal({ user: u, newPassword: '' })}
                            className="px-2 py-1 rounded-lg bg-slate-800 text-gray-300 hover:text-white border border-slate-700 text-[10px] font-bold"
                            title="Reset password"
                          >
                            Password
                          </button>

                          {u.is_active ? (
                            <button
                              onClick={() => handleUserAction(u.id, 'suspend')}
                              disabled={actionLoading === `${u.id}-suspend`}
                              className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUserAction(u.id, 'activate')}
                              disabled={actionLoading === `${u.id}-activate`}
                              className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold"
                            >
                              Activate
                            </button>
                          )}

                          <button
                            onClick={() => handleToggleAdminRole(u)}
                            className="p-1 rounded-lg hover:bg-slate-800 text-indigo-400 hover:text-indigo-200"
                            title="Toggle Admin role"
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1 transition-all"
                            title={`Delete user @${u.username} permanently`}
                          >
                            <Trash2 className="w-3 h-3 text-rose-400" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONTACT INQUIRIES & HELPDESK */}
      {activeAdminTab === 'inquiries' && (
        <div className="space-y-4">
          {/* Inquiry Controls Bar */}
          <div className="p-4 rounded-2xl glass-panel border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search subject, email, message..."
                value={inquirySearch}
                onChange={(e) => setInquirySearch(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                className="input-field text-xs py-2 bg-slate-950/80 border-slate-800 rounded-xl w-full"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                value={inquiryStatusFilter}
                onChange={(e) => setInquiryStatusFilter(e.target.value)}
                className="input-field text-xs py-2 px-3 bg-slate-950/80 border-slate-800 rounded-xl"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              <select
                value={inquiryCategoryFilter}
                onChange={(e) => setInquiryCategoryFilter(e.target.value)}
                className="input-field text-xs py-2 px-3 bg-slate-950/80 border-slate-800 rounded-xl"
              >
                <option value="all">All Categories</option>
                <option value="support">General Support</option>
                <option value="security">Security & Vault</option>
                <option value="billing">Plans & Billing</option>
                <option value="sharing">File Sharing</option>
                <option value="feature">Feature Request</option>
              </select>
            </div>
          </div>

          {/* Inquiries Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInquiries.map((inq) => (
              <div
                key={inq.id}
                className={`glass-card p-5 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${
                  inq.status === 'pending'
                    ? 'border-rose-500/40 bg-slate-900/90 shadow-lg shadow-rose-500/5'
                    : inq.status === 'resolved'
                    ? 'border-emerald-500/30 bg-slate-950/60'
                    : 'border-slate-800 bg-slate-950/70'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`badge text-[9px] font-mono uppercase px-2 py-0.5 ${
                      inq.status === 'pending' ? 'badge-rose' : inq.status === 'resolved' ? 'badge-emerald' : 'badge-cyan'
                    }`}>
                      {inq.status.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {new Date(inq.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-gray-100 truncate">{inq.subject}</h4>
                    <p className="text-xs text-cyan-400 font-mono mt-0.5">{inq.name} &bull; {inq.email}</p>
                  </div>

                  <p className="text-xs text-gray-300 line-clamp-3 leading-relaxed bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
                    "{inq.message}"
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedInquiryModal(inq)}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    <span>View Query</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <a
                      href={`mailto:${inq.email}?subject=Re: [SecureCloud] ${encodeURIComponent(inq.subject)}&body=Hello ${encodeURIComponent(inq.name)},\n\nRegarding your inquiry:\n`}
                      className="p-1.5 rounded-xl bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-500/30"
                      title="Reply via Mail"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </a>

                    {inq.status !== 'resolved' ? (
                      <button
                        onClick={() => handleUpdateInquiryStatus(inq.id, 'resolved')}
                        className="p-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30"
                        title="Mark Resolved"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateInquiryStatus(inq.id, 'pending')}
                        className="p-1.5 rounded-xl bg-slate-800 text-gray-400 hover:text-white"
                        title="Reopen"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteInquiry(inq.id)}
                      className="p-1.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                      title="Delete inquiry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredInquiries.length === 0 && (
              <div className="col-span-full p-12 text-center glass-panel rounded-2xl border border-slate-800 text-gray-400 text-xs">
                No contact inquiries match the current filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SYSTEM AUDIT LOGS */}
      {activeAdminTab === 'security' && (
        <div className="space-y-6">
          {/* Audit Trail */}
          <div className="p-5 sm:p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
            <h3 className="font-bold text-sm text-gray-100 font-heading flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Full System Security Audit Logs</span>
            </h3>

            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar font-mono text-[11px]">
              {auditLogsList.map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-gray-300 hover:bg-slate-900/60 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="badge badge-cyan text-[9px] py-0 px-1.5 shrink-0">
                      {log.action_type}
                    </span>
                    <span className="truncate">{log.description}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 shrink-0 ml-3 font-mono">
                    {new Date(log.created_at).toLocaleTimeString()} &bull; IP: {log.ip_address}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: View Contact Inquiry Details */}
      {selectedInquiryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel max-w-lg w-full p-6 rounded-3xl border border-cyan-500/40 shadow-2xl space-y-4 bg-slate-950/95">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="badge badge-cyan text-[10px] font-mono uppercase">
                  {selectedInquiryModal.category}
                </span>
                <h3 className="text-base font-bold text-gray-100 font-heading mt-1">
                  {selectedInquiryModal.subject}
                </h3>
              </div>
              <button
                onClick={() => setSelectedInquiryModal(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1 text-xs">
              <div><strong className="text-gray-400 font-mono">From:</strong> {selectedInquiryModal.name}</div>
              <div><strong className="text-gray-400 font-mono">Email:</strong> {selectedInquiryModal.email}</div>
              <div><strong className="text-gray-400 font-mono">Date:</strong> {new Date(selectedInquiryModal.created_at).toLocaleString()}</div>
              <div><strong className="text-gray-400 font-mono">Client IP:</strong> {selectedInquiryModal.ip_address || 'N/A'}</div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-mono text-gray-400 font-bold">Inquiry Message</label>
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-gray-200 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                {selectedInquiryModal.message}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <a
                href={`mailto:${selectedInquiryModal.email}?subject=Re: [SecureCloud] ${encodeURIComponent(selectedInquiryModal.subject)}`}
                className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Reply to User</span>
              </a>

              <div className="flex items-center gap-2">
                {selectedInquiryModal.status !== 'resolved' ? (
                  <button
                    onClick={() => handleUpdateInquiryStatus(selectedInquiryModal.id, 'resolved')}
                    className="px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold"
                  >
                    Mark Resolved
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpdateInquiryStatus(selectedInquiryModal.id, 'pending')}
                    className="px-3 py-2 rounded-xl bg-slate-800 text-gray-300 text-xs font-semibold"
                  >
                    Mark Pending
                  </button>
                )}
                <button
                  onClick={() => setSelectedInquiryModal(null)}
                  className="btn-secondary text-xs py-2 px-3"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Storage Quota */}
      {quotaEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel max-w-sm w-full p-6 rounded-3xl border border-cyan-500/40 shadow-2xl space-y-4 bg-slate-950/95">
            <h3 className="text-sm font-bold text-gray-100 font-heading">
              Update Quota for @{quotaEditModal.user.username}
            </h3>
            <p className="text-xs text-gray-400">
              Enter the maximum storage allowance in Megabytes (MB). E.g. 1,000 MB = 1 GB.
            </p>
            <div>
              <label className="text-[10px] font-mono text-gray-400 uppercase font-bold block mb-1">Quota (MB)</label>
              <input
                type="number"
                min="0"
                value={quotaEditModal.quotaMB}
                onChange={(e) => setQuotaEditModal({ ...quotaEditModal, quotaMB: e.target.value })}
                className="input-field text-sm py-2 px-3 bg-slate-900 border-slate-700 w-full font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setQuotaEditModal(null)}
                className="btn-secondary text-xs py-2 px-3"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuota}
                className="btn-primary text-xs py-2 px-4"
              >
                Save Quota
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Direct Password Reset */}
      {passwordResetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="glass-panel max-w-sm w-full p-6 rounded-3xl border border-rose-500/40 shadow-2xl space-y-4 bg-slate-950/95">
            <h3 className="text-sm font-bold text-gray-100 font-heading">
              Reset Password for @{passwordResetModal.user.username}
            </h3>
            <p className="text-xs text-gray-400">
              Directly override user master password. Must be at least 8 characters.
            </p>
            <div>
              <label className="text-[10px] font-mono text-gray-400 uppercase font-bold block mb-1">New Password</label>
              <input
                type="password"
                placeholder="Enter 8+ chars..."
                value={passwordResetModal.newPassword}
                onChange={(e) => setPasswordResetModal({ ...passwordResetModal, newPassword: e.target.value })}
                className="input-field text-sm py-2 px-3 bg-slate-900 border-slate-700 w-full font-mono"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPasswordResetModal(null)}
                className="btn-secondary text-xs py-2 px-3"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={passwordResetModal.newPassword.length < 8}
                className="btn-primary text-xs py-2 px-4 shadow-md shadow-rose-500/20"
              >
                Override Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
