import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Sparkles,
  Check,
  Shield,
  HardDrive,
  Clock,
  Phone,
  Flame,
  Zap,
  ArrowRight
} from 'lucide-react';

export const SubscriptionsView = () => {
  const { token, user, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [status, setStatus] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  const fetchStatusAndPlans = async () => {
    try {
      setLoading(true);
      const [stRes, plRes] = await Promise.all([
        fetch('/api/subscriptions/status', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/subscriptions/plans')
      ]);
      if (stRes.ok) setStatus(await stRes.json());
      if (plRes.ok) {
        const plData = await plRes.json();
        setPlans(plData.plans || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusAndPlans();
  }, [token]);

  const handleUpgrade = async (planId) => {
    if (planId === 'custom') {
      window.location.href = 'tel:7977339435';
      return;
    }
    setUpgrading(true);
    try {
      const res = await fetch('/api/subscriptions/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan_name: planId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Upgrade failed');
      showToast(data.message || 'Upgraded successfully!', 'success');
      await fetchStatusAndPlans();
      refreshProfile?.();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUpgrading(false);
    }
  };

  const claimedSlots = status?.total_slots_claimed ?? 0;
  const availableSlots = Math.max(0, 10 - claimedSlots);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Banner: Current Status & Promotional Slot Indicator */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-800/80 relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`badge ${
                user?.plan_type === 'premium' ? 'badge-cyan' : 'bg-slate-800 text-gray-300'
              } text-xs py-1 px-3 font-mono font-bold uppercase`}>
                CURRENT PLAN: {user?.plan_type || 'BASIC'}
              </span>
              {status?.is_promotional_premium && (
                <span className="badge bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs py-1 px-3 font-mono flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 fill-amber-400" />
                  PROMOTIONAL SLOT #{status?.promotional_slot_number} (FREE)
                </span>
              )}
            </div>

            <h2 className="text-xl md:text-2xl font-black text-gray-100 font-heading">
              Secure Cloud Subscription & Quotas
            </h2>
            <p className="text-xs text-gray-400 mt-1 max-w-xl">
              Zero-knowledge cloud infrastructure with cryptographic storage partitions, personal text storage, and private encrypted messaging.
            </p>
          </div>

          {/* Promotional Slots Counter Widget */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 shrink-0 space-y-2 min-w-[260px]">
            <div className="flex items-center justify-between text-xs font-bold text-gray-300 font-mono">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Sparkles className="w-4 h-4" /> 10 Free Slots Pool
              </span>
              <span>{claimedSlots} / 10 Claimed</span>
            </div>

            <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${(claimedSlots / 10) * 100}%` }}
              />
            </div>

            <div className="text-[11px] text-gray-400 font-mono flex items-center justify-between">
              <span>{availableSlots} slots remaining</span>
              {status?.queue_position && (
                <span className="text-amber-400 font-bold">Queue Pos #{status.queue_position}</span>
              )}
            </div>
          </div>
        </div>

        {/* Queue Notice if waiting */}
        {status?.queue_position && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs text-amber-300">
            <Clock className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              You are waiting in the promotional queue at <strong>Position #{status.queue_position}</strong>. As soon as an earlier account frees up a slot, you will be automatically upgraded to 1,000 MB Premium storage at zero cost!
            </span>
          </div>
        )}
      </div>

      {/* 3 Tier Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* PLAN 1: BASIC (FREE) */}
        <div className="p-6 rounded-3xl glass-panel border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-100 font-heading">Basic Plan</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-gray-400 text-[10px] font-mono font-bold">
                FREE
              </span>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-gray-100 font-heading">₹0</span>
              <span className="text-xs text-gray-500 font-mono">/ Forever</span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Essential cloud identity with private notes, communication requests, and promotional queue placement.
            </p>

            <ul className="space-y-2.5 text-xs text-gray-300 pt-2 border-t border-slate-800/80">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Verified Account & Unique Username</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>5 MB Personal Text Notes & Docs</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>User Directory Search</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Private 1-on-1 Encrypted Messaging</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Automatic Promotion Queue Access</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <button
              disabled
              className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-gray-400 text-xs font-bold cursor-default"
            >
              {user?.plan_type === 'basic' ? 'Active Plan' : 'Free Tier'}
            </button>
          </div>
        </div>

        {/* PLAN 2: PREMIUM (₹399/year) */}
        <div className="p-6 rounded-3xl glass-panel border-2 border-cyan-500/60 flex flex-col justify-between shadow-xl shadow-cyan-500/10 relative bg-gradient-to-b from-cyan-950/20 to-slate-900">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 text-[10px] font-black uppercase tracking-wider font-mono shadow-md">
            RECOMMENDED
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-100 font-heading">Premium</h3>
              <span className="badge badge-cyan text-[10px] py-0.5 px-2 font-mono">
                1,000 MB
              </span>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-cyan-300 font-heading">₹399</span>
              <span className="text-xs text-gray-400 font-mono">/ year</span>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Full zero-knowledge cloud file storage with AES-256-GCM + RSA-2048 hybrid client-server encryption.
            </p>

            <ul className="space-y-2.5 text-xs text-gray-200 pt-2 border-t border-slate-800/80">
              <li className="flex items-center gap-2 font-medium">
                <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>1,000 MB (1 GB) Allocated Cloud Storage</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>End-to-End Hybrid File Encryption</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Encrypted Folder Organization</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Private File Sharing & Revocation</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>All Basic & Chat Features Included</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <button
              onClick={() => handleUpgrade('premium')}
              disabled={upgrading || user?.plan_type === 'premium'}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 text-slate-950 text-xs font-black shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
            >
              {user?.plan_type === 'premium' ? 'Currently Active' : upgrading ? 'Upgrading...' : 'Upgrade for ₹399/yr'}
            </button>
          </div>
        </div>

        {/* PLAN 3: CUSTOM PLAN (ENTERPRISE) */}
        <div className="p-6 rounded-3xl glass-panel border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-all">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-100 font-heading">Custom Plan</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-mono font-bold">
                ENTERPRISE
              </span>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-gray-100 font-heading">Contact Us</span>
              <span className="text-xs text-gray-500 font-mono">/ Custom</span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Tailored high-capacity storage allocations, multi-tenant organization workspaces, and priority engineering support.
            </p>

            <ul className="space-y-2.5 text-xs text-gray-300 pt-2 border-t border-slate-800/80">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Custom Multi-GB / TB Storage Quotas</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Dedicated Enterprise Key Management</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Team & Department Workspaces</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Custom S3 & API Ingestion Pipelines</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Priority Dedicated Support Hotline</span>
              </li>
            </ul>
          </div>

          <div className="pt-6">
            <a
              href="tel:7977339435"
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-md shadow-purple-600/20"
            >
              <Phone className="w-3.5 h-3.5" />
              Contact 7977339435
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
