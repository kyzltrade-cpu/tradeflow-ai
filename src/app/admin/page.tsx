'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Search, Globe, Clock } from 'lucide-react';
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
    <div className="flex items-start gap-3 px-4 py-3 border-b animate-pulse" style={{ borderColor: 'var(--border)' }}>
      <div className="w-9 h-9 rounded-full flex-shrink-0" style={{ background: 'var(--border)' }} />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-32 rounded" style={{ background: 'var(--border)' }} />
        <div className="h-3 w-56 rounded" style={{ background: 'var(--border)' }} />
      </div>
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
    view === 'waiting' || view === 'all' || view === 'bookmarked' || view === 'human' || view === 'ai'
      ? view
      : 'needs_reply';

  const selectFilter = (key: Filter) => {
    router.replace(key === 'needs_reply' ? '/admin' : `/admin?view=${key}`, { scroll: false });
  };

  const fetchInbox = useCallback(async (activeFilter: Filter) => {
    if (companyLoading || !companyId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await authFetch(`/api/admin/inbox?filter=${activeFilter}`);
      if (!res.ok) throw new Error('Failed to load inbox');
      const data = await res.json();
      setRows(data.conversations || []);
      setCounts(data.counts || { needs_reply: 0, waiting: 0, bookmarked: 0, human: 0, ai: 0, total: 0 });
    } catch (err) {
      console.error('[inbox] fetch error:', err);
      setError(t('Failed to load inbox. Please try again.', '載入收件匣失敗，請重試。'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, companyLoading, t]);

  useEffect(() => {
    fetchInbox(filter);
  }, [fetchInbox, filter]);

  useEffect(() => {
    if (companyLoading || !companyId) return;
    // Polling fallback so new emails surface without a full reload
    const interval = setInterval(() => fetchInbox(filter), 15000);
    return () => clearInterval(interval);
  }, [companyId, companyLoading, fetchInbox, filter]);

  const contactLabel = (r: InboxRow) =>
    r.contact_name || r.contact_email || r.contact_phone || 'Unknown';

  const contactEmail = (r: InboxRow) => r.contact_email || r.contact_phone || '';

  const tabs: Array<{ key: Filter; en: string; zh: string; n?: number }> = [
    { key: 'needs_reply', en: 'Waiting on you', zh: '需要你回覆', n: counts.needs_reply },
    { key: 'waiting', en: 'Waiting on them', zh: '等客戶回覆', n: counts.waiting },
    { key: 'all', en: 'All', zh: '全部', n: counts.total },
    { key: 'bookmarked', en: 'Bookmarked', zh: '已加書籤', n: counts.bookmarked },
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
    <div className="flex flex-col h-[calc(100vh-112px)]">
      <div className="flex items-center justify-between gap-3 mb-4 flex-shrink-0 flex-wrap">
        <div>
          <h1 className="text-[20px] md:text-[24px] font-semibold tracking-[-0.5px]">
            {t('Inbox', '收件匣')}
          </h1>
          <p className="text-[13px] md:text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('Customer emails — owed replies first. Open one for the suggested quote & suppliers.', '客戶電郵——需要回覆的排前面。點開一封即見建議報價與供應商。')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2" width="14" height="14" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Search…', '搜尋…')}
              className="border rounded-[4px] pl-8 pr-3 py-2 text-[13px] focus:outline-none w-44 md:w-56"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 border rounded-[4px] overflow-hidden min-h-0" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex flex-col w-full">
          <div className="flex gap-1 px-3 pt-3 pb-2 flex-shrink-0 overflow-x-auto border-b" style={{ borderColor: 'var(--border)' }}>
            {tabs.map((f) => (
              <button
                key={f.key}
                onClick={() => selectFilter(f.key)}
                className="text-[11px] md:text-[12px] px-2.5 py-1 rounded-[4px] font-medium whitespace-nowrap"
                style={{
                  background: filter === f.key ? 'var(--accent)' : 'transparent',
                  color: filter === f.key ? 'white' : 'var(--text-muted)',
                }}
              >
                {t(`${f.en}${f.n !== undefined ? ` (${f.n})` : ''}`, `${f.zh}${f.n !== undefined ? ` (${f.n})` : ''}`)}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
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
                  {t('Customer emails will appear here when they arrive', '客戶來信會顯示在這裡')}
                </p>
              </div>
            ) : (
              visible.map((r) => {
                const isHuman = r.status === 'human';
                const isFlagged = r.status === 'bookmarked';
                const paused = r.status === 'ai_paused';
                return (
                  <button
                    key={r.id}
                    onClick={() => router.push(`/admin/inbox/${r.id}`)}
                    className="w-full text-left px-4 py-3 border-b hover:bg-black/[0.02] transition-colors"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-medium text-white flex-shrink-0"
                        style={{ background: isFlagged ? 'var(--error)' : isHuman ? '#038153' : 'var(--accent)' }}
                      >
                        {contactLabel(r).charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-[14px] truncate">{contactLabel(r)}</span>
                          <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                            {formatTimeAgo(r.updated_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {contactEmail(r) && (
                            <span className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                              {contactEmail(r)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {r.needs_reply && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: '#FEF3C7', color: '#D97706' }}>
                              <Clock className="inline-block mr-1" width="10" height="10" style={{ stroke: '#D97706' }} />
                              {t('Waiting on you', '需要你回覆')}
                            </span>
                          )}
                          {r.waiting_on_customer && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                              {t('Waiting on them', '等客戶回覆')}
                            </span>
                          )}
                          {r.external_search_enabled && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1" style={{ background: '#E8F5F1', color: '#038153' }}>
                              <Globe width="10" height="10" />
                              {t('External search', '外部搜尋')}
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
                          {!isHuman && !paused && !r.waiting_on_customer && !r.needs_reply && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                              AI
                            </span>
                          )}
                          {r.detected_language && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                              {r.detected_language === 'zh' ? '中文' : 'EN'}
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] mt-1.5 truncate" style={{ color: 'var(--text-muted)' }}>
                          {r.last_message?.content || '—'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}