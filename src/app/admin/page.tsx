'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Search, Globe, Clock, RefreshCw } from 'lucide-react';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';

interface InboxRow {
  id: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
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
}

interface InboxCounts {
  needs_reply: number;
  waiting: number;
  bookmarked: number;
  human: number;
  ai: number;
  total: number;
}

type Filter = 'needs_reply' | 'waiting' | 'all' | 'bookmarked' | 'human' | 'ai';

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

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b animate-pulse" style={{ borderColor: 'var(--border)' }}>
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
  const [counts, setCounts] = useState<InboxCounts>({
    needs_reply: 0, waiting: 0, bookmarked: 0, human: 0, ai: 0, total: 0,
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // URL is the single source of truth for the folder view (?view=). Sidebar
  // folder links and the in-page tabs both navigate to the same query param.
  const view = searchParams.get('view');
  const filter: Filter =
    view === 'waiting' || view === 'all' || view === 'needs_reply' || view === 'human' || view === 'ai'
      ? view
      : 'all';

  const selectFilter = (key: Filter) => {
    router.replace(key === 'all' ? '/admin' : `/admin?view=${key}`, { scroll: false });
  };

  const fetchInbox = useCallback(async (activeFilter: Filter, opts?: { silent?: boolean }) => {
    if (companyLoading || !companyId) return;
    try {
      if (!opts?.silent) {
        setLoading(true);
        setError(null);
      }
      const res = await authFetch(`/api/admin/inbox?filter=${activeFilter}`);
      if (!res.ok) throw new Error('Failed to load inbox');
      const data = await res.json();
      setRows(data.conversations || []);
      setCounts(data.counts || { needs_reply: 0, waiting: 0, bookmarked: 0, human: 0, ai: 0, total: 0 });
    } catch (err) {
      if (opts?.silent) return;
      console.error('[inbox] fetch error:', err);
      setError(t('Failed to load inbox. Please try again.', '載入收件匣失敗，請重試。'));
      setRows([]);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [companyId, companyLoading, t]);

  useEffect(() => {
    fetchInbox(filter);
  }, [fetchInbox, filter]);

  useEffect(() => {
    if (companyLoading || !companyId) return;
    // Silent polling fallback so new emails surface without a full reload —
    // existing rows stay visible, no skeleton flash.
    const interval = setInterval(() => fetchInbox(filter, { silent: true }), 15000);
    return () => clearInterval(interval);
  }, [companyId, companyLoading, fetchInbox, filter]);

  const contactLabel = (r: InboxRow) =>
    r.contact_name || r.contact_email || r.contact_phone || 'Unknown';

  const contactEmail = (r: InboxRow) => r.contact_email || r.contact_phone || '';

  const tabs: Array<{ key: Filter; en: string; zh: string; n?: number }> = [
    { key: 'all', en: 'All', zh: '全部', n: counts.total },
    { key: 'waiting', en: 'Waiting on them', zh: '等客戶回覆', n: counts.waiting },
    { key: 'needs_reply', en: 'Waiting on you', zh: '需要你回覆', n: counts.needs_reply },
    { key: 'human', en: 'Human', zh: '人手', n: counts.human },
    { key: 'ai', en: 'AI', zh: 'AI', n: counts.ai },
  ];

  const visible = search.trim()
    ? rows.filter((r) => {
        const hay = `${contactLabel(r)} ${contactEmail(r)} ${r.last_message?.content || ''}`.toLowerCase();
        return hay.includes(search.toLowerCase());
      })
    : rows;

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--bg)' }}>
      {/* Mail toolbar — folder pills + search */}
      <div
        className="flex items-center gap-2 border-b px-3 py-2 flex-shrink-0 md:px-5"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          {tabs.map((f) => (
            <button
              key={f.key}
              onClick={() => selectFilter(f.key)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors"
              style={{
                background: filter === f.key ? 'var(--accent)' : 'transparent',
                color: filter === f.key ? 'white' : 'var(--text-muted)',
              }}
            >
              {t(f.en, f.zh)}
              {f.n !== undefined && f.n > 0 && (
                <span
                  className="rounded-full px-1.5 text-[10px] font-bold tabular-nums leading-4"
                  style={{
                    background: filter === f.key ? 'rgba(255,255,255,0.2)' : 'var(--accent-light)',
                    color: filter === f.key ? 'white' : 'var(--text)',
                  }}
                >
                  {f.n > 99 ? '99+' : f.n}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => fetchInbox(filter)}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-black/[0.05]"
            title={t('Refresh', '重新整理')}
            style={{ color: 'var(--text-muted)' }}
          >
            <RefreshCw width="15" height="15" />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2" width="15" height="15" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Search mail…', '搜尋郵件…')}
              className="border rounded-[10px] pl-8.5 pr-3 py-2 text-[13px] focus:outline-none w-44 md:w-60 transition-[width]"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
            />
          </div>
        </div>
      </div>

      {/* Column headers — makes it unmistakably a mail client */}
      <div
        className="hidden md:grid grid-cols-[minmax(190px,240px)_1fr_80px] items-center gap-3 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.05em] border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', background: '#FBFBFB' }}
      >
        <span>{t('Sender', '寄件人')}</span>
        <span>{t('Message', '內容')}</span>
        <span className="text-right">{t('Date', '日期')}</span>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <>
            <RowSkeleton /><RowSkeleton /><RowSkeleton /><RowSkeleton /><RowSkeleton />
          </>
        ) : visible.length === 0 ? (
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
          visible.map((r) => {
            const isHuman = r.status === 'human';
            const isFlagged = r.status === 'bookmarked';
            const paused = r.status === 'ai_paused';
            const unread = r.needs_reply;
            return (
              <button
                key={r.id}
                onClick={() => router.push(`/admin/inbox/${r.id}`)}
                className="w-full text-left border-b transition-colors hover:bg-black/[0.02]"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(190px,240px)_1fr_80px] items-center gap-1.5 md:gap-3 px-2.5 md:px-4 py-2.5 md:py-3">
                  {/* Sender */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium text-white flex-shrink-0"
                      style={{ background: isFlagged ? 'var(--error)' : isHuman ? '#038153' : 'var(--accent)' }}
                    >
                      {contactLabel(r).charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div
                        className="font-medium text-[13px] truncate"
                        style={{ color: unread ? 'var(--text)' : 'var(--text-muted)' }}
                      >
                        {contactLabel(r)}
                      </div>
                      {contactEmail(r) && (
                        <div className="text-[11px] truncate md:hidden" style={{ color: 'var(--text-muted)' }}>
                          {contactEmail(r)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preview / subject line */}
                  <div className="min-w-0">
                    <p
                      className="text-[12px] md:text-[13px] truncate"
                      style={{
                        color: unread ? 'var(--text)' : 'var(--text-muted)',
                        fontWeight: unread ? 500 : 400,
                      }}
                    >
                      {r.last_message?.content || '—'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 md:hidden">
                      {r.needs_reply && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: '#FEF3C7', color: '#D97706' }}>
                          <Clock className="inline-block mr-0.5" width="10" height="10" style={{ stroke: '#D97706' }} />
                          {t('Waiting on you', '需要你回覆')}
                        </span>
                      )}
                      {r.waiting_on_customer && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                          {t('Waiting on them', '等客戶回覆')}
                        </span>
                      )}
                      {r.external_search_enabled && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5" style={{ background: '#E8F5F1', color: '#038153' }}>
                          <Globe width="10" height="10" />
                          {t('Ext. search', '外部搜尋')}
                        </span>
                      )}
                      {isHuman && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: '#E8F5F1', color: '#038153' }}>
                          HUMAN
                        </span>
                      )}
                      {paused && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: '#FEF3C7', color: '#D97706' }}>
                          AI PAUSED
                        </span>
                      )}
                      {r.detected_language && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                          {r.detected_language === 'zh' ? '中文' : 'EN'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date — right aligned like a mail client */}
                  <div
                    className="text-[11px] tabular-nums text-right hidden md:block"
                    style={{ color: unread ? 'var(--text)' : 'var(--text-muted)', fontWeight: unread ? 600 : 400 }}
                  >
                    {formatTimeAgo(r.updated_at)}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}