import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Lock,
  Unlock,
  Plus,
  Trash2,
  ShieldCheck,
  Eye,
  EyeOff,
  Key,
  Copy,
  Check,
  FileCode,
  StickyNote,
  Terminal,
  Sparkles
} from 'lucide-react';
import { VaultLock3D } from './VaultLock3D';
import { useAuth } from '../context/AuthContext';

export const VaultView = () => {
  const { token } = useAuth();
  const [unlocked, setUnlocked] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [secrets, setSecrets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('password');
  const [newPayload, setNewPayload] = useState('');
  const [visibleSecretIds, setVisibleSecretIds] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  const fetchSecrets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vault', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSecrets(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = (e) => {
    e.preventDefault();
    if (masterPassword.length >= 6) {
      setUnlocked(true);
      fetchSecrets();
    }
  };

  const handleAddSecret = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/vault', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newTitle,
          secret_type: newType,
          payload: newPayload
        })
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewTitle('');
        setNewPayload('');
        fetchSecrets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSecret = async (id) => {
    try {
      const res = await fetch(`/api/vault/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchSecrets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const togglePayloadVisibility = (id) => {
    setVisibleSecretIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyPayload = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'key': return Key;
      case 'note': return StickyNote;
      default: return KeyRound;
    }
  };

  const filteredSecrets = secrets.filter((s) => {
    if (filterType === 'all') return true;
    return s.secret_type === filterType;
  });

  if (!unlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[68vh] animate-fade-in">
        <div className="glass-panel p-8 max-w-md w-full text-center space-y-6 border-cyan-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Interactive 3D Vault Lock */}
          <VaultLock3D isUnlocked={false} />

          <div className="space-y-1.5">
            <h3 className="text-2xl font-black gradient-text">Zero-Knowledge Vault</h3>
            <p className="text-xs text-gray-400 font-mono">
              AES-256-GCM client-isolated credential storage
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4 pt-2">
            <input
              type="password"
              placeholder="Enter Master Password to Decrypt..."
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              className="input-field text-center font-mono text-xs py-3 bg-slate-950/90 border-slate-700"
            />
            <button type="submit" className="btn-primary w-full justify-center text-xs py-3 shadow-lg shadow-cyan-500/25">
              <Unlock className="w-4 h-4" /> Unlock Cryptographic Vault
            </button>
          </form>

          <p className="text-[10px] text-gray-500 font-mono">
            Demo tip: Use your master password (e.g. Password123!)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-panel p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-slate-800/80 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-md">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-100">Zero-Knowledge Secret Vault</h2>
              <span className="badge badge-cyan text-[10px] font-mono">AES-256</span>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Encrypted credentials, SSH keys, and tokens with client-side isolation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setUnlocked(false)}
            className="btn-secondary text-xs py-2 px-3.5"
          >
            <Lock className="w-3.5 h-3.5" /> Lock Vault
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary text-xs py-2 px-4 shadow-lg shadow-cyan-500/25"
          >
            <Plus className="w-4 h-4" /> Add New Secret
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'all', label: 'All Items' },
          { id: 'password', label: 'Passwords & Tokens' },
          { id: 'key', label: 'API & SSH Keys' },
          { id: 'note', label: 'Encrypted Notes' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === tab.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-slate-800/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Secrets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSecrets.map((secret) => {
          const SecretIcon = getTypeIcon(secret.secret_type);
          const isVisible = !!visibleSecretIds[secret.id];

          return (
            <div key={secret.id} className="glass-card p-5 space-y-4 relative group hover:border-cyan-500/40">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <SecretIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-100">{secret.title}</h4>
                    <span className="badge badge-purple text-[9px] py-0 px-1.5 uppercase font-mono mt-0.5">
                      {secret.secret_type}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteSecret(secret.id)}
                  title="Delete Secret"
                  className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Payload Box */}
              <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-2 shadow-inner">
                <span className="font-mono text-xs text-cyan-300 truncate select-all flex-1">
                  {isVisible ? secret.encrypted_payload : '••••••••••••••••••••••••'}
                </span>
                
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => togglePayloadVisibility(secret.id)}
                    title={isVisible ? "Hide Secret" : "Reveal Secret"}
                    className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-slate-800 rounded-md transition-all"
                  >
                    {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => handleCopyPayload(secret.id, secret.encrypted_payload)}
                    title="Copy to Clipboard"
                    className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-slate-800 rounded-md transition-all"
                  >
                    {copiedId === secret.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono pt-1">
                <span>Created {new Date(secret.created_at).toLocaleDateString()}</span>
                <span className="text-emerald-400">Zero-Knowledge Validated</span>
              </div>
            </div>
          );
        })}

        {filteredSecrets.length === 0 && !loading && (
          <div className="p-12 text-center glass-panel col-span-full space-y-3">
            <KeyRound className="w-12 h-12 text-slate-600 mx-auto opacity-70" />
            <h4 className="text-sm font-bold text-gray-300">No secrets saved in this category</h4>
            <p className="text-xs text-gray-400 font-mono">
              Click "Add New Secret" to securely store confidential API tokens, passwords, or keys.
            </p>
          </div>
        )}
      </div>

      {/* Add Secret Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-panel bg-slate-900 border-slate-700 w-full max-w-md p-6 rounded-2xl shadow-2xl">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-100">Add Secret to Encrypted Vault</h3>
                <p className="text-[10px] text-gray-400 font-mono">AES-256 Payload Cipher</p>
              </div>
            </div>

            <form onSubmit={handleAddSecret} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Title / Identifier</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS Production S3 Master Key"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="input-field text-xs bg-slate-950/80"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Secret Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="input-field text-xs bg-slate-950/80"
                >
                  <option value="password">Password / Token</option>
                  <option value="key">API / SSH Private Key</option>
                  <option value="note">Confidential Secret Note</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Confidential Payload</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Paste private key, token string, or confidential credentials..."
                  value={newPayload}
                  onChange={(e) => setNewPayload(e.target.value)}
                  className="input-field font-mono text-xs bg-slate-950/80"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary text-xs py-2 px-3.5">
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs py-2 px-4">
                  Encrypt & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
