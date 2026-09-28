'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mail, Search, Clock, RefreshCw, Star, Plus, Archive, Trash2, Inbox,
  Inbox as InboxIcon, Check, Send,
} from 'lucide-react';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';

interface InboxRow {
  id: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  subject: string | null;
  folder: string;
  read_at: string | null;
  flagged: boolean;
  channel: string;
  status: string;
  detected_language: string | null;
  handoff_summary: string | null;
  external_search_enabled: boolean;
  updated_at: string;
  last_message: { content: string; role: string; created_at: string } | null;
  message_count: number;
  needs_reply: boolean;
  waiting_on_customer: boolean;
  unread: boolean;
}

interface InboxCounts {
  inbox: number;
  unread: number;
  needs_reply: number;
  waiting: number;
  bookmarked: number;
  flagged: number;
  human: number;
  ai: number;
  archive: number;
  trash: number;
  total: number;
}

type Folder = 'inbox' | 'archive' | 'trash';
type View = 'all' | 'needs_reply' | 'waiting' | 'bookmarked' | 'flagged' | 'human' | 'ai';

const EMPTY_COUNTS: InboxCounts = {
  inbox: 0, unread: 0, needs_reply: 0, waiting: 0, bookmarked: 0,
  flagged: 0, human: 0, ai: 0, archive: 0, trash: 0, total: 0,
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b animate-pulse" style={{ borderColor: 'var(--border)' }}>
      <div className="w-4" />
      <div className="w-9 h-9 rounded-full flex-shrink-0" style={{ background: 'var(--border)' }} />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-40 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-3 w-72 rounded" style={{ background: 'var(--border)' }} />
      </div>
      <div className="h-3 w-10 rounded" style={{ background: 'var(--border)' }} />
    </div>
  );
}

export default function AdminInboxPage() {
  const { t } = useLang();
  const { companyId, loading: companyLoading } = useCompany();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<InboxRow[]>([]);
  const [counts, setCounts] = useState<InboxCounts>(EMPTY_COUNTS);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCompose, setShowCompose] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const folderParam = searchParams.get('folder');
  const folder: Folder = folderParam === 'archive' ? 'archive' : folderParam === 'trash' ? 'trash' : 'inbox';
  const viewParam = searchParams.get('view');
  const view: View =
    viewParam === 'needs_reply' || viewParam === 'waiting' || viewParam === 'bookmarked' ||
    viewParam === 'flagged' || viewParam === 'human' || viewParam === 'ai'
      ? viewParam
      : 'all';
  const qParam = searchParams.get('q') || '';

  // Debounced server-side search: type ahead updates the ?q= param.
  useEffect(() => {
    const id = setTimeout(() => {
      if (search === qParam) return;
      const params = new URLSearchParams();
      if (folder !== 'inbox') params.set('folder', folder);
      if (view !== 'all') params.set('view', view);
      if (search) params.set('q', search);
      router.replace(params.toString() ? `/admin?${params.toString()}` : '/admin');
    }, 350);
    return () => clearTimeout(id);
  }, [search, qParam, searchParams, router, folder, view]);

  const selectNav = (f: Folder, v: View) => {
    const params = new URLSearchParams();
    if (f !== 'inbox') params.set('folder', f);
    if (v !== 'all') params.set('view', v);
    if (qParam) params.set('q', qParam);
    router.replace(params.toString() ? `/admin?${params.toString()}` : '/admin', { scroll: false });
  };

  const fetchInbox = useCallback(async (opts?: { silent?: boolean }) => {
    if (companyLoading || !companyId) return;
    try {
      if (!opts?.silent) {
        setLoading(true);
        setError(null);
      }
      const params = new URLSearchParams();
      if (folder !== 'inbox') params.set('folder', folder);
      if (view !== 'all') params.set('filter', view);
      if (qParam) params.set('q', qParam);
      const res = await authFetch(`/api/admin/inbox?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load inbox');
      const data = await res.json();
      setRows(data.conversations || []);
      setCounts(data.counts || EMPTY_COUNTS);
    } catch (err) {
      if (opts?.silent) return;
      console.error('[inbox] fetch error:', err);
      setError(t('Failed to load inbox. Please try again.', '載入收件匣失敗，請重試。'));
      setRows([]);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [companyId, companyLoading, folder, view, qParam, t]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  useEffect(() => {
    if (companyLoading || !companyId) return;
    const interval = setInterval(() => fetchInbox({ silent: true }), 15000);
    return () => clearInterval(interval);
  }, [companyId, companyLoading, fetchInbox]);

  const bulk = useCallback(async (action: string, ids: string[]) => {
    if (!ids.length) return;
    try {
      const res = await authFetch('/api/admin/inbox/bulk', {
        method: 'POST',
        body: JSON.stringify({ ids, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk action failed');
      if (action === 'delete') {
        setRows((r) => r.filter((x) => !ids.includes(x.id)));
        setSelected((s) => new Set([...s].filter((id) => !ids.includes(id))));
      } else {
        fetchInbox({ silent: true });
      }
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'error');
      return false;
    }
  }, [fetchInbox, showToast]);

  const toggleStar = async (row: InboxRow) => {
    try {
      const res = await authFetch(`/api/admin/inbox/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ flagged: !row.flagged }),
      });
      if (!res.ok) throw new Error('Failed to update flag');
      setRows((r) => r.map((x) => (x.id === row.id ? { ...x, flagged: !row.flagged } : x)));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update flag', 'error');
    }
  };

  const contactLabel = (r: InboxRow) =>
    r.contact_name || r.contact_email || r.contact_phone || 'Unknown';

  const contactSub = (r: InboxRow) => r.contact_email || r.contact_phone || '';

  const folderTabs: Array<{ key: Folder; en: string; zh: string; n?: number; icon: typeof Inbox }> = [
    { key: 'inbox', en: 'Inbox', zh: '收件匣', icon: Inbox },
    { key: 'archive', en: 'Archive', zh: '封存', icon: Archive },
    { key: 'trash', en: 'Trash', zh: '垃圾桶', icon: Trash2 },
  ];

  const viewTabs: Array<{ key: View; en: string; zh: string; n?: number }> = [
    { key: 'all', en: 'All', zh: '全部', n: counts.inbox },
    { key: 'needs_reply', en: 'Waiting on you', zh: '需要你回覆', n: counts.needs_reply },
    { key: 'waiting', en: 'Waiting on them', zh: '等客戶回覆', n: counts.waiting },
    { key: 'flagged', en: 'Starred', zh: '已加星號', n: counts.flagged },
    { key: 'human', en: 'Human', zh: '人手', n: counts.human },
    { key: 'ai', en: 'AI', zh: 'AI', n: counts.ai },
  ];

  const allSelected = visibleRows().length > 0 && selected.size === visibleRows().length;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(visibleRows().map((r) => r.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  function visibleRows(): InboxRow[] {
    return rows;
  }

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--bg)' }}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-2 border-b px-3 py-2 flex-shrink-0 md:px-5"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <button
          onClick={() => setShowCompose(true)}
          className="flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 whitespace-nowrap"
          style={{ background: 'var(--accent)' }}
        >
          <Plus width="14" height="14" />
          {t('Compose', '撰寫')}
        </button>

        <div className="mx-1 hidden md:flex items-center gap-1 overflow-x-auto py-0.5 ml-4">
          {folderTabs.map((f) => (
            <button
              key={f.key}
              onClick={() => selectNav(f.key, view)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors"
              style={{
                background: folder === f.key ? 'var(--accent)' : 'transparent',
                color: folder === f.key ? 'white' : 'var(--text-muted)',
              }}
            >
              <f.icon width="12" height="12" />
              {t(f.en, f.zh)}
              {f.n !== undefined && f.n > 0 && (
                <span className="tabular-nums">{f.n > 99 ? '99+' : f.n}</span>
              )}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {counts.unread > 0 && folder === 'inbox' && (
            <span className="hidden md:inline text-[11px] font-medium tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {t('{{count}} unread', '{{count}} 封未讀').replace('{{count}}', String(counts.unread))}
            </span>
          )}
          <button
            onClick={() => fetchInbox()}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-black/[0.05]"
            title={t('Refresh', '重新整理')}
            style={{ color: 'var(--text-muted)' }}
          >
            <RefreshCw width="15" height="15" />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" width="15" height="15" style={{ color: 'var(--text-muted)' }} />
            <input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Search mail…', '搜尋郵件…')}
              className="border rounded-[10px] pl-8.5 pr-3 py-2 text-[13px] focus:outline-none w-44 md:w-60 transition-[width]"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
            />
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div
          className="flex items-center gap-1 px-3 md:px-5 py-1.5 border-b text-[12px] font-medium flex-shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--accent-light)' }}
        >
          <span className="mr-2" style={{ color: 'var(--text)' }}>
            {selected.size} {t('selected', '已選')}
          </span>
          {folder !== 'trash' && (
            <button onClick={() => { bulk('archive', [...selected]); }} className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-black/[0.05]" style={{ color: 'var(--text)' }}>
              <Archive width="13" height="13" /> {t('Archive', '封存')}
            </button>
          )}
          {folder === 'trash' ? (
            <>
              <button onClick={() => { bulk('restore', [...selected]); }} className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-black/[0.05]" style={{ color: 'var(--text)' }}>
                <InboxIcon width="13" height="13" /> {t('Restore', '還原')}
              </button>
              <button onClick={() => { bulk('delete', [...selected]); }} className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-black/[0.05]" style={{ color: 'var(--error)' }}>
                <Trash2 width="13" height="13" /> {t('Delete', '刪除')}
              </button>
            </>
          ) : (
            <button onClick={() => { bulk('trash', [...selected]); }} className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-black/[0.05]" style={{ color: 'var(--text)' }}>
              <Trash2 width="13" height="13" /> {t('Trash', '垃圾桶')}
            </button>
          )}
          <button onClick={() => { bulk('flag', [...selected]); }} className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-black/[0.05]" style={{ color: 'var(--text)' }}>
            <Star width="13" height="13" /> {t('Star', '加星')}
          </button>
          <button onClick={() => { bulk('read', [...selected]); }} className="px-2 py-1 rounded-md hover:bg-black/[0.05]" style={{ color: 'var(--text)' }}>
            {t('Read', '標為已讀')}
          </button>
          <button onClick={() => { bulk('unread', [...selected]); }} className="px-2 py-1 rounded-md hover:bg-black/[0.05]" style={{ color: 'var(--text)' }}>
            {t('Unread', '標為未讀')}
          </button>
        </div>
      )}

      {/* View tabs (desktop, second row) */}
      <div
        className="hidden md:flex items-center gap-1 border-b px-5 py-1.5 flex-shrink-0 overflow-x-auto"
        style={{ borderColor: 'var(--border)', background: '#FBFBFB' }}
      >
        {viewTabs.map((f) => (
          <button
            key={f.key}
            onClick={() => selectNav(folder, f.key)}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors"
            style={{
              background: view === f.key ? 'var(--accent)' : 'transparent',
              color: view === f.key ? 'white' : 'var(--text-muted)',
            }}
          >
            {t(f.en, f.zh)}
            {f.n !== undefined && f.n > 0 && (
              <span className="tabular-nums">{f.n > 99 ? '99+' : f.n}</span>
            )}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div
        className="hidden md:grid grid-cols-[minmax(24px,32px)_minmax(200px,260px)_1fr_160px] items-center gap-3 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.05em] border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: '#FBFBFB' }}
      >
        <div
          className="flex items-center justify-center w-4 h-4 rounded border cursor-pointer"
          onClick={toggleAll}
          style={{ borderColor: 'var(--border)', background: allSelected ? 'var(--accent)' : 'transparent' }}
        >
          {allSelected && <Check className="w-3 h-3 text-white" />}
        </div>
        <span>{t('Sender', '寄件人')}</span>
        <span>{t('Subject', '主旨')}</span>
        <span className="text-right">{t('Date', '日期')}</span>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <>
            <RowSkeleton /><RowSkeleton /><RowSkeleton /><RowSkeleton /><RowSkeleton />
          </>
        ) : visibleRows().length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Mail className="mx-auto mb-3" width="32" height="32" style={{ stroke: 'var(--text-muted)' }} />
            <p className="text-[14px] font-medium mb-1">
              {error || t('Nothing here', '這裡沒有內容')}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {t('Incoming mail will show here', '來信會顯示在這裡')}
            </p>
          </div>
        ) : (
          visibleRows().map((r) => {
            const isHuman = r.status === 'human';
            const paused = r.status === 'ai_paused';
            const unread = r.unread;
            const flagged = r.flagged;
            const isSelected = selected.has(r.id);
            return (
              <div
                key={r.id}
                className="group w-full text-left border-b transition-colors hover:bg-black/[0.02]"
                style={{ borderColor: 'var(--border)', background: unread && !isSelected ? '#FFFFFF' : undefined }}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(24px,32px)_minmax(200px,260px)_1fr_160px] items-center gap-1.5 md:gap-3 px-2.5 md:px-4 py-2.5 md:py-3">
                  {/* Checkbox */}
                  <div className="hidden md:flex items-center">
                    <div
                      className="flex items-center justify-center w-4 h-4 rounded border cursor-pointer"
                      onClick={() => toggleOne(r.id)}
                      style={{ borderColor: 'var(--border)', background: isSelected ? 'var(--accent)' : 'transparent' }}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>

                  {/* Sender */}
                  <div className="flex items-center gap-2 min-w-0 cursor-pointer" onClick={() => router.push(`/admin/inbox/${r.id}`)}>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium text-white flex-shrink-0"
                      style={{ background: isHuman ? '#038153' : 'var(--accent)' }}
                    >
                      {contactLabel(r).charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div
                        className="font-medium text-[13px] truncate flex items-center gap-1"
                        style={{ color: unread ? 'var(--text)' : 'var(--text-muted)' }}
                      >
                        {contactLabel(r)}
                        {unread && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />}
                      </div>
                      {contactSub(r) && (
                        <div className="text-[11px] truncate md:hidden" style={{ color: 'var(--text-muted)' }}>
                          {contactSub(r)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Subject + snippet */}
                  <div className="min-w-0 cursor-pointer" onClick={() => router.push(`/admin/inbox/${r.id}`)}>
                    <p
                      className="text-[12px] md:text-[13px] truncate"
                      style={{
                        color: unread ? 'var(--text)' : 'var(--text-muted)',
                        fontWeight: unread ? 600 : 400,
                      }}
                    >
                      {r.subject || (r.last_message?.content || '—')}
                    </p>
                    <p className="text-[11px] truncate hidden md:block" style={{ color: 'var(--text-muted)' }}>
                      {r.subject ? (r.last_message?.content || '') : ' '}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 md:hidden">
                      {r.needs_reply && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: '#FEF3C7', color: '#D97706' }}>
                          <Clock className="inline-block mr-0.5" width="10" height="10" style={{ stroke: '#D97706' }} />
                          {t('Waiting on you', '需要你回覆')}
                        </span>
                      )}
                      {r.external_search_enabled && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: '#E8F5F1', color: '#038153' }}>
                          {t('Ext. search', '外部搜尋')}
                        </span>
                      )}
                      {paused && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: '#FEF3C7', color: '#D97706' }}>
                          AI PAUSED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date + star */}
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleStar(r); }}
                      className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-black/[0.05] opacity-0 group-hover:opacity-100"
                      title={t('Star', '加星')}
                    >
                      <Star
                        width="14" height="14"
                        style={{
                          fill: flagged ? 'var(--error)' : 'transparent',
                          stroke: flagged ? 'var(--error)' : 'var(--text-muted)',
                        }}
                      />
                    </button>
                    <span
                      className="text-[11px] tabular-nums text-right hidden md:inline"
                      style={{ color: unread ? 'var(--text)' : 'var(--text-muted)', fontWeight: unread ? 600 : 400 }}
                    >
                      {formatTimeAgo(r.updated_at)}
                    </span>
                    {flagged && (
                      <Star className="w-3 h-3 md:hidden" style={{ fill: 'var(--error)', stroke: 'var(--error)' }} />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showCompose && <ComposeModal onClose={() => setShowCompose(false)} onSent={() => { setShowCompose(false); fetchInbox(); }} />}
    </div>
  );
}

function ComposeModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const { t } = useLang();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!email.trim() || !subject.trim() || !body.trim()) {
      showToast(t('Recipient, subject, and message are required', '請填寫收件人、主旨和內容'), 'error');
      return;
    }
    setSending(true);
    try {
      const res = await authFetch('/api/admin/inbox', {
        method: 'POST',
        body: JSON.stringify({ contact_email: email.trim(), subject: subject.trim(), body: body.trim(), contact_name: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      if (data.email && data.email.success === false) {
        showToast(t('Message saved but email not delivered (no mail configured)', '訊息已儲存，但郵件未寄出（尚未設定郵件）'), 'error');
      } else {
        showToast(t('Message sent', '訊息已寄出'), 'success');
      }
      onSent();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border shadow-xl mx-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text)' }}>
            {t('New message', '新訊息')}
          </h3>
          <button onClick={onClose} className="text-[20px] leading-none" style={{ color: 'var(--text-muted)' }}>×</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('Recipient email', '收件人電子郵件')}
            type="email"
            className="w-full border rounded-[10px] px-3 py-2 text-[13px] focus:outline-none"
            style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          />
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('Subject', '主旨')}
            className="w-full border rounded-[10px] px-3 py-2 text-[13px] focus:outline-none"
            style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('Message', '內容')}
            rows={6}
            className="w-full border rounded-[10px] px-3 py-2 text-[13px] focus:outline-none resize-none"
            style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          />
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="px-3 py-2 rounded-[10px] text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>
            {t('Cancel', '取消')}
          </button>
          <button
            onClick={send}
            disabled={sending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            <Send width="13" height="13" />
            {sending ? t('Sending…', '傳送中…') : t('Send', '傳送')}
          </button>
        </div>
      </div>
    </div>
  );
}