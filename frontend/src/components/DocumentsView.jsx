import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  FileText,
  Plus,
  Pin,
  Trash2,
  Save,
  Search,
  Clock,
  HardDrive
} from 'lucide-react';

export const DocumentsView = () => {
  const { token, user, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeDoc, setActiveDoc] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
        if (data.length > 0 && !activeDoc) {
          selectDoc(data[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [token]);

  const selectDoc = (doc) => {
    setActiveDoc(doc);
    setTitle(doc.title);
    setContent(doc.content || '');
  };

  const handleCreateNew = () => {
    const newDoc = { id: 'new', title: 'Untitled Note', content: '', is_pinned: false };
    setActiveDoc(newDoc);
    setTitle('Untitled Note');
    setContent('');
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showToast({ type: 'error', title: 'Validation Error', message: 'Title cannot be empty.' });
      return;
    }
    setIsSaving(true);
    try {
      if (activeDoc?.id === 'new') {
        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ title, content, is_pinned: false })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to create document');
        showToast({ type: 'success', title: 'Document Saved', message: 'Note encrypted and stored.' });
        await fetchDocs();
        selectDoc(data);
        refreshProfile?.();
      } else {
        const res = await fetch(`/api/documents/${activeDoc.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ title, content })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to update document');
        showToast({ type: 'success', title: 'Document Updated', message: 'Changes saved successfully.' });
        await fetchDocs();
        selectDoc(data);
        refreshProfile?.();
      }
    } catch (err) {
      showToast({ type: 'error', title: 'Save Failed', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (docId, e) => {
    e?.stopPropagation();
    if (!confirm('Are you sure you want to permanently delete this document?')) return;
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete document');
      showToast({ type: 'info', title: 'Document Deleted', message: 'Note erased permanently.' });
      if (activeDoc?.id === docId) {
        setActiveDoc(null);
        setTitle('');
        setContent('');
      }
      await fetchDocs();
      refreshProfile?.();
    } catch (err) {
      showToast({ type: 'error', title: 'Delete Failed', message: err.message });
    }
  };

  const handleTogglePin = async (doc, e) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_pinned: !doc.is_pinned })
      });
      if (res.ok) {
        await fetchDocs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    (d.content && d.content.toLowerCase().includes(search.toLowerCase()))
  );

  const textUsedBytes = user?.text_storage_used_bytes || 0;
  const textQuotaBytes = user?.text_storage_quota_bytes || 5242880;
  const textPercent = Math.min(100, Math.round((textUsedBytes / textQuotaBytes) * 100));

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-4 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl glass-panel border border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-100 font-heading">Personal Documents & Notes</h2>
              <p className="text-xs text-gray-400">Encrypted personal notes with 5 MB dedicated free text storage.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Text Storage Meter */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-gray-400 font-mono text-[11px]">
              {(textUsedBytes / 1024).toFixed(1)} KB / {(textQuotaBytes / (1024 * 1024)).toFixed(0)} MB
            </span>
            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-400" style={{ width: `${Math.max(textPercent, 2)}%` }} />
            </div>
          </div>

          <button
            onClick={handleCreateNew}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Document
          </button>
        </div>
      </div>

      {/* Main Two-Panel Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-0">
        {/* Left List Column */}
        <div className="md:col-span-4 flex flex-col rounded-2xl glass-panel border border-slate-800/80 p-3 min-h-0">
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {loading ? (
              <div className="text-center py-10 text-xs text-gray-500 font-mono">Loading notes...</div>
            ) : filteredDocs.length === 0 ? (
              <div className="text-center py-12 px-4 text-xs text-gray-500 space-y-2">
                <FileText className="w-8 h-8 text-gray-600 mx-auto" />
                <p>No documents found.</p>
                <button
                  onClick={handleCreateNew}
                  className="text-cyan-400 hover:underline font-semibold"
                >
                  Create your first note
                </button>
              </div>
            ) : (
              filteredDocs.map((doc) => {
                const isSelected = activeDoc?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => selectDoc(doc)}
                    className={`p-3 rounded-xl cursor-pointer transition-all border group relative ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-gray-100 shadow-sm'
                        : 'bg-slate-900/40 border-slate-800/60 text-gray-300 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-xs truncate flex items-center gap-1.5">
                        {doc.is_pinned && <Pin className="w-3 h-3 text-cyan-400 shrink-0 fill-cyan-400" />}
                        <span className="truncate">{doc.title}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleTogglePin(doc, e)}
                          className="p-1 hover:text-cyan-400 text-gray-400"
                          title={doc.is_pinned ? 'Unpin' : 'Pin to top'}
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(doc.id, e)}
                          className="p-1 hover:text-rose-400 text-gray-400"
                          title="Delete note"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-1 font-mono">
                      {doc.content ? doc.content.slice(0, 80) : 'Empty document...'}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-gray-500 mt-2 font-mono">
                      <span>{(doc.size_bytes || 0)} B</span>
                      <span>{new Date(doc.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Editor Column */}
        <div className="md:col-span-8 flex flex-col rounded-2xl glass-panel border border-slate-800/80 p-4 min-h-0">
          {activeDoc ? (
            <div className="flex-1 flex flex-col min-h-0 space-y-3">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                <input
                  type="text"
                  placeholder="Document Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex-1 bg-transparent font-bold text-base text-gray-100 focus:outline-none placeholder-gray-500 font-heading"
                />
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Saving...' : 'Save Note'}
                </button>
              </div>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your secure notes, thoughts, and documents here..."
                className="flex-1 w-full bg-slate-900/30 border border-slate-800/60 rounded-xl p-4 text-xs font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500/40 resize-none custom-scrollbar leading-relaxed"
              />

              <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono px-1">
                <span>{content.length} characters • {new Blob([content]).size} bytes</span>
                <span>Auto-saved locally</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-500 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-300 text-sm">Select or create a document</h3>
              <p className="text-xs max-w-sm">Keep your notes, cryptographic snippets, and records safely stored in your private cloud partition.</p>
              <button
                onClick={handleCreateNew}
                className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold hover:bg-cyan-500/30 transition-colors"
              >
                + Create New Note
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
