'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mail, Search, RefreshCw, Star, Plus, Archive, Trash2, Inbox,
  Inbox as InboxIcon, Check, Send, Sparkles, ChevronDown, ChevronUp, X,
  Pause, Play,
} from 'lucide-react';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';

interface ThreadView {
  state: 'needs_specs' | 'waiting_on_buyer' | 'ready_to_quote' | 'cold' | 'closed';
  label: string;
  missingCount: number;
  owedReply: boolean;
  needsYou: boolean;
  waitingOnBuyer: boolean;
  needsSpecs: boolean;
  readyToQuote: boolean;
  cold: boolean;
  paused: boolean;
  chaseCount: number;
  silentDays: number;
}

interface PendingDraft {
  id: string;
  subject: string | null;
  body: string | null;
  to_address: string | null;
  draft_status: string | null;
  created_at: string | null;
}

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
  product_summary: string | null;
  estimated_value: number | null;
  currency: string | null;
  missing_info: string[];
  opportunity_id: string | null;
  next_action: string | null;
  next_action_due: string | null;
  thread: ThreadView;
  pending_draft: PendingDraft | null;
}

interface InboxCounts {
  all: number;
  needs_specs: number;
  waiting_on_buyer: number;
  ready_to_quote: number;
  needs_you: number;
  owed_replies: number;
  unread: number;
  needs_reply: number;
  waiting: number;
  total: number;
}

type Folder = 'inbox' | 'archive' | 'trash';
type Filter = 'all' | 'needs_specs' | 'waiting_on_buyer' | 'ready_to_quote' | 'needs_you' | 'owed_replies';

const EMPTY_COUNTS: InboxCounts = {
  all: 0, needs_specs: 0, waiting_on_buyer: 0, ready_to_quote: 0,
  needs_you: 0, owed_replies: 0, unread: 0, needs_reply: 0, waiting: 0, total: 0,
};

const STATE_CHIP: Record<string, { bg: string; fg: string }> = {
  needs_specs: { bg: '#FEF3C7', fg: '#B45309' },
  waiting_on_buyer: { bg: '#EEF2F7', fg: '#4B5563' },
  ready_to_quote: { bg: '#E8F5F1', fg: '#038153' },
  cold: { bg: '#F3F4F6', fg: '#6B7280' },
  closed: { bg: '#F3F4F6', fg: '#9CA3AF' },
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
  const [seeding, setSeeding] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const folderParam = searchParams.get('folder');
  const folder: Folder = folderParam === 'archive' ? 'archive' : folderParam === 'trash' ? 'trash' : 'inbox';
  const filterParam = searchParams.get('filter');
  const filter: Filter =
    filterParam === 'needs_specs' || filterParam === 'waiting_on_buyer' ||
    filterParam === 'ready_to_quote' || filterParam === 'needs_you' || filterParam === 'owed_replies'
      ? filterParam
      : 'all';
  const qParam = searchParams.get('q') || '';

  // Debounced server-side search: type ahead updates the ?q= param.
  useEffect(() => {
    const id = setTimeout(() => {
      if (search === qParam) return;
      const params = new URLSearchParams();
      if (folder !== 'inbox') params.set('folder', folder);
      if (filter !== 'all') params.set('filter', filter);
      if (search) params.set('q', search);
      router.replace(params.toString() ? `/admin/inbox?${params.toString()}` : '/admin/inbox');
    }, 350);
    return () => clearTimeout(id);
  }, [search, qParam, searchParams, router, folder, filter]);

  const selectNav = (f: Folder, v: Filter) => {
    const params = new URLSearchParams();
    if (f !== 'inbox') params.set('folder', f);
    if (v !== 'all') params.set('filter', v);
    if (qParam) params.set('q', qParam);
    router.replace(params.toString() ? `/admin/inbox?${params.toString()}` : '/admin/inbox', { scroll: false });
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
      if (filter !== 'all') params.set('filter', filter);
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
  }, [companyId, companyLoading, folder, filter, qParam, t]);

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

  const loadDemoData = async () => {
    setSeeding(true);
    try {
      const res = await authFetch('/api/admin/demo-data', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load demo data');
      showToast(
        t('Demo data loaded', '示範資料已載入'),
        'success'
      );
      console.log('[demo-data] seeded', JSON.stringify(data));
      await fetchInbox();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load demo data', 'error');
    } finally {
      setSeeding(false);
    }
  };

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

  const filterTabs: Array<{ key: Filter; en: string; zh: string; n?: number; badge?: boolean }> = [
    { key: 'all', en: 'All', zh: '全部', n: counts.all },
    { key: 'needs_specs', en: 'Needs specs', zh: '待補規格', n: counts.needs_specs },
    { key: 'waiting_on_buyer', en: 'Waiting on buyer', zh: '等買家回覆', n: counts.waiting_on_buyer },
    { key: 'ready_to_quote', en: 'Ready to quote', zh: '可報價', n: counts.ready_to_quote },
    { key: 'owed_replies', en: 'Owed replies', zh: '待我們回覆', n: counts.owed_replies },
    { key: 'needs_you', en: 'Needs you', zh: '需要你確認', n: counts.needs_you, badge: true },
  ];

  const approveDraft = async (row: InboxRow) => {
    if (!row.pending_draft) return;
    try {
      const res = await authFetch(`/api/admin/outbound/${row.pending_draft.id}/send`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 202) throw new Error(data.error || 'Send failed');
      if (res.status === 202 || data.pending) {
        showToast(t('Saved — connect a sender to deliver this', '已儲存 — 設定寄件後即可送出'), 'error');
      } else {
        showToast(t('Approved and sent', '已批准並送出'), 'success');
      }
      fetchInbox({ silent: true });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Send failed', 'error');
    }
  };

  const discardDraft = async (row: InboxRow) => {
    if (!row.pending_draft) return;
    try {
      const res = await authFetch(`/api/admin/outbound/${row.pending_draft.id}/discard`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Discard failed');
      }
      showToast(t('Draft discarded', '草稿已丟棄'), 'success');
      fetchInbox({ silent: true });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Discard failed', 'error');
    }
  };

  const togglePause = async (row: InboxRow) => {
    const paused = !!row.thread?.paused;
    try {
      const res = await authFetch(`/api/admin/inbox/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: paused ? 'active' : 'ai_paused' }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setRows((r) =>
        r.map((x) =>
          x.id === row.id
            ? { ...x, status: paused ? 'active' : 'ai_paused', thread: { ...x.thread, paused: !paused } }
            : x
        )
      );
      showToast(
        paused ? t('Chasing resumed', '已恢復追蹤') : t('Chasing paused', '已暫停追蹤'),
        'success'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update', 'error');
    }
  };

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
          className="glass-press flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold text-white whitespace-nowrap"
          style={{ background: 'var(--accent)' }}
        >
          <Plus width="14" height="14" />
          {t('Compose', '撰寫')}
        </button>

        <div
          className="ml-3 flex items-center gap-0.5 rounded-[10px] p-0.5 overflow-x-auto"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
        >
          {folderTabs.map((f) => {
            const active = folder === f.key;
            return (
              <button
                key={f.key}
                onClick={() => selectNav(f.key, filter)}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-[8px] px-2.5 py-1 text-[12.5px] transition-colors"
                style={{
                  background: active ? 'var(--surface)' : 'transparent',
                  color: active ? 'var(--text)' : 'var(--text-muted)',
                  fontWeight: active ? 600 : 500,
                  boxShadow: active ? '0 1px 2px rgba(0,0,0,0.07)' : 'none',
                }}
              >
                <f.icon width="13" height="13" strokeWidth="1.8" />
                {t(f.en, f.zh)}
                {f.n !== undefined && f.n > 0 && (
                  <span className="tabular-nums text-[11px]">{f.n > 99 ? '99+' : f.n}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {counts.unread > 0 && folder === 'inbox' && (
            <span className="hidden md:inline text-[11px] font-medium tabular-nums whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
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
          <div className="relative hidden sm:block">
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

      {/* Status filters — lenses on the one inbox, not separate pages. */}
      <div
        className="flex items-center gap-1 border-b px-3 md:px-5 flex-shrink-0 overflow-x-auto"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        {filterTabs.map((f) => {
          const active = filter === f.key;
          const showBadge = f.badge && (f.n ?? 0) > 0;
          return (
            <button
              key={f.key}
              onClick={() => selectNav(folder, f.key)}
              className="relative whitespace-nowrap px-2.5 py-2 text-[12.5px] transition-colors flex items-center gap-1.5"
              style={{ color: active ? 'var(--text)' : 'var(--text-muted)', fontWeight: active ? 600 : 500 }}
            >
              {t(f.en, f.zh)}
              {showBadge ? (
                <span
                  className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10.5px] font-semibold tabular-nums text-white"
                  style={{ background: 'var(--accent)' }}
                >
                  {(f.n ?? 0) > 99 ? '99+' : f.n}
                </span>
              ) : (
                f.n !== undefined && f.n > 0 && (
                  <span className="tabular-nums text-[11px]">{f.n > 99 ? '99+' : f.n}</span>
                )
              )}
              {active && (
                <span
                  className="absolute left-2 right-2 -bottom-px h-[2px] rounded-full"
                  style={{ background: 'var(--accent)' }}
                />
              )}
            </button>
          );
        })}
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
        <span>{t('Thread', '對話')}</span>
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
            <p className="text-[12px] mb-4" style={{ color: 'var(--text-muted)' }}>
              {error
                ? t('Check your connection and try again.', '請檢查連線後再試。')
                : folder === 'inbox' && !qParam && counts.total === 0
                  ? t('Load sample conversations and products to explore the workspace.', '載入示範對話與產品，先看看工作區。')
                  : t('Incoming mail will show here', '來信會顯示在這裡')}
            </p>
            {!error && folder === 'inbox' && !qParam && counts.total === 0 && (
              <button
                onClick={loadDemoData}
                disabled={seeding}
                className="inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--accent)' }}
              >
                <Sparkles width="14" height="14" />
                {seeding ? t('Loading…', '載入中…') : t('Load demo data', '載入示範資料')}
              </button>
            )}
          </div>
        ) : (
          visibleRows().map((r) => {
            const unread = r.unread;
            const flagged = r.flagged;
            const isSelected = selected.has(r.id);
            const th = r.thread;
            const chip = STATE_CHIP[th.state] || STATE_CHIP.waiting_on_buyer;
            const missing = r.missing_info || [];
            const paused = th.paused;
            const open = () => router.push(`/admin/inbox/${r.id}`);
            return (
              <div
                key={r.id}
                className="group w-full text-left border-b transition-colors hover:bg-black/[0.02]"
                style={{ borderColor: 'var(--border)', background: unread && !isSelected ? '#FFFFFF' : undefined }}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(24px,32px)_minmax(170px,220px)_1fr_120px] items-start md:items-center gap-1.5 md:gap-3 px-2.5 md:px-4 py-2.5 md:py-3">
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
                  <div className="flex items-center gap-2 min-w-0 cursor-pointer" onClick={open}>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium text-white flex-shrink-0"
                      style={{ background: 'var(--accent)' }}
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
                        <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                          {contactSub(r)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Thread: what it is, what's missing, what needs a tap */}
                  <div className="min-w-0 cursor-pointer" onClick={open}>
                    <div className="flex items-center gap-2 min-w-0">
                      <p
                        className="text-[12px] md:text-[13px] truncate"
                        style={{
                          color: unread ? 'var(--text)' : 'var(--text-muted)',
                          fontWeight: unread ? 600 : 400,
                        }}
                      >
                        {r.product_summary || r.subject || (r.last_message?.content || '—')}
                      </p>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                        style={{ background: chip.bg, color: chip.fg }}
                      >
                        {th.label}
                      </span>
                      {th.needsYou && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 text-white"
                          style={{ background: 'var(--accent)' }}
                        >
                          {t('Needs you', '需要你')}
                        </span>
                      )}
                      {paused && th.state !== 'closed' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0" style={{ background: '#FEF3C7', color: '#D97706' }}>
                          {t('Chase paused', '追蹤已暫停')}
                        </span>
                      )}
                    </div>

                    {missing.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <span className="text-[10.5px] font-medium" style={{ color: 'var(--text-muted)' }}>
                          {t('Missing', '待補')}:
                        </span>
                        {missing.slice(0, 4).map((m, i) => (
                          <span
                            key={`${r.id}-m-${i}`}
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                          >
                            {m}
                          </span>
                        ))}
                        {missing.length > 4 && (
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>+{missing.length - 4}</span>
                        )}
                      </div>
                    )}

                    {r.pending_draft && (
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10.5px] truncate max-w-[200px]" style={{ color: 'var(--text-muted)' }}>
                          {t('Draft ready', '草稿待批')}
                          {r.pending_draft.subject ? `: ${r.pending_draft.subject}` : ''}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); approveDraft(r); }}
                          className="glass-press flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                          style={{ background: 'var(--accent)' }}
                        >
                          <Check width="11" height="11" /> {t('Approve & send', '批准並送出')}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); open(); }}
                          className="rounded-full px-2 py-1 text-[11px] font-medium"
                          style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
                        >
                          {t('Edit', '編輯')}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); discardDraft(r); }}
                          className="rounded-full px-2 py-1 text-[11px] font-medium"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {t('Discard', '丟棄')}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Date, star, pause */}
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePause(r); }}
                      className="hidden md:flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-black/[0.05] opacity-0 group-hover:opacity-100"
                      title={paused ? t('Resume chasing', '恢復追蹤') : t('Pause chasing', '暫停追蹤')}
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {paused ? <Play width="13" height="13" /> : <Pause width="13" height="13" />}
                    </button>
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
  const [minimized, setMinimized] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const toRef = useRef<HTMLInputElement>(null);

  const split = (s: string) => s.split(/[,;]/).map((x) => x.trim()).filter(Boolean);

  const send = async () => {
    const toList = split(to);
    if (toList.length === 0 || !subject.trim() || !body.trim()) {
      showToast(t('Recipient, subject, and message are required', '請填寫收件人、主旨和內容'), 'error');
      return;
    }
    setSending(true);
    try {
      const res = await authFetch('/api/admin/inbox', {
        method: 'POST',
        body: JSON.stringify({
          recipients: toList,
          cc: split(cc),
          bcc: split(bcc),
          contact_name: toList[0],
          subject: subject.trim(),
          body: body.trim(),
        }),
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!sending) send();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    if (!minimized) toRef.current?.focus();
  }, [minimized]);

  const fieldStyle = {
    borderColor: 'var(--border)',
    background: 'transparent',
    color: 'var(--text)',
  } as const;

  const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none sm:inset-x-auto sm:bottom-5 sm:right-5 sm:justify-end">
      <div
        className="glass-anim-in pointer-events-auto flex w-full flex-col overflow-hidden rounded-t-[24px] transition-[height] duration-[420ms] sm:w-[580px] sm:rounded-[24px]"
        style={{
          height: minimized ? 54 : 'min(72vh, 660px)',
          transitionTimingFunction: EASE,
          color: 'var(--text)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-float)',
        }}
      >
        {/* The header stays put while the body morphs, so minimise and expand
            read as one continuous surface rather than two screens. */}
        <div className="relative z-10 flex h-[54px] flex-shrink-0 items-center gap-2 px-4">
          <button
            onClick={() => setMinimized((m) => !m)}
            className="glass-press flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/[0.05]"
            title={minimized ? t('Expand', '展開') : t('Minimise', '縮到最小')}
            style={{ color: 'var(--text-muted)' }}
          >
            {minimized ? <ChevronUp width="15" height="15" /> : <ChevronDown width="15" height="15" />}
          </button>
          <span
            className={`flex-1 truncate text-[13px] font-semibold ${minimized ? 'cursor-pointer' : ''}`}
            style={{ color: 'var(--text)' }}
            onClick={() => {
              if (minimized) setMinimized(false);
            }}
          >
            {minimized
              ? subject.trim() || to.trim() || t('New message', '新訊息')
              : t('New message', '新訊息')}
          </span>
          <button
            onClick={onClose}
            className="glass-press flex h-7 w-7 items-center justify-center rounded-full hover:bg-black/[0.05]"
            title={t('Discard', '丟棄')}
            style={{ color: 'var(--text-muted)' }}
          >
            <X width="15" height="15" />
          </button>
        </div>

        <div
          className="relative z-10 flex min-h-0 flex-1 flex-col transition-[opacity,transform] duration-[300ms]"
          style={{
            opacity: minimized ? 0 : 1,
            transform: minimized ? 'translateY(-10px)' : 'translateY(0)',
            pointerEvents: minimized ? 'none' : 'auto',
            transitionTimingFunction: EASE,
          }}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="flex items-center gap-3 px-4 py-2.5 border-b" style={fieldStyle}>
              <span className="w-12 flex-shrink-0 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {t('To', '收件人')}
              </span>
              <input
                ref={toRef}
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder={t('name@company.com, second@company.com', '名稱@公司.com，第二位@公司.com')}
                className="flex-1 text-[13px] focus:outline-none min-w-0"
                style={fieldStyle}
              />
            </div>

            {showCc ? (
              <>
                <div className="flex items-center gap-3 px-4 py-2.5 border-b" style={fieldStyle}>
                  <span className="w-12 flex-shrink-0 text-[12px]" style={{ color: 'var(--text-muted)' }}>Cc</span>
                  <input
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    className="flex-1 text-[13px] focus:outline-none min-w-0"
                    style={fieldStyle}
                  />
                </div>
                <div className="flex items-center gap-3 px-4 py-2.5 border-b" style={fieldStyle}>
                  <span className="w-12 flex-shrink-0 text-[12px]" style={{ color: 'var(--text-muted)' }}>Bcc</span>
                  <input
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    className="flex-1 text-[13px] focus:outline-none min-w-0"
                    style={fieldStyle}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center px-4 py-1.5" style={fieldStyle}>
                <button
                  onClick={() => setShowCc(true)}
                  className="text-[12px] hover:underline"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Cc / Bcc
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 px-4 py-2.5 border-b" style={fieldStyle}>
              <span className="w-12 flex-shrink-0 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {t('Subject', '主旨')}
              </span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="flex-1 text-[13px] focus:outline-none min-w-0"
                style={fieldStyle}
              />
            </div>

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('Write your message…', '輸入訊息內容…')}
              className="flex-1 min-h-[190px] px-4 py-3.5 text-[13.5px] leading-[1.7] focus:outline-none resize-none"
              style={fieldStyle}
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={send}
              disabled={sending}
              className="glass-press flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-white disabled:opacity-50"
              style={{ background: 'var(--accent)' }}
            >
              <Send width="13" height="13" />
              {sending ? t('Sending…', '傳送中…') : t('Send', '傳送')}
            </button>
            <button
              onClick={onClose}
              className="glass-press flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/[0.05]"
              title={t('Discard', '丟棄')}
              style={{ color: 'var(--text-muted)' }}
            >
              <Trash2 width="15" height="15" />
            </button>
            <span className="ml-auto pr-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {t('⌘ + Enter to send', '⌘ + Enter 傳送')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
