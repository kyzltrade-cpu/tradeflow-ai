'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  RefreshCw, Reply, CheckCircle2, AlertTriangle, Clock, Send,
  ArrowUpRight, Inbox, Mail, Trophy, ChevronRight, ChevronDown,
} from 'lucide-react';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { authFetch } from '@/lib/auth-fetch';
import {
  QUEUE_GROUPS,
  type QueueGroupKey,
  type QueueGroup,
  type QueueItem,
  type PrimaryAction,
} from '@/lib/queue-status';
import type { BigDeal } from '@/lib/big-deals';

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function formatAmount(item: QueueItem): string | null {
  if (item.amount == null) return null;
  const n = Number(item.amount);
  const opts: Intl.NumberFormatOptions = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  };
  return `${item.quoteCurrency || 'USD'} ${new Intl.NumberFormat('en-US', opts).format(n)}`;
}

interface ActionSpec {
  label: { en: string; zh: string };
  tone: 'accent' | 'warn' | 'muted' | 'plain';
  icon: typeof Reply;
}

const ACTION_SPECS: Record<PrimaryAction, ActionSpec> = {
  reply: { label: { en: 'Reply', zh: '回覆' }, tone: 'accent', icon: Reply },
  approve: { label: { en: 'Approve', zh: '審批' }, tone: 'accent', icon: CheckCircle2 },
  're-approve': { label: { en: 'Re-approve', zh: '重新審批' }, tone: 'warn', icon: AlertTriangle },
  'send-followup': { label: { en: 'Follow up', zh: '跟進' }, tone: 'accent', icon: Send },
  wait: { label: { en: 'Waiting…', zh: '等回覆…' }, tone: 'plain', icon: Clock },
};

interface ChipSpec {
  label: { en: string; zh: string };
  bg: string;
  fg: string;
}

const CHIP_SPECS: Partial<Record<QueueItem['kind'], ChipSpec>> = {
  reply: { label: { en: 'Waiting on you', zh: '待你回覆' }, bg: '#F4F4F5', fg: '#3F3F46' },
  draft_ready: { label: { en: 'Draft ready', zh: '草稿就緒' }, bg: '#F4F4F5', fg: '#18181B' },
  approval: { label: { en: 'Needs approval', zh: '待審批' }, bg: '#F4F4F5', fg: '#18181B' },
  reapproval: { label: { en: 'Needs re-approval', zh: '需重新審批' }, bg: '#FEF3F2', fg: '#B42318' },
  awaiting_customer: { label: { en: 'Waiting on customer', zh: '等客戶回覆' }, bg: '#F4F4F5', fg: '#71717A' },
  followup: { label: { en: 'Follow-up due', zh: '跟進到期' }, bg: '#FFFAEB', fg: '#B54708' },
};

interface GroupMeta {
  icon: typeof Reply;
  color: string;
  label: { en: string; zh: string };
  hint: { en: string; zh: string };
}

type DisplayKey = 'approvals' | 'replies' | 'they_owe';

interface DisplaySection {
  key: DisplayKey;
  items: QueueItem[];
}

const SECTION_META: Record<DisplayKey, GroupMeta> = {
  approvals: {
    icon: CheckCircle2,
    color: '#18181B',
    label: { en: 'Needs approval', zh: '待審批' },
    hint: { en: 'Draft quotes & replies awaiting sign-off', zh: '待你審批的草稿與報價' },
  },
  replies: {
    icon: Reply,
    color: '#52525B',
    label: { en: 'Replies waiting on you', zh: '待你回覆' },
    hint: { en: 'Customers waiting on your reply', zh: '客戶正在等你回覆' },
  },
  they_owe: {
    icon: Clock,
    color: '#71717A',
    label: { en: 'They owe you', zh: '等對方回覆' },
    hint: { en: 'Customer replies & follow-ups due', zh: '等客戶回覆或跟進' },
  },
};

const FILTER_SPECS: Array<{ key: 'all' | DisplayKey; label: { en: string; zh: string } }> = [
  { key: 'all', label: { en: 'All', zh: '全部' } },
  { key: 'approvals', label: { en: 'Approvals', zh: '待審批' } },
  { key: 'replies', label: { en: 'Replies', zh: '待回覆' } },
];

type FilterKey = (typeof FILTER_SPECS)[number]['key'];

// Presentation-only regroup of the fixed API groups into the sections the page
// shows. The wire contract in queue-status.ts is unchanged.
function buildSections(groups: QueueGroup[]): DisplaySection[] {
  const itemsOf = (key: QueueGroupKey) => groups.find((g) => g.key === key)?.items ?? [];
  const youOwe = itemsOf('you_owe');

  // Approvals lead — money is going out. IN_REVIEW + re-approvals from the API,
  // plus DRAFT quotes the API parks in you_owe (all share the Approve action).
  const approvals = [
    ...itemsOf('needs_approval'),
    ...youOwe.filter((i) => i.primaryAction === 'approve' || i.primaryAction === 're-approve'),
  ].sort((a, b) => (b.time ?? '').localeCompare(a.time ?? ''));

  // Oldest first: the longest-waiting customer climbs to the top.
  const replies = youOwe
    .filter((i) => i.primaryAction === 'reply')
    .sort((a, b) => (a.time ?? '9999').localeCompare(b.time ?? '9999'));

  return [
    { key: 'approvals', items: approvals },
    { key: 'replies', items: replies },
    { key: 'they_owe', items: itemsOf('they_owe') },
  ];
}

const PRIORITY_TONE: Record<string, { label: { en: string; zh: string }; color: string; bg: string }> = {
  high: { label: { en: 'High priority', zh: '高優先' }, color: '#B54708', bg: '#FFFAEB' },
  urgent: { label: { en: 'Urgent', zh: '緊急' }, color: '#B42318', bg: '#FEF3F2' },
};

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b animate-pulse" style={{ borderColor: 'var(--border)' }}>
      <div className="w-9 h-9 rounded-full flex-shrink-0 bg-black/5" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-36 rounded bg-black/5" />
        <div className="h-3 w-64 rounded bg-black/5" />
      </div>
      <div className="h-7 w-24 rounded-full bg-black/5" />
    </div>
  );
}

function sectionEmptyHint(key: DisplayKey): { en: string; zh: string } {
  switch (key) {
    case 'approvals':
      return { en: 'Nothing pending your approval.', zh: '沒有待審批項目。' };
    case 'replies':
      return { en: 'No open items waiting on you.', zh: '沒有需要你處理的項目。' };
    case 'they_owe':
      return { en: 'Nothing waiting on customers.', zh: '沒有等客戶的項目。' };
  }
}

export default function AdminQueuePage() {
  const { t } = useLang();
  const { companyId, loading: companyLoading } = useCompany();
  const [groups, setGroups] = useState<QueueGroup[]>(QUEUE_GROUPS.map((k) => ({ key: k, count: 0, items: [] })));
  const [bigDeals, setBigDeals] = useState<BigDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [bigDealsOpen, setBigDealsOpen] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');

  const fetchQueue = useCallback(async (opts?: { silent?: boolean }) => {
    if (companyLoading || !companyId) return;
    try {
      if (!opts?.silent) {
        setLoading(true);
        setError(null);
      }
      const res = await authFetch('/api/admin/queue');
      if (!res.ok) throw new Error('Failed to load queue');
      const data = await res.json();
      const next: QueueGroup[] = QUEUE_GROUPS.map((k) => {
        const g = (data.groups || []).find((x: QueueGroup) => x.key === k);
        return g ?? { key: k, count: 0, items: [] };
      });
      setGroups(next);
      setBigDeals(data.bigDeals || []);
    } catch (err) {
      if (opts?.silent) return;
      console.error('[queue] fetch error:', err);
      setError(t('Failed to load the queue. Please try again.', '載入工作隊列失敗，請重試。'));
      setGroups(QUEUE_GROUPS.map((k) => ({ key: k, count: 0, items: [] })));
      setBigDeals([]);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [companyId, companyLoading, t]);

  useEffect(() => {
    // Defer past the synchronous effect body; load() flips loading state.
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) fetchQueue();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fetchQueue]);

  useEffect(() => {
    if (companyLoading || !companyId) return;
    const interval = setInterval(() => fetchQueue({ silent: true }), 20_000);
    return () => clearInterval(interval);
  }, [companyId, companyLoading, fetchQueue]);

  const totalItems = groups.reduce((n, g) => n + g.count, 0);
  const sections = buildSections(groups);
  const visibleSections = filter === 'all' ? sections : sections.filter((s) => s.key === filter);
  const countFor = (key: FilterKey): number =>
    key === 'all' ? totalItems : sections.find((s) => s.key === key)?.items.length ?? 0;

  const refresh = async () => {
    setRefreshing(true);
    try {
      await fetchQueue({ silent: true });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col" style={{ background: 'var(--bg)' }}>
      {/* Page header */}
      <div
        className="flex items-center gap-3 border-b px-4 py-3 flex-shrink-0 md:px-6"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <div className="min-w-0">
          <h1 className="text-[17px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--text)' }}>
            {t('Queue', '工作隊列')}
          </h1>
          <p className="text-[12px] truncate" style={{ color: 'var(--text-muted)' }}>
            {t('Everything needing action, in one place.', '所有需要處理的事項，集中在這裡。')}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/admin/inbox"
            className="hidden md:flex items-center gap-1.5 text-[12.5px] font-medium rounded-full px-3 py-1.5 transition-colors hover:bg-black/[0.04]"
            style={{ color: 'var(--text-muted)' }}
          >
            <Mail width="14" height="14" />
            {t('All mail', '全部郵件')}
          </Link>
          <button
            onClick={refresh}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-black/[0.05] ${refreshing ? 'animate-spin' : ''}`}
            title={t('Refresh', '重新整理')}
            style={{ color: 'var(--text-muted)' }}
          >
            <RefreshCw width="15" height="15" />
          </button>
        </div>
      </div>

      {/* Filter row */}
      <div
        className="flex items-center gap-1.5 border-b px-4 py-2 flex-shrink-0 md:px-6"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        {FILTER_SPECS.map((f) => {
          const active = filter === f.key;
          const n = countFor(f.key);
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-colors"
              style={active
                ? { background: 'var(--accent)', color: '#fff' }
                : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              {t(f.label.en, f.label.zh)}
              <span
                className="tabular-nums text-[10.5px] font-semibold rounded-full px-1.5 min-w-[18px] text-center"
                style={active ? { background: 'rgba(255,255,255,0.22)' } : { background: 'var(--bg)' }}
              >
                {n > 99 ? '99+' : n}
              </span>
            </button>
          );
        })}
      </div>

      {/* Group sections */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {error && (
          <div className="px-6 py-6 text-center">
            <p className="text-[13px]" style={{ color: 'var(--error)' }}>{error}</p>
            <button
              onClick={() => fetchQueue()}
              className="mt-3 text-[12.5px] font-medium rounded-full px-4 py-1.5 border"
              style={{ borderColor: 'var(--border)' }}
            >
              {t('Retry', '重試')}
            </button>
          </div>
        )}

        {loading ? (
          <>
            <RowSkeleton /><RowSkeleton /><RowSkeleton /><RowSkeleton />
            <RowSkeleton /><RowSkeleton />
          </>
        ) : (
          <>
            {filter === 'all' && bigDeals.length > 0 && (
              <BigDealsBand deals={bigDeals} open={bigDealsOpen} onToggle={() => setBigDealsOpen((v) => !v)} />
            )}
            {visibleSections.map((section) => {
            const meta = SECTION_META[section.key];
            const GroupIcon = meta.icon;
            return (
              <section key={section.key} className="border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="sticky top-0 z-10 flex items-center gap-2 px-4 md:px-6 py-2"
                  style={{ background: `${meta.color}12`, borderBottom: '1px solid var(--border)' }}
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.05em]"
                    style={{ color: meta.color }}
                  >
                    <GroupIcon width="13" height="13" strokeWidth={2.5} />
                    {t(meta.label.en, meta.label.zh)}
                  </span>
                  <span className="tabular-nums text-[11px] rounded-full px-1.5 min-w-[22px] text-center font-semibold"
                    style={{ background: `${meta.color}22`, color: meta.color }}
                  >
                    {section.items.length > 99 ? '99+' : section.items.length}
                  </span>
                  <span className="hidden sm:block text-[10.5px] font-medium ml-1" style={{ color: 'var(--text-muted)' }}>
                    {t(meta.hint.en, meta.hint.zh)}
                  </span>
                </div>

                {section.items.length === 0 ? (
                  <div className="px-4 md:px-6 py-6 text-center">
                    <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                      {t(sectionEmptyHint(section.key).en, sectionEmptyHint(section.key).zh)}
                    </p>
                  </div>
                ) : (
                  section.items.map((item) => {
                    const chip = CHIP_SPECS[item.kind] || CHIP_SPECS.reply!;
                    const action = ACTION_SPECS[item.primaryAction] || ACTION_SPECS.wait;
                    const amount = formatAmount(item);
                    const sender = item.sender || '—';
                    return (
                      <div
                        key={`${item.kind}-${item.id}`}
                        className="group w-full border-b last:border-b-0 transition-colors hover:bg-black/[0.02]"
                        style={{ borderColor: 'var(--border)' }}
                      >
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(200px,240px)_1fr_auto_auto] items-center gap-2 md:gap-4 px-4 md:px-6 py-3">
                          {/* Sender */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium text-white flex-shrink-0"
                              style={{ background: 'var(--accent)' }}
                            >
                              {sender.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-[13px] truncate" style={{ color: 'var(--text)' }}>
                                {sender}
                              </div>
                            </div>
                          </div>

                          {/* Title / subject */}
                          <div className="min-w-0 col-start-1 md:col-start-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {item.quoteNumber && (
                                <span className="text-[11px] font-medium tabular-nums flex-shrink-0"
                                  style={{ color: 'var(--text-muted)' }}
                                >
                                  {item.quoteNumber}
                                </span>
                              )}
                              <p className="text-[12.5px] truncate" style={{ color: 'var(--text)' }}>
                                {item.title || item.subject || '—'}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 md:hidden mt-1">
                              {amount && (
                                <span className="text-[11.5px] font-semibold tabular-nums whitespace-nowrap" style={{ color: 'var(--text)' }}>
                                  {amount}
                                </span>
                              )}
                              <Chip chip={chip} />
                              <span className="text-[11px] tabular-nums whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                                {formatTimeAgo(item.time)}
                              </span>
                            </div>
                          </div>

                          {/* Chip + time (desktop) */}
                          <div className="hidden md:flex items-center gap-3">
                            <Chip chip={chip} />
                            <span className="text-[11px] tabular-nums whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                              {formatTimeAgo(item.time)}
                            </span>
                          </div>

                          {/* Primary action */}
                          <div className="col-start-2 row-start-1 md:col-start-4 self-center">
                            <PrimaryActionButton item={item} action={action} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </section>
            );
          })}
          </>
        )}

        {!loading && !error && totalItems === 0 && (
          <div className="px-4 md:px-6 py-12 text-center">
            <Inbox className="mx-auto mb-3" width="34" height="34" style={{ stroke: 'var(--text-muted)' }} />
            <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--text)' }}>
              {t('Your queue is clear', '你的工作隊列已清空')}
            </p>
            <p className="text-[12.5px] mb-5" style={{ color: 'var(--text-muted)' }}>
              {t('Everything is handled. New mail and drafts will appear here.', '所有事項都處理好了。新郵件與草稿會顯示在這裡。')}
            </p>
            <Link
              href="/admin/inbox"
              className="inline-flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              <Mail width="14" height="14" />
              {t('Open inbox', '開啟收件匣')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function BigDealsBand({ deals, open, onToggle }: { deals: BigDeal[]; open: boolean; onToggle: () => void }) {
  const { t } = useLang();
  return (
    <section className="border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="px-4 md:px-6 py-3" style={{ background: 'var(--surface)' }}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="w-full flex items-center gap-2 text-left"
        >
          <Trophy width="14" height="14" style={{ color: 'var(--text-muted)' }} />
          <h2 className="text-[13px] font-semibold tracking-[-0.01em]" style={{ color: 'var(--text)' }}>
            {t('Big deals', '大宗交易')}
          </h2>
          <span className="tabular-nums text-[10.5px] rounded-full px-1.5 font-semibold" style={{ background: 'var(--accent-light)', color: 'var(--text-muted)' }}>
            {deals.length}
          </span>
          <span className="hidden sm:block text-[11px] font-medium ml-1" style={{ color: 'var(--text-muted)' }}>
            {t('Your highest-value opportunities in play', '在談中的高價值交易')}
          </span>
          <ChevronDown
            width="14" height="14"
            className="ml-auto flex-shrink-0 transition-transform"
            style={{ color: 'var(--text-muted)', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          />
        </button>
        {open && (
        <div className="mt-2 overflow-hidden rounded-[8px] border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
          {deals.map((deal) => {
            const tone = PRIORITY_TONE[deal.priority];
            const value = deal.estimated_order_value != null
              ? `${deal.currency || 'USD'} ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(deal.estimated_order_value)}`
              : null;
            return (
              <Link
                key={deal.id}
                href={`/admin/opportunities/${deal.id}`}
                className="flex items-center gap-2.5 md:gap-3 px-3 py-2.5 border-b last:border-b-0 transition-colors hover:bg-black/[0.03]"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text)' }}>{deal.title}</p>
                    {tone && (
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
                        style={{ background: tone.bg, color: tone.color }}
                      >
                        {t(tone.label.en, tone.label.zh)}
                      </span>
                    )}
                  </div>
                  {deal.next_action && (
                    <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {deal.next_action}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2.5 md:gap-3 flex-shrink-0">
                  {value && (
                    <span className="text-[13px] font-bold tabular-nums whitespace-nowrap" style={{ color: 'var(--text)' }}>
                      {value}
                    </span>
                  )}
                  <ChevronRight width="14" height="14" className="opacity-50 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                </div>
              </Link>
            );
          })}
        </div>
        )}
      </div>
    </section>
  );
}

function Chip({ chip }: { chip: ChipSpec }) {
  const { t } = useLang();
  return (
    <span
      className="text-[10.5px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
      style={{ background: chip.bg, color: chip.fg }}
    >
      {t(chip.label.en, chip.label.zh)}
    </span>
  );
}

function PrimaryActionButton({ item, action }: { item: QueueItem; action: ActionSpec }) {
  const { t } = useLang();

  if (action.tone === 'plain') {
    return (
      <div className="text-[11px] font-medium flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
        <action.icon width="13" height="13" />
        {t(action.label.en, action.label.zh)}
      </div>
    );
  }

  const bg = action.tone === 'accent' ? 'var(--accent)' : 'var(--error)';
  const Icon = action.icon;

  return (
    <Link
      href={item.href}
      className="glass-press flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold text-white whitespace-nowrap transition-opacity hover:opacity-90"
      style={{ background: bg }}
    >
      <Icon width="13" height="13" />
      <span>{t(action.label.en, action.label.zh)}</span>
      <ArrowUpRight width="12" height="12" className="opacity-70" />
    </Link>
  );
}