import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  Clock,
  Key,
  Download,
  Upload,
  Share2,
  Trash2,
  Lock,
  Radio,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ActivityLog = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/stats/activity', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [token]);

  const getActionBadge = (action) => {
    if (action.includes('UPLOAD')) {
      return { label: action, bg: 'rgba(0, 245, 255, 0.12)', color: '#00f5ff', icon: Upload };
    }
    if (action.includes('DOWNLOAD')) {
      return { label: action, bg: 'rgba(16, 185, 129, 0.12)', color: '#10b981', icon: Download };
    }
    if (action.includes('SHARE')) {
      return { label: action, bg: 'rgba(129, 140, 248, 0.12)', color: '#818cf8', icon: Share2 };
    }
    if (action.includes('REVOKE') || action.includes('DELETE') || action.includes('TRASH')) {
      return { label: action, bg: 'rgba(244, 63, 94, 0.12)', color: '#f43f5e', icon: ShieldAlert };
    }
    if (action.includes('VAULT')) {
      return { label: action, bg: 'rgba(192, 132, 252, 0.12)', color: '#c084fc', icon: Key };
    }
    return { label: action, bg: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', icon: Activity };
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === 'ALL') return true;
    return log.action_type.includes(filter);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="glass-panel p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-slate-800/80 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-md">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-100">Security Audit & Telemetry Log</h2>
              <span className="badge badge-cyan text-[10px]">Real-Time</span>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Cryptographically timestamped audit trail and file access logs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/60 px-3.5 py-2 rounded-xl border border-slate-800">
          <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-xs text-cyan-400 font-mono font-semibold">Telemetry Feed Online</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'ALL', label: 'All Security Events' },
          { id: 'UPLOAD', label: 'Uploads & Versioning' },
          { id: 'DOWNLOAD', label: 'Downloads & Previews' },
          { id: 'SHARE', label: 'Sharing & Access' },
          { id: 'VAULT', label: 'Vault Operations' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filter === tab.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-slate-800/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Logs Stream */}
      <div className="glass-panel overflow-hidden border-slate-800/80 shadow-xl">
        <div className="divide-y divide-slate-800/80">
          {filteredLogs.map((log) => {
            const badge = getActionBadge(log.action_type);
            const Icon = badge.icon;

            return (
              <div
                key={log.id}
                className="p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/60 transition-all duration-150"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                    style={{ backgroundColor: badge.bg, borderColor: `${badge.color}40`, color: badge.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-gray-200">{log.description}</h4>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono mt-1">
                      <span className="badge text-[9px] py-0 px-1.5 uppercase" style={{ color: badge.color, backgroundColor: badge.bg }}>
                        {log.action_type}
                      </span>
                      <span>•</span>
                      <span>Client IP: {log.ip_address}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800 self-start sm:self-center shrink-0">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>
            );
          })}

          {filteredLogs.length === 0 && !loading && (
            <div className="p-12 text-center text-xs text-gray-400 font-mono space-y-2">
              <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto" />
              <p>No audit logs matching selected filter.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
