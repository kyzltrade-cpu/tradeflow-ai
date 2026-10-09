'use client';

import { useState } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import { useLang } from '@/lib/lang';
import type { InboxSummary } from '@/lib/inbox-summary';

/** What a card or pipeline segment links to when clicked. */
export type SummaryAction = 'all' | 'needs_specs' | 'waiting_on_buyer' | 'ready_to_quote' | 'follow_ups' | 'needs_you' | 'owed_replies';

interface Props {
  summary: InboxSummary | null;
  loading: boolean;
  /** Current inbox lens, so the matching card reads as selected. */
  active: SummaryAction;
  onSelect: (action: SummaryAction) => void;
}

const COLLAPSE_KEY = 'inbox_summary_collapsed';

function formatMoney(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}

function moneyLabel(value: InboxSummary['readyValue'], t: (en: string, zh: string) => string, locale: string): string {
  if (value.length === 0) return t('nothing queued', '無待報價');
  const [first, ...rest] = value;
  const head = formatMoney(first.amount, first.currency, locale);
  return rest.length === 0 ? head : `${head} +${rest.length}`;
}

function SkeletonCard() {
  return (
    <div className="h-[58px] w-[132px] flex-shrink-0 rounded-[10px] animate-pulse" style={{ background: 'var(--border)' }} />
  );
}

export default function InboxSummary({ summary, loading, active, onSelect }: Props) {
  const { t, lang } = useLang();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      // private mode — leave expanded
      return false;
    }
  });

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  };

  if (loading && !summary) {
    return (
      <div
        className="flex items-center gap-2 border-b px-3 py-2.5 md:px-5"
        style={{ borderColor: 'var(--border)', background: 'var(--panel-bg)' }}
      >
        <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    );
  }

  if (!summary) return null;

  const zero = (n: number) => (n === 0 ? { color: 'var(--text-muted)' } : { color: 'var(--text)' });

  const cards: Array<{
    action: SummaryAction;
    label: string;
    value: number;
    sub: string;
    subStyle?: React.CSSProperties;
  }> = [
    {
      action: 'owed_replies',
      label: t('Owed replies', '待回覆'),
      value: summary.owedReplies,
      sub:
        summary.owedReplies === 0
          ? t('caught up', '已回完')
          : t(`${summary.oldestOwedHours ?? 0}h waiting`, `${summary.oldestOwedHours ?? 0} 小時未回`),
      subStyle: (summary.oldestOwedHours ?? 0) >= 24 ? { color: 'var(--error)', fontWeight: 600 } : undefined,
    },
    {
      action: 'needs_you',
      label: t('Needs you', '需你批准'),
      value: summary.needsYou,
      sub: summary.needsYou === 0 ? t('nothing parked', '無待批') : t('drafts to approve', '份草稿待批'),
    },
    {
      action: 'ready_to_quote',
      label: t('Ready to quote', '可報價'),
      value: summary.readyToQuote,
      sub: moneyLabel(summary.readyValue, t, lang === 'zh' ? 'zh-TW' : 'en-US'),
    },
    {
      action: 'follow_ups',
      label: t('Follow-ups', '待跟進'),
      value: summary.followUps,
      sub:
        summary.followUps === 0
          ? t('on schedule', '如期')
          : summary.followUpsOverdue > 0
            ? t(`${summary.followUpsOverdue} overdue`, `${summary.followUpsOverdue} 項逾期`)
            : t('due to chase', '待追蹤'),
      subStyle:
        summary.followUpsOverdue > 0 ? { color: 'var(--warning)', fontWeight: 600 } : undefined,
    },
    {
      action: 'all',
      label: t('New today', '今日新訊'),
      value: summary.newToday,
      sub: t('since midnight', '自今日零時'),
    },
  ];

  const stages: Array<{ action: SummaryAction; label: string; n: number; color: string }> = [
    { action: 'needs_specs', label: t('Needs specs', '待補規格'), n: summary.needsSpecs, color: '#D97706' },
    { action: 'waiting_on_buyer', label: t('Waiting', '等買方'), n: summary.waitingOnBuyer, color: '#9CA3AF' },
    { action: 'ready_to_quote', label: t('Ready', '可報價'), n: summary.readyToQuote, color: '#059669' },
    { action: 'follow_ups', label: t('Follow-ups', '待跟進'), n: summary.followUps, color: '#334155' },
  ];
  const stageTotal = stages.reduce((sum, s) => sum + s.n, 0);

  // Collapsed keeps the same numbers on one line so the mail list gets the
  // vertical space back without the operator losing the morning brief.
  const compact: Array<{ action: SummaryAction; value: string; label: string }> = [
    { action: 'owed_replies', value: String(summary.owedReplies), label: t('owed', '待回') },
    { action: 'needs_you', value: String(summary.needsYou), label: t('need you', '需你') },
    {
      action: 'ready_to_quote',
      value: String(summary.readyToQuote),
      label:
        summary.readyValue.length === 0
          ? t('ready', '可報')
          : `${t('ready', '可報')} · ${formatMoney(summary.readyValue[0].amount, summary.readyValue[0].currency, lang === 'zh' ? 'zh-TW' : 'en-US')}`,
    },
    { action: 'follow_ups', value: String(summary.followUps), label: t('follow-ups', '跟進') },
    { action: 'all', value: String(summary.newToday), label: t('new today', '今日新訊') },
  ];

  return (
    <div
      className="flex-shrink-0 border-b"
      style={{ borderColor: 'var(--border)', background: 'var(--panel-bg)' }}
      aria-label={t('Queue summary', '工作摘要')}
    >
      <div className="px-3 pt-2.5 pb-2 md:px-5">
        <div className="flex items-start gap-2">
          {collapsed ? (
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1">
              {compact.map((chip) => (
                <button
                  key={chip.action}
                  onClick={() => onSelect(chip.action)}
                  className="flex-shrink-0 rounded-full px-2 py-1 text-[12px] transition-colors hover:bg-white"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <span className="font-bold tabular-nums" style={{ color: 'var(--text)' }}>
                    {chip.value}
                  </span>{' '}
                  {chip.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex min-w-0 flex-1 items-stretch gap-1.5 overflow-x-auto pb-0.5">
            {cards.map((c) => {
              const isActive = active === c.action && c.value > 0;
              return (
                <button
                  key={c.action}
                  onClick={() => onSelect(c.action)}
                  aria-pressed={isActive}
                  className="flex-shrink-0 rounded-[10px] border px-3 py-2 text-left transition-colors hover:bg-white"
                  style={{
                    minWidth: 128,
                    background: isActive ? '#FFFFFF' : 'transparent',
                    borderColor: isActive ? 'var(--text)' : 'var(--border)',
                  }}
                >
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.05em]" style={{ color: 'var(--text-muted)' }}>
                    {c.label}
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <span className="text-[19px] font-bold leading-none tabular-nums" style={zero(c.value)}>
                      {c.value}
                    </span>
                    <span
                      className="text-[11px] leading-none truncate"
                      style={c.subStyle || { color: 'var(--text-muted)' }}
                    >
                      {c.sub}
                    </span>
                  </div>
                </button>
              );
            })}
            </div>
          )}

          <button
            onClick={toggle}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/[0.05]"
            style={{ color: 'var(--text-muted)' }}
            title={collapsed ? t('Expand summary', '展開摘要') : t('Collapse summary', '收合摘要')}
            aria-expanded={!collapsed}
          >
            <ChevronDown
              width="15"
              height="15"
              style={{ transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform var(--dur-fast)' }}
            />
          </button>
        </div>

        {!collapsed && (
          <div className="mt-1.5 flex items-center gap-1.5">
            {stageTotal === 0 ? (
              <div className="flex items-center gap-1.5 py-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                <Sparkles width="13" height="13" />
                {t('Nothing in the queue — you are caught up.', '工作列已清空 — 目前沒有待辦。')}
              </div>
            ) : (
              stages.map((s) => {
                const isActive = active === s.action && s.n > 0;
                return (
                  <button
                    key={s.action}
                    onClick={() => onSelect(s.action)}
                    disabled={s.n === 0}
                    title={`${s.label}: ${s.n}`}
                    className="flex min-w-0 items-center gap-1.5 overflow-hidden rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors disabled:cursor-default disabled:opacity-45"
                    style={{
                      flexGrow: Math.max(s.n, 0.001),
                      flexBasis: 0,
                      background: isActive ? '#FFFFFF' : 'transparent',
                      borderColor: isActive ? s.color : 'var(--border)',
                      color: isActive ? 'var(--text)' : 'var(--text-muted)',
                    }}
                  >
                    <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: s.color }} />
                    <span className="truncate">{s.label}</span>
                    <span className="tabular-nums" style={{ color: 'var(--text)' }}>{s.n}</span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
