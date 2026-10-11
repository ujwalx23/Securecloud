import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Users,
  UserPlus,
  Search,
  Check,
  X,
  ShieldAlert,
  MessageSquare,
  Clock,
  Sparkles,
  UserCheck
} from 'lucide-react';

export const ContactsView = ({ onStartChat }) => {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('connections'); // 'connections', 'search', 'incoming', 'outgoing'
  const [connections, setConnections] = useState([]);
  const [incomingReqs, setIncomingReqs] = useState([]);
  const [outgoingReqs, setOutgoingReqs] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);

  // Request modal
  const [requestTargetUser, setRequestTargetUser] = useState(null);
  const [requestNote, setRequestNote] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users/connections', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setConnections(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const [incRes, outRes] = await Promise.all([
        fetch('/api/users/requests/incoming', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/users/requests/outgoing', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (incRes.ok) setIncomingReqs(await incRes.json());
      if (outRes.ok) setOutgoingReqs(await outRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchConnections();
    fetchRequests();
  }, [token]);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setIsSearching(true);
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSearchResults(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!requestTargetUser) return;
    setSendingRequest(true);
    try {
      const res = await fetch('/api/users/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          receiver_username: requestTargetUser.username,
          note: requestNote.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to send request');
      showToast(`Communication request sent to @${requestTargetUser.username}.`, 'success');
      setRequestTargetUser(null);
      setRequestNote('');
      fetchRequests();
      handleSearch(searchQuery);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleRespond = async (requestId, action) => {
    try {
      const res = await fetch(`/api/users/requests/${requestId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to respond');
      showToast(`Request ${action}ed.`, 'success');
      await fetchRequests();
      await fetchConnections();
      if (action === 'accept' && data.conversation_id && onStartChat) {
        onStartChat(data.conversation_id);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleOpenChatWith = async (targetUserId) => {
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ recipient_id: targetUserId })
      });
      const data = await res.json();
      if (res.ok && data.conversation_id && onStartChat) {
        onStartChat(data.conversation_id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl glass-panel border border-slate-800/80">
        <div>
          <h2 className="text-lg font-bold text-gray-100 font-heading flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Contacts & User Directory
          </h2>
          <p className="text-xs text-gray-400">Manage verified user connections, private communication requests, and search profiles.</p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-slate-800">
          <button
            onClick={() => setActiveTab('connections')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'connections'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Connected ({connections.length})
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'search'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Find Users
          </button>
          <button
            onClick={() => setActiveTab('incoming')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
              activeTab === 'incoming'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Requests
            {incomingReqs.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {incomingReqs.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab 1: My Connections */}
      {activeTab === 'connections' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? (
            <div className="col-span-full text-center py-12 text-xs text-gray-500 font-mono">Loading connections...</div>
          ) : connections.length === 0 ? (
            <div className="col-span-full text-center py-16 rounded-2xl glass-panel border border-slate-800/80 p-8 space-y-3">
              <Users className="w-10 h-10 text-gray-600 mx-auto" />
              <h3 className="font-bold text-gray-300 text-sm">No connections yet</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Search for users by their unique username and send a communication request to start private conversations.
              </p>
              <button
                onClick={() => setActiveTab('search')}
                className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-bold hover:bg-cyan-500/30 transition-colors"
              >
                Find & Add Users
              </button>
            </div>
          ) : (
            connections.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-2xl glass-panel border border-slate-800/80 flex items-center justify-between gap-3 hover:border-cyan-500/30 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold uppercase shadow">
                      {c.connected_username[0]}
                    </div>
                    {c.connected_online_status && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-gray-200 truncate">@{c.connected_username}</h4>
                    {c.connected_full_name && (
                      <p className="text-[11px] text-gray-400 truncate">{c.connected_full_name}</p>
                    )}
                    <span className="text-[10px] text-emerald-400 font-mono">Connected</span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenChatWith(c.connected_user_id)}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Chat
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Find Users */}
      {activeTab === 'search' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl glass-panel border border-slate-800/80">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search by unique username (e.g. alice_sec)..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {isSearching ? (
              <div className="col-span-full text-center py-10 text-xs text-gray-500 font-mono">Searching users...</div>
            ) : searchResults.length === 0 ? (
              searchQuery.trim() ? (
                <div className="col-span-full text-center py-12 text-xs text-gray-500">
                  No users found matching "{searchQuery}".
                </div>
              ) : (
                <div className="col-span-full text-center py-12 text-xs text-gray-500">
                  Type a username above to search the platform.
                </div>
              )
            ) : (
              searchResults.map((u) => {
                const isConnected = u.connection_status === 'connected';
                const isPendingSent = u.connection_status === 'pending_sent';
                const isPendingReceived = u.connection_status === 'pending_received';

                return (
                  <div
                    key={u.id}
                    className="p-4 rounded-2xl glass-panel border border-slate-800/80 flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold uppercase shadow">
                        {u.username[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-xs text-gray-200 truncate">@{u.username}</h4>
                          <span className={`badge text-[9px] py-0 px-1.5 ${
                            u.plan_type === 'premium' ? 'badge-cyan' : 'bg-slate-800 text-gray-400'
                          }`}>
                            {u.plan_type.toUpperCase()}
                          </span>
                        </div>
                        {u.full_name && (
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">{u.full_name}</p>
                        )}
                        {u.bio && (
                          <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{u.bio}</p>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 font-mono">
                        Joined {new Date(u.created_at).toLocaleDateString()}
                      </span>
                      {isConnected ? (
                        <button
                          onClick={() => handleOpenChatWith(u.id)}
                          className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 text-xs font-bold flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          Chat
                        </button>
                      ) : isPendingSent ? (
                        <span className="text-[11px] text-amber-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Request Sent
                        </span>
                      ) : isPendingReceived ? (
                        <button
                          onClick={() => setActiveTab('incoming')}
                          className="px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 text-xs font-bold"
                        >
                          Respond
                        </button>
                      ) : (
                        <button
                          onClick={() => setRequestTargetUser(u)}
                          className="px-3 py-1 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-bold shadow-md hover:opacity-90 transition-opacity flex items-center gap-1"
                        >
                          <UserPlus className="w-3 h-3" />
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Incoming Requests */}
      {activeTab === 'incoming' && (
        <div className="space-y-3">
          {incomingReqs.length === 0 ? (
            <div className="text-center py-16 rounded-2xl glass-panel border border-slate-800/80 p-8 text-xs text-gray-500">
              <UserCheck className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              No pending communication requests.
            </div>
          ) : (
            incomingReqs.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-2xl glass-panel border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <h4 className="font-bold text-xs text-gray-200">
                    @{req.sender_username}{' '}
                    {req.sender_full_name && <span className="text-gray-400 font-normal">({req.sender_full_name})</span>}
                  </h4>
                  {req.note && (
                    <p className="text-xs text-cyan-300/90 mt-1 italic font-mono bg-cyan-500/5 px-2.5 py-1 rounded-lg border border-cyan-500/10 inline-block">
                      "{req.note}"
                    </p>
                  )}
                  <span className="block text-[10px] text-gray-500 font-mono mt-1">
                    Received {new Date(req.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRespond(req.id, 'accept')}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow"
                  >
                    <Check className="w-3.5 h-3.5" /> Accept
                  </button>
                  <button
                    onClick={() => handleRespond(req.id, 'reject')}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-300 text-xs font-semibold"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                  <button
                    onClick={() => handleRespond(req.id, 'block')}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold"
                    title="Block User"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Send Request Modal */}
      {requestTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl glass-panel border border-slate-800 p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-gray-100 font-heading">
              Connect with @{requestTargetUser.username}
            </h3>
            <p className="text-xs text-gray-400">
              Users must accept your communication request before private messaging and file transfers become available.
            </p>

            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase font-mono block mb-1">
                Optional Note
              </label>
              <textarea
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder="Hi, let's collaborate on SecureCloud..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 resize-none font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRequestTargetUser(null)}
                className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSendRequest}
                disabled={sendingRequest}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold text-xs shadow-md disabled:opacity-50"
              >
                {sendingRequest ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
