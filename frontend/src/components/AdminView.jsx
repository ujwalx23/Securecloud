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
  UserCheck
} from 'lucide-react';

export const AdminView = () => {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [overview, setOverview] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [slotsList, setSlotsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [ovRes, uRes, sRes] = await Promise.all([
        fetch('/api/admin/overview', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/slots', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (ovRes.ok) setOverview(await ovRes.json());
      if (uRes.ok) setUsersList(await uRes.json());
      if (sRes.ok) setSlotsList(await sRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

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
      showToast(data.message, 'success');
      await fetchAdminData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Admin Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel border border-rose-500/30 bg-rose-950/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-100 font-heading flex items-center gap-2">
              System Administration & Monitoring
              <span className="badge badge-rose text-[9px] py-0 px-2 font-mono">RESTRICTED</span>
            </h2>
            <p className="text-xs text-gray-400">
              Manage promotional storage slots, waitlist queues, user permissions, and audit logs.
            </p>
          </div>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-gray-300 hover:text-white text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Metrics
        </button>
      </div>

      {/* Metrics Counters Grid */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl glass-panel border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-gray-400 font-mono uppercase font-bold">Total Accounts</span>
            <div className="text-xl font-black text-gray-100 font-heading">{overview.total_users}</div>
            <span className="text-[10px] text-emerald-400 font-mono">{overview.verified_users} verified</span>
          </div>

          <div className="p-4 rounded-2xl glass-panel border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-gray-400 font-mono uppercase font-bold">Active Promo Slots</span>
            <div className="text-xl font-black text-cyan-300 font-heading">{overview.active_slots} / 10</div>
            <span className="text-[10px] text-cyan-400 font-mono">1,000 MB per slot</span>
          </div>

          <div className="p-4 rounded-2xl glass-panel border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-gray-400 font-mono uppercase font-bold">Waitlist Queue</span>
            <div className="text-xl font-black text-amber-300 font-heading">{overview.queue_length}</div>
            <span className="text-[10px] text-amber-400 font-mono">Auto-promotion armed</span>
          </div>

          <div className="p-4 rounded-2xl glass-panel border border-slate-800/80 space-y-1">
            <span className="text-[10px] text-gray-400 font-mono uppercase font-bold">Storage Allocated / Used</span>
            <div className="text-lg font-black text-purple-300 font-heading truncate">
              {formatBytes(overview.total_storage_used_bytes)} / {formatBytes(overview.total_storage_allocated_bytes)}
            </div>
            <span className="text-[10px] text-purple-400 font-mono">Budget 10 GB</span>
          </div>
        </div>
      )}

      {/* 10 Promotional Slots Live Grid */}
      <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-4">
        <h3 className="font-bold text-sm text-gray-200 font-heading flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          10 Promotional Storage Slots Allocation Status
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {slotsList.map((slot) => {
            const isOccupied = !!slot.user_id;
            return (
              <div
                key={slot.slot_number}
                className={`p-3 rounded-xl border flex flex-col justify-between gap-2 ${
                  isOccupied
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200'
                    : 'bg-slate-900/40 border-slate-800/80 text-gray-500'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span>Slot #{slot.slot_number}</span>
                  <span className={`w-2 h-2 rounded-full ${isOccupied ? 'bg-cyan-400 animate-pulse' : 'bg-gray-700'}`} />
                </div>
                <div className="text-[11px] truncate">
                  {isOccupied ? (
                    <>
                      <div className="font-bold text-gray-200 truncate">@{slot.username}</div>
                      <div className="text-[9px] text-cyan-400 font-mono">1,000 MB Active</div>
                    </>
                  ) : (
                    <span className="italic text-gray-600">Vacant</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Registered Users Table */}
      <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-4">
        <h3 className="font-bold text-sm text-gray-200 font-heading flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          User Directory & Account Permissions
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] text-gray-500 font-mono uppercase">
                <th className="pb-2.5">User</th>
                <th className="pb-2.5">Email</th>
                <th className="pb-2.5">Plan</th>
                <th className="pb-2.5">Queue / Storage</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {usersList.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/20">
                  <td className="py-2.5 font-bold text-gray-200">@{u.username}</td>
                  <td className="py-2.5 text-gray-400">{u.email}</td>
                  <td className="py-2.5">
                    <span className={`badge text-[9px] py-0 px-1.5 ${
                      u.plan_type === 'premium' ? 'badge-cyan' : 'bg-slate-800 text-gray-400'
                    }`}>
                      {u.plan_type.toUpperCase()}
                      {u.is_promotional_premium && ' (FREE)'}
                    </span>
                  </td>
                  <td className="py-2.5 text-gray-400">
                    {u.queue_position ? `Queue #${u.queue_position}` : formatBytes(u.storage_quota_bytes)}
                  </td>
                  <td className="py-2.5">
                    <span className={`text-[10px] ${u.is_active ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {u.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="py-2.5 text-right space-x-1">
                    {u.is_active ? (
                      <button
                        onClick={() => handleUserAction(u.id, 'suspend')}
                        disabled={actionLoading === `${u.id}-suspend`}
                        className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold"
                      >
                        Suspend
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUserAction(u.id, 'activate')}
                        disabled={actionLoading === `${u.id}-activate`}
                        className="px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold"
                      >
                        Activate
                      </button>
                    )}
                    {u.plan_type === 'basic' && (
                      <button
                        onClick={() => handleUserAction(u.id, 'promote')}
                        disabled={actionLoading === `${u.id}-promote`}
                        className="px-2 py-0.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-[10px] font-bold"
                      >
                        Promote
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Audit Log */}
      {overview?.recent_audit_logs && (
        <div className="p-5 rounded-2xl glass-panel border border-slate-800 space-y-3">
          <h3 className="font-bold text-sm text-gray-200 font-heading flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Recent Security Audit Trail
          </h3>

          <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar font-mono text-[11px]">
            {overview.recent_audit_logs.map((log) => (
              <div key={log.id} className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/60 flex items-center justify-between text-gray-300">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-cyan-400 font-bold">[{log.action_type}]</span>
                  <span className="truncate">{log.description}</span>
                </div>
                <div className="text-[10px] text-gray-500 shrink-0 ml-2">
                  {new Date(log.created_at).toLocaleTimeString()} • {log.ip_address}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
