import React, { useState } from 'react';
import {
  Mail,
  Send,
  ShieldCheck,
  Copy,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  MessageSquare,
  HelpCircle,
  FileCode,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const ContactView = ({ onClose }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [senderName, setSenderName] = useState(user?.full_name || user?.username || '');
  const [senderEmail, setSenderEmail] = useState(user?.email || '');
  const [category, setCategory] = useState('support');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const officialEmail = 'ujwalsingh164@gmail.com';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(officialEmail);
    setCopiedEmail(true);
    showToast({
      type: 'success',
      title: 'Email Copied',
      message: `${officialEmail} copied to clipboard.`
    });
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handleDirectMailto = () => {
    const encodedSubject = encodeURIComponent(subject ? `[SecureCloud ${category.toUpperCase()}] ${subject}` : '[SecureCloud Inquiry]');
    const encodedBody = encodeURIComponent(`From: ${senderName} (${senderEmail})\nCategory: ${category}\n\nMessage:\n${message}`);
    window.location.href = `mailto:${officialEmail}?subject=${encodedSubject}&body=${encodedBody}`;
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      await fetch('/api/contact/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: senderName || 'Anonymous User',
          email: senderEmail,
          category,
          subject: subject || 'General Inquiry',
          message
        })
      });
    } catch (err) {
      console.warn('Backend inquiry save note:', err);
    }

    handleDirectMailto();
    setSubmitted(true);
    showToast({
      type: 'success',
      title: 'Inquiry Submitted',
      message: `Your inquiry has been logged for admin review and directed to ${officialEmail}`
    });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-10">
      {/* Top Banner */}
      <div className="glass-panel p-6 sm:p-8 border border-cyan-500/30 rounded-3xl relative overflow-hidden shadow-2xl bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="badge badge-cyan text-[10px] font-mono">Official Support Portal</span>
              <span className="badge badge-emerald text-[10px] font-mono">24/7 Monitored</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-heading gradient-text">
              Contact SecureCloud
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 max-w-xl leading-relaxed">
              Have questions regarding zero-knowledge encryption, account quotas, custom plans, or bug reporting? Reach out directly to our engineering team.
            </p>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-gray-400 hover:text-gray-100 transition-colors border border-slate-800 self-start sm:self-auto"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Official Email */}
        <div className="glass-panel p-5 rounded-2xl border-slate-800/80 space-y-3 relative group hover:border-cyan-500/40 transition-all">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-100 font-heading">Primary Support Email</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Authoritative contact address</p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <span className="font-mono text-xs text-cyan-300 truncate select-all">{officialEmail}</span>
            <button
              onClick={handleCopyEmail}
              className="text-gray-400 hover:text-cyan-300 p-1 rounded transition-colors"
              title="Copy Email"
            >
              {copiedEmail ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button
            onClick={handleDirectMailto}
            className="w-full btn-primary text-xs py-2 flex items-center justify-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Open Email Client</span>
          </button>
        </div>

        {/* Card 2: SLA Response Time */}
        <div className="glass-panel p-5 rounded-2xl border-slate-800/80 space-y-3 relative group hover:border-emerald-500/40 transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-100 font-heading">Guaranteed Response SLA</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Direct developer correspondence</p>
          </div>
          <div className="space-y-1.5 text-xs text-gray-300">
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60 font-mono text-[11px]">
              <span className="text-gray-400">Account Issues:</span>
              <span className="text-emerald-400 font-bold">&lt; 12 Hours</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-800/60 font-mono text-[11px]">
              <span className="text-gray-400">Security Reports:</span>
              <span className="text-cyan-400 font-bold">&lt; 6 Hours</span>
            </div>
            <div className="flex items-center justify-between py-1 font-mono text-[11px]">
              <span className="text-gray-400">General Inquiries:</span>
              <span className="text-gray-300">&lt; 24 Hours</span>
            </div>
          </div>
        </div>

        {/* Card 3: Cryptographic Integrity */}
        <div className="glass-panel p-5 rounded-2xl border-slate-800/80 space-y-3 relative group hover:border-indigo-500/40 transition-all">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-100 font-heading">Cryptographic PGP / Audit</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Responsible disclosure channel</p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-gray-400 space-y-1">
            <p className="text-cyan-300 font-semibold">Zero-Knowledge Guarantee:</p>
            <p className="leading-relaxed">
              We never ask for your Master Password or Private Keys. Support personnel cannot inspect your files.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Support Inquiry Form */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/80 shadow-xl space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold font-heading text-gray-100">Send an Inquiry / Support Message</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Fill in your details below to compose your ticket directly to {officialEmail}
            </p>
          </div>
        </div>

        {submitted && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold">Inquiry Prepared!</p>
              <p className="text-[11px] text-emerald-300/80 mt-0.5">
                Your email client was opened with your message. If it did not open automatically, please send your email directly to <strong className="font-mono underline">{officialEmail}</strong>.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmitForm} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 font-mono">
                Your Name / Username
              </label>
              <input
                type="text"
                required
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="e.g. Ujwal Singh"
                className="input-field text-xs py-2.5 bg-slate-950/80"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 font-mono">
                Your Contact Email
              </label>
              <input
                type="email"
                required
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="e.g. user@gmail.com"
                className="input-field text-xs py-2.5 bg-slate-950/80"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 font-mono">
                Inquiry Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field text-xs py-2.5 bg-slate-950/80"
              >
                <option value="support">General Technical Support</option>
                <option value="vault">Zero-Knowledge Vault & Master Password</option>
                <option value="quota">Storage Quota & Plan Upgrades</option>
                <option value="security">Security Vulnerability / Bug Report</option>
                <option value="enterprise">Custom Enterprise Deployment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 font-mono">
                Subject
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Question regarding encrypted file sharing"
                className="input-field text-xs py-2.5 bg-slate-950/80"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 font-mono">
              Message Details
            </label>
            <textarea
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue, question, or feature request in detail..."
              className="input-field text-xs py-3 bg-slate-950/80 resize-none font-sans"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <p className="text-[11px] text-gray-400 font-mono">
              Direct inquiries dispatched to: <span className="text-cyan-400">{officialEmail}</span>
            </p>
            <button
              type="submit"
              className="btn-primary text-xs py-2.5 px-6 shadow-lg shadow-cyan-500/20 flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              <Send className="w-4 h-4" />
              <span>Send Support Message</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
