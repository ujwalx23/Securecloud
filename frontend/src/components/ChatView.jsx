import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  MessageSquare,
  Send,
  Paperclip,
  Trash2,
  Edit2,
  MoreVertical,
  CheckCheck,
  Check,
  Shield,
  Search,
  User as UserIcon,
  Smile,
  X,
  RefreshCw
} from 'lucide-react';

export const ChatView = ({ initialConversationId }) => {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(initialConversationId || null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editText, setEditText] = useState('');
  const [search, setSearch] = useState('');
  
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  const fetchConversations = async () => {
    try {
      setLoadingConvs(true);
      const res = await fetch('/api/chat/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (!activeConvId && data.length > 0) {
          setActiveConvId(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConvs(false);
    }
  };

  const fetchMessages = async (convId) => {
    if (!convId) return;
    try {
      setLoadingMsgs(true);
      const res = await fetch(`/api/chat/conversations/${convId}/messages?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        scrollToBottom();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMsgs(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [token]);

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
      setupWebSocket(activeConvId);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [activeConvId, token]);

  const setupWebSocket = (convId) => {
    if (socketRef.current) {
      socketRef.current.close();
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/chat/ws/${convId}?token=${token}`;
    
    try {
      const ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'new_message' && payload.message) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.message.id)) return prev;
              return [...prev, payload.message];
            });
            scrollToBottom();
          } else if (payload.type === 'message_edited') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === payload.message_id
                  ? { ...m, content: payload.content, is_edited: true, edited_at: payload.edited_at }
                  : m
              )
            );
          } else if (payload.type === 'message_deleted') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === payload.message_id
                  ? { ...m, is_deleted: true, content: '[Message deleted]' }
                  : m
              )
            );
          }
        } catch (e) {
          console.error(e);
        }
      };
      socketRef.current = ws;
    } catch (e) {
      console.error('WebSocket connection error:', e);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || !activeConvId) return;

    const content = inputText.trim();
    setInputText('');
    try {
      const res = await fetch(`/api/chat/conversations/${activeConvId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          conversation_id: activeConvId,
          content
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to send message');
      }
      const newMsg = await res.json();
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      scrollToBottom();
      fetchConversations();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleEditMessage = async (msgId) => {
    if (!editText.trim()) return;
    try {
      const res = await fetch(`/api/chat/messages/${msgId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: editText.trim() })
      });
      if (!res.ok) throw new Error('Failed to edit message');
      setEditingMsgId(null);
      setEditText('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      const res = await fetch(`/api/chat/messages/${msgId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete message');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const currentConv = conversations.find((c) => c.id === activeConvId);
  const otherParticipant = currentConv?.participants?.find((p) => p.user_id !== user?.id);

  const filteredConvs = conversations.filter((c) => {
    const other = c.participants?.find((p) => p.user_id !== user?.id);
    return (
      other?.username?.toLowerCase().includes(search.toLowerCase()) ||
      other?.full_name?.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-4 animate-in fade-in duration-300">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-0">
        {/* Left Conversations Sidebar */}
        <div className="md:col-span-4 flex flex-col rounded-2xl glass-panel border border-slate-800/80 p-3 min-h-0">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-sm text-gray-100 font-heading">Private Conversations</h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fetchConversations()}
                disabled={loadingConvs}
                title="Refresh conversations list"
                className="p-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-gray-400 hover:text-cyan-300 border border-slate-800 transition-all"
              >
                <RefreshCw className={`w-3 h-3 text-cyan-400 ${loadingConvs ? 'animate-spin' : ''}`} />
              </button>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <Shield className="w-3 h-3" /> E2E Channel
              </span>
            </div>
          </div>

          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {loadingConvs ? (
              <div className="text-center py-10 text-xs text-gray-500 font-mono">Loading chats...</div>
            ) : filteredConvs.length === 0 ? (
              <div className="text-center py-12 px-4 text-xs text-gray-500 space-y-2">
                <MessageSquare className="w-8 h-8 text-gray-600 mx-auto" />
                <p>No active conversations.</p>
                <p className="text-[11px] text-gray-600">Connect with users in the Contacts tab to start private chats.</p>
              </div>
            ) : (
              filteredConvs.map((conv) => {
                const isSelected = activeConvId === conv.id;
                const partner = conv.participants?.find((p) => p.user_id !== user?.id) || {};
                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={`w-full p-2.5 rounded-xl text-left transition-all border flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-500/40 text-gray-100 shadow-sm'
                        : 'bg-slate-900/40 border-slate-800/60 text-gray-400 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold uppercase">
                          {partner.username ? partner.username[0] : 'U'}
                        </div>
                        {partner.online_status && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-gray-200 truncate">
                          @{partner.username || 'Unknown'}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate font-mono">
                          {conv.last_message?.content || 'No messages yet'}
                        </div>
                      </div>
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-bold font-mono">
                        {conv.unread_count}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Message Thread */}
        <div className="md:col-span-8 flex flex-col rounded-2xl glass-panel border border-slate-800/80 min-h-0">
          {activeConvId && otherParticipant ? (
            <>
              {/* Thread Header */}
              <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold uppercase shadow">
                      {otherParticipant.username[0]}
                    </div>
                    {otherParticipant.online_status && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-gray-100 flex items-center gap-2">
                      @{otherParticipant.username}
                      {otherParticipant.full_name && (
                        <span className="text-xs text-gray-400 font-normal">({otherParticipant.full_name})</span>
                      )}
                    </h3>
                    <p className="text-[10px] text-emerald-400 font-mono">
                      {otherParticipant.online_status ? 'Active now' : 'Encrypted Connection'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => fetchMessages(activeConvId)}
                  disabled={loadingMsgs}
                  title="Refresh Message Thread"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-gray-300 hover:text-cyan-300 border border-slate-800 transition-all text-xs font-semibold shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loadingMsgs ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-0">
                {loadingMsgs ? (
                  <div className="text-center py-10 text-xs text-gray-500 font-mono">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-xs text-gray-500">
                    <Shield className="w-8 h-8 text-cyan-500/40 mx-auto mb-2" />
                    <p>Channel open. Send a message to start private communication.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === user?.id;
                    const isEditing = editingMsgId === msg.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl p-3 text-xs shadow-sm relative ${
                            isMe
                              ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-br-none'
                              : 'bg-slate-800/80 text-gray-200 border border-slate-700/60 rounded-bl-none'
                          }`}
                        >
                          {isEditing ? (
                            <div className="flex flex-col gap-2 min-w-[200px]">
                              <input
                                type="text"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="px-2 py-1 rounded bg-slate-900 text-white text-xs border border-cyan-500 focus:outline-none"
                              />
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setEditingMsgId(null)}
                                  className="px-2 py-0.5 rounded text-[10px] bg-slate-700 text-gray-200"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleEditMessage(msg.id)}
                                  className="px-2 py-0.5 rounded text-[10px] bg-cyan-400 text-slate-950 font-bold"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="break-words leading-relaxed">{msg.content}</p>
                              <div
                                className={`flex items-center justify-end gap-1 text-[9px] mt-1 font-mono ${
                                  isMe ? 'text-cyan-200' : 'text-gray-400'
                                }`}
                              >
                                {msg.is_edited && <span>(edited)</span>}
                                <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {isMe && <CheckCheck className="w-3 h-3 text-cyan-300" />}
                              </div>
                            </>
                          )}

                          {/* Action Menu for Sender */}
                          {isMe && !msg.is_deleted && !isEditing && (
                            <div className="absolute right-0 top-0 -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 flex items-center gap-1 shadow-lg">
                              <button
                                onClick={() => {
                                  setEditingMsgId(msg.id);
                                  setEditText(msg.content);
                                }}
                                className="p-1 hover:text-cyan-400 text-gray-400"
                                title="Edit"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="p-1 hover:text-rose-400 text-gray-400"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Form */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800/80 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a secure message..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white hover:opacity-90 transition-opacity disabled:opacity-40 shadow-md shadow-cyan-500/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-500 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-gray-300 text-sm">Select a Conversation</h3>
              <p className="text-xs max-w-sm">Choose an authorized contact from the sidebar to view private messages.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
