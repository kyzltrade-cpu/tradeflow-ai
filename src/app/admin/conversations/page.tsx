'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { createClient } from '@supabase/supabase-js';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';

const supabaseRealtime = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'human';
  content: string;
  created_at: string;
}

type ConversationStatus = 'ai' | 'human' | 'flagged';

interface Conversation {
  id: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  channel: string;
  status: string;
  detected_language: string | null;
  handoff_summary: string | null;
  updated_at: string;
  last_message: { content: string; role: string; created_at: string } | null;
  message_count: number;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatMessageTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function SkeletonConvRow() {
  return (
    <div className="w-full text-left px-4 py-3 border-b animate-pulse" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="h-3 w-24 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-3 w-12 rounded" style={{ background: 'var(--border)' }} />
      </div>
      <div className="h-3 w-40 rounded" style={{ background: 'var(--border)' }} />
    </div>
  );
}

function SkeletonMessage() {
  return (
    <div className="flex justify-start animate-pulse">
      <div className="max-w-[65%] rounded-[4px] px-4 py-3 space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="h-3 w-16 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-3 w-48 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-3 w-32 rounded" style={{ background: 'var(--border)' }} />
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  const { t } = useLang();
  const { companyId, loading: companyLoading } = useCompany();
  const { showToast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [filter, setFilter] = useState<'all' | ConversationStatus>('all');
  const [showChat, setShowChat] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSummaries, setExpandedSummaries] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabaseRealtime.channel> | null>(null);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (companyLoading || !companyId) return;
    try {
      setLoadingConvs(true);
      setError(null);
      const res = await authFetch(`/api/admin/conversations?company_id=${companyId}`);
      if (!res.ok) throw new Error('Failed to load conversations');
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('[conversations] fetch error:', err);
      setError(t('Failed to load conversations. Please try again.', '載入對話失敗，請重試。'));
      setConversations([]);
    } finally {
      setLoadingConvs(false);
    }
  }, [companyId, companyLoading, t]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Polling fallback — refetch conversations every 10 seconds
  useEffect(() => {
    if (companyLoading || !companyId) return;
    const interval = setInterval(() => {
      fetchConversations();
    }, 10000);
    return () => clearInterval(interval);
  }, [companyId, companyLoading, fetchConversations]);

  // Fetch messages when a conversation is selected
  useEffect(() => {
    if (!selected) return;

    const fetchMessages = async () => {
      try {
        setLoadingMessages(true);
        const res = await authFetch(`/api/admin/conversations/${selected.id}/messages`);
        if (!res.ok) throw new Error('Failed to load messages');
        const data = await res.json();
        setMessages(data.messages || []);
      } catch (err) {
        console.error('[conversations] messages fetch error:', err);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selected]);

  // Subscribe to real-time messages for the selected conversation
  useEffect(() => {
    if (!selected) return;

    // Clean up previous subscription
    if (realtimeChannelRef.current) {
      supabaseRealtime.removeChannel(realtimeChannelRef.current);
    }

    const channel = supabaseRealtime
      .channel(`messages-${selected.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selected.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Deduplicate by id
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      supabaseRealtime.removeChannel(channel);
    };
  }, [selected]);

  // Cleanup all subscriptions on unmount
  useEffect(() => {
    return () => {
      if (realtimeChannelRef.current) {
        supabaseRealtime.removeChannel(realtimeChannelRef.current);
      }
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const contactName = (conv: Conversation) =>
    conv.contact_name || conv.contact_phone || conv.contact_email || 'Unknown';

  const displayStatus = (conv: Conversation): 'ai' | 'human' | 'flagged' | 'ai_paused' => {
    if (conv.status === 'bookmarked') return 'flagged';
    if (conv.status === 'human') return 'human';
    if (conv.status === 'ai_paused') return 'ai_paused';
    return 'ai';
  };

  const handleBookmark = async (convId: string) => {
    const conv = conversations.find((c) => c.id === convId);
    if (!conv) return;
    const newStatus = conv.status === 'bookmarked' ? 'active' : 'bookmarked';

    // Optimistic update
    setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, status: newStatus } : c));
    if (selected?.id === convId) setSelected((prev) => prev ? { ...prev, status: newStatus } : prev);

    try {
      await authFetch('/api/admin/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: convId, status: newStatus }),
      });
    } catch (err) {
      console.error('[conversations] bookmark error:', err);
      // Revert on failure
      setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, status: conv.status } : c));
      if (selected?.id === convId) setSelected((prev) => prev ? { ...prev, status: conv.status } : prev);
      showToast(t('Failed to update bookmark', '更新書籤失敗'), 'error');
    }
  };

  const handleTakeover = async (convId: string) => {
    // Optimistic update
    setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, status: 'human' } : c));
    if (selected?.id === convId) setSelected((prev) => prev ? { ...prev, status: 'human' } : prev);

    try {
      await authFetch('/api/admin/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: convId, status: 'human' }),
      });
    } catch (err) {
      console.error('[conversations] takeover error:', err);
      setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, status: 'active' } : c));
      if (selected?.id === convId) setSelected((prev) => prev ? { ...prev, status: 'active' } : prev);
      showToast(t('Failed to take over conversation', '接管對話失敗'), 'error');
    }
  };

  const handleReleaseToAI = async (convId: string) => {
    // Optimistic update
    setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, status: 'active' } : c));
    if (selected?.id === convId) setSelected((prev) => prev ? { ...prev, status: 'active' } : prev);

    try {
      await authFetch('/api/admin/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: convId, status: 'active' }),
      });
    } catch (err) {
      console.error('[conversations] release error:', err);
      setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, status: 'human' } : c));
      if (selected?.id === convId) setSelected((prev) => prev ? { ...prev, status: 'human' } : prev);
      showToast(t('Failed to release to AI', '交還 AI 失敗'), 'error');
    }
  };

  const handlePauseAI = async (convId: string) => {
    const conv = conversations.find((c) => c.id === convId);
    if (!conv) return;
    const newStatus = conv.status === 'ai_paused' ? 'active' : 'ai_paused';

    // Optimistic update
    setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, status: newStatus } : c));
    if (selected?.id === convId) setSelected((prev) => prev ? { ...prev, status: newStatus } : prev);

    try {
      await authFetch('/api/admin/conversations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: convId, status: newStatus }),
      });
    } catch (err) {
      console.error('[conversations] pause AI error:', err);
      setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, status: conv.status } : c));
      if (selected?.id === convId) setSelected((prev) => prev ? { ...prev, status: conv.status } : prev);
      showToast(t('Failed to update AI status', '更新 AI 狀態失敗'), 'error');
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selected || selected.status !== 'human') return;

    const content = inputValue.trim();
    setInputValue('');
    setSending(true);

    try {
      const res = await authFetch(`/api/admin/conversations/${selected.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'human', content }),
      });

      if (!res.ok) throw new Error('Failed to send message');

      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);

      // Update conversation list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selected.id
            ? { ...c, last_message: { content, role: 'human', created_at: new Date().toISOString() }, updated_at: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      console.error('[conversations] send message error:', err);
      setInputValue(content);
      showToast(t('Failed to send message', '發送訊息失敗'), 'error');
    } finally {
      setSending(false);
    }
  };

  const filtered = filter === 'all' ? conversations : conversations.filter((c) => {
    if (filter === 'flagged') return c.status === 'bookmarked';
    return c.status === filter;
  });
  const bookmarkedCount = conversations.filter((c) => c.status === 'bookmarked').length;

  const selectConversation = (conv: Conversation) => {
    setSelected(conv);
    setShowChat(true);
  };

  const toggleSummary = (convId: string) => {
    setExpandedSummaries((prev) => {
      const next = new Set(prev);
      if (next.has(convId)) {
        next.delete(convId);
      } else {
        next.add(convId);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-112px)]">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-[-0.5px]">{t('Conversations', '對話')}</h1>
          <p className="text-[13px] md:text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('Customer inquiries handled by your AI assistant', 'AI 助手處理的客戶查詢')}
          </p>
        </div>
      </div>

      <div className="flex flex-1 border rounded-[4px] overflow-hidden min-h-0" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>

        {/* Sidebar / Conversation list */}
        <div className={`${showChat ? 'hidden md:flex' : 'flex'} w-full md:w-[320px] md:flex-shrink-0 flex-col border-r`} style={{ borderColor: 'var(--border)' }}>

          {/* Filter tabs */}
          <div className="flex gap-1 px-3 pt-3 pb-2 flex-shrink-0 overflow-x-auto">
            {([
              { key: 'all', en: 'All', zh: '全部' },
              { key: 'flagged', en: `Bookmarked (${bookmarkedCount})`, zh: `已加書籤 (${bookmarkedCount})` },
              { key: 'human', en: 'Human', zh: '人手' },
              { key: 'ai', en: 'AI', zh: 'AI' },
            ] as const).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="text-[11px] md:text-[12px] px-2.5 py-1 rounded-[4px] font-medium whitespace-nowrap"
                style={{
                  background: filter === f.key ? 'var(--accent)' : 'transparent',
                  color: filter === f.key ? 'white' : 'var(--text-muted)',
                }}
              >
                {t(f.en, f.zh)}
              </button>
            ))}
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <>
                <SkeletonConvRow />
                <SkeletonConvRow />
                <SkeletonConvRow />
                <SkeletonConvRow />
                <SkeletonConvRow />
              </>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <svg className="mx-auto mb-3" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-[13px] md:text-[14px] font-medium mb-1">
                  {error || t('No conversations yet', '暫無對話')}
                </p>
                <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  {t('Customers will appear here when they message you', '客戶發送訊息後會顯示在這裡')}
                </p>
              </div>
            ) : (
              filtered.map((conv) => {
                const s = displayStatus(conv);
                const isFlagged = s === 'flagged';
                const isHuman = s === 'human';
                const isExpanded = expandedSummaries.has(conv.id);
                return (
                  <div key={conv.id}>
                    <button
                      onClick={() => selectConversation(conv)}
                      className="w-full text-left px-4 py-3 border-b text-[13px] md:text-[14px] relative"
                      style={{
                        borderColor: 'var(--border)',
                        background: selected?.id === conv.id ? 'var(--accent-light)' : 'transparent',
                      }}
                    >
                      {isFlagged && (
                        <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: 'var(--error)' }} />
                      )}
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate">{contactName(conv)}</span>
                        <span className="text-[10px] md:text-[11px] flex-shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>{formatTimeAgo(conv.updated_at)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isHuman && (
                          <span className="text-[9px] md:text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0" style={{ background: '#E8F5F1', color: '#038153' }}>
                            HUMAN
                          </span>
                        )}
                        {!isHuman && !isFlagged && (
                          <span className="text-[9px] md:text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                            AI
                          </span>
                        )}
                        {conv.detected_language && (
                          <span className="text-[9px] md:text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                            {conv.detected_language === 'zh' ? '中文' : 'EN'}
                          </span>
                        )}
                        <span className="text-[11px] md:text-[12px] truncate" style={{ color: 'var(--text-muted)' }}>{conv.last_message?.content || '—'}</span>
                      </div>
                    </button>
                    {/* Handoff summary dropdown */}
                    {conv.handoff_summary && (isHuman || isFlagged) && (
                      <div className="border-b" style={{ borderColor: 'var(--border)' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSummary(conv.id); }}
                          className="w-full text-left px-4 py-2 flex items-center gap-2 text-[11px] md:text-[12px]"
                          style={{ color: 'var(--text-muted)', background: 'var(--bg)' }}
                        >
                          <svg
                            width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
                          >
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                          <span className="font-medium">{t('Handoff Summary', '交接摘要')}</span>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-3 text-[12px] md:text-[13px] leading-[1.5]" style={{ color: 'var(--text)' }}>
                            <p className="whitespace-pre-wrap">{conv.handoff_summary}</p>
                            {conv.last_message && (
                              <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                {t('Last message:', '最後訊息:')} {conv.last_message.content}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className={`${showChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>

          {/* Chat header */}
          <div className="px-3 md:px-5 py-3 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <button
                onClick={() => setShowChat(false)}
                className="md:hidden p-1 -ml-1 rounded hover:bg-black/5"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              {selected && (
                <>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium text-white flex-shrink-0"
                    style={{ background: displayStatus(selected) === 'flagged' ? 'var(--error)' : displayStatus(selected) === 'human' ? '#038153' : 'var(--accent)' }}
                  >
                    {contactName(selected).charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] md:text-[14px] font-medium truncate">{contactName(selected)}</p>
                    <p className="text-[11px] md:text-[12px]" style={{ color: 'var(--text-muted)' }}>{selected.channel}</p>
                  </div>
                </>
              )}
            </div>
            {selected && (
              <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                {displayStatus(selected) === 'ai' && (
                  <>
                    <button
                      onClick={() => handlePauseAI(selected.id)}
                      className="text-[11px] md:text-[12px] font-medium px-2 md:px-3 py-1.5 rounded-[4px] border flex items-center gap-1.5"
                      style={{ borderColor: '#F59E0B', color: '#F59E0B' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                      </svg>
                      <span className="hidden sm:inline">{t('Stop AI', '暫停 AI')}</span>
                    </button>
                    <button
                      onClick={() => handleBookmark(selected.id)}
                      className="text-[11px] md:text-[12px] font-medium px-2 md:px-3 py-1.5 rounded-[4px] border flex items-center gap-1.5"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                      </svg>
                      <span className="hidden sm:inline">{t('Bookmark', '加書籤')}</span>
                    </button>
                    <button
                      onClick={() => handleTakeover(selected.id)}
                      className="text-[11px] md:text-[12px] font-medium px-2 md:px-3 py-1.5 rounded-[4px] text-white"
                      style={{ background: '#038153' }}
                    >
                      {t('Take over', '接管')}
                    </button>
                  </>
                )}
                {displayStatus(selected) === 'ai_paused' && (
                  <>
                    <button
                      onClick={() => handlePauseAI(selected.id)}
                      className="text-[11px] md:text-[12px] font-medium px-2 md:px-3 py-1.5 rounded-[4px] flex items-center gap-1.5"
                      style={{ background: '#FEF3C7', color: '#D97706' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"/>
                      </svg>
                      <span className="hidden sm:inline">{t('Resume AI', '恢復 AI')}</span>
                    </button>
                    <button
                      onClick={() => handleBookmark(selected.id)}
                      className="text-[11px] md:text-[12px] font-medium px-2 md:px-3 py-1.5 rounded-[4px] border flex items-center gap-1.5"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                      </svg>
                      <span className="hidden sm:inline">{t('Bookmark', '加書籤')}</span>
                    </button>
                    <button
                      onClick={() => handleTakeover(selected.id)}
                      className="text-[11px] md:text-[12px] font-medium px-2 md:px-3 py-1.5 rounded-[4px] text-white"
                      style={{ background: '#038153' }}
                    >
                      {t('Take over', '接管')}
                    </button>
                  </>
                )}
                {displayStatus(selected) === 'human' && (
                  <button
                    onClick={() => handleReleaseToAI(selected.id)}
                    className="text-[11px] md:text-[12px] font-medium px-2 md:px-3 py-1.5 rounded-[4px] border"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    {t('Release to AI', '交還 AI')}
                  </button>
                )}
                {displayStatus(selected) === 'flagged' && (
                  <>
                    <button
                      onClick={() => handleBookmark(selected.id)}
                      className="text-[11px] md:text-[12px] font-medium px-2 md:px-3 py-1.5 rounded-[4px] flex items-center gap-1.5"
                      style={{ background: '#FEE8EA', color: 'var(--error)' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--error)" stroke="var(--error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                      </svg>
                      <span className="hidden sm:inline">{t('Bookmarked', '已加書籤')}</span>
                    </button>
                    <button
                      onClick={() => handleTakeover(selected.id)}
                      className="text-[11px] md:text-[12px] font-medium px-2 md:px-3 py-1.5 rounded-[4px] text-white"
                      style={{ background: '#038153' }}
                    >
                      {t('Take over', '接管')}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-3" style={{ background: 'var(--bg)' }}>
            {/* Handoff summary banner */}
            {selected?.handoff_summary && (
              <div className="rounded-[4px] px-4 py-3 border" style={{ background: '#FEF3C7', borderColor: '#FDE68A' }}>
                <div className="flex items-start gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <div>
                    <p className="text-[11px] md:text-[12px] font-semibold mb-1" style={{ color: '#92400E' }}>
                      {t('AI Handoff Summary', 'AI 交接摘要')}
                    </p>
                    <p className="text-[12px] md:text-[13px] whitespace-pre-wrap" style={{ color: '#78350F' }}>
                      {selected.handoff_summary}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {!selected ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
                  {t('Select a conversation to start', '選擇一個對話')}
                </p>
              </div>
            ) : loadingMessages ? (
              <div className="space-y-3">
                <SkeletonMessage />
                <SkeletonMessage />
                <SkeletonMessage />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <svg className="mx-auto mb-2" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                  <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
                    {t('No messages yet — customer messages will appear here', '暫無訊息——客戶訊息會顯示在這裡')}
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id || msg.created_at} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[85%] md:max-w-[65%] rounded-[4px] px-3 md:px-4 py-2.5 md:py-3 text-[13px] md:text-[14px] leading-[1.5]"
                    style={{
                      background: msg.role === 'user'
                        ? 'var(--accent-light)'
                        : msg.role === 'human' ? '#E8F5F1' : 'var(--surface)',
                      border: `1px solid ${
                        msg.role === 'human' ? '#038153'
                        : msg.role === 'assistant' ? 'var(--border)'
                        : 'transparent'
                      }`,
                    }}
                  >
                    {msg.role === 'human' && (
                      <p className="text-[10px] md:text-[11px] font-medium mb-1" style={{ color: '#038153' }}>{t('You (human)', '您（人手）')}</p>
                    )}
                    {msg.role === 'assistant' && (
                      <p className="text-[10px] md:text-[11px] font-medium mb-1" style={{ color: 'var(--accent)' }}>{t('AI', 'AI')}</p>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-[10px] md:text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>{formatMessageTime(msg.created_at)}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* AI disclosure - only visible to admin */}
          <div className="px-3 md:px-5 py-2 text-center flex-shrink-0 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-[11px] md:text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {t('AI drafts replies & quotes — you review before anything is sent', 'AI 起草回覆和報價——發送前須由你審批')}
            </p>
          </div>

          {/* Input area */}
          <div className="px-3 md:px-5 py-3 md:py-4 border-t flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
            {selected && displayStatus(selected) === 'human' ? (
              <div>
                <div className="flex gap-2 mb-2">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={t('Type your reply...', '輸入回覆...')}
                    rows={2}
                    className="flex-1 border rounded-[4px] px-3 py-2.5 text-[16px] focus:outline-none resize-none"
                    style={{ borderColor: 'var(--border)' }}
                    disabled={sending}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || !inputValue.trim()}
                    className="text-[12px] md:text-[13px] font-medium px-4 md:px-5 rounded-[4px] text-white self-end disabled:opacity-50"
                    style={{ background: '#038153' }}
                  >
                    {sending ? t('Sending...', '發送中...') : t('Send', '發送')}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] md:text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {t("You're replying as a human.", '您正在以人手身份回覆。')}
                  </p>
                  <button
                    onClick={() => handleReleaseToAI(selected.id)}
                    className="text-[11px] md:text-[12px] font-medium px-3 py-1.5 rounded-[4px] border shrink-0"
                    style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    {t('Release to AI', '交還 AI')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 py-2.5 px-3 rounded-[4px]" style={{ background: 'var(--bg)' }}>
                <span className="text-[12px] md:text-[13px]" style={{ color: 'var(--text-muted)' }}>
                  {!selected
                    ? ''
                    : displayStatus(selected) === 'ai'
                      ? t('AI is handling this conversation', 'AI 正在處理此對話')
                      : displayStatus(selected) === 'ai_paused'
                        ? t('AI is paused — new messages will not get AI replies', 'AI 已暫停——新訊息不會收到 AI 回覆')
                        : t('Conversation bookmarked — take over to reply', '對話已加書籤——接管後可回覆')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
