'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  RefreshCw, Reply, CheckCircle2, AlertTriangle, Clock, Send,
  ArrowUpRight, Inbox, Mail, Trophy, ChevronRight, ChevronDown,
} from 'lucide-react';
import { useLang } from '@/lib/lang';
import { buildTemplateDraft, type DraftContext } from '@/lib/queue-draft-template';
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

type DisplayKey = 'you_owe' | 'they_owe';

interface DisplaySection {
  key: DisplayKey;
  items: QueueItem[];
}

const SECTION_META: Record<DisplayKey, GroupMeta> = {
  you_owe: {
    icon: CheckCircle2,
    color: '#18181B',
    label: { en: 'You owe them', zh: '你欠對方' },
    hint: {
      en: 'Replies to send & drafts to approve — oldest first',
      zh: '待回覆與待審批草稿 — 最舊的排在最前',
    },
  },
  they_owe: {
    icon: Clock,
    color: '#71717A',
    label: { en: 'They owe you', zh: '對方欠你' },
    hint: { en: 'Sent and waiting on the customer', zh: '已寄出，等客戶回覆' },
  },
};

const FILTER_SPECS: Array<{ key: 'all' | DisplayKey; label: { en: string; zh: string } }> = [
  { key: 'all', label: { en: 'All', zh: '全部' } },
  { key: 'you_owe', label: { en: 'You owe them', zh: '你欠對方' } },
  { key: 'they_owe', label: { en: 'They owe you', zh: '對方欠你' } },
];

type FilterKey = (typeof FILTER_SPECS)[number]['key'];

// Presentation-only regroup of the fixed API groups into "who owes who". The
// wire contract in queue-status.ts is unchanged.
function buildSections(groups: QueueGroup[]): DisplaySection[] {
  const itemsOf = (key: QueueGroupKey) => groups.find((g) => g.key === key)?.items ?? [];

  // Everything needing action from me: inbound messages to reply to plus
  // AI-prepared drafts awaiting approval. Oldest first so nothing goes stale.
  const youOwe = [...itemsOf('needs_approval'), ...itemsOf('you_owe')].sort(
    (a, b) => (a.time ?? '9999').localeCompare(b.time ?? '9999'),
  );

  return [
    { key: 'you_owe', items: youOwe },
    { key: 'they_owe', items: itemsOf('they_owe') },
  ];
}

const PRIORITY_TONE: Record<string, { label: { en: string; zh: string }; color: string; bg: string }> = {
  high: { label: { en: 'High priority', zh: '高優先' }, color: '#B54708', bg: '#FFFAEB' },
  urgent: { label: { en: 'Urgent', zh: '緊急' }, color: '#B42318', bg: '#FEF3F2' },
};

// Opportunity stages are stored inconsistently cased across seeded and
// production rows (NEW, rfq_sent, sourcing), so normalise before labelling.
const STAGE_LABELS: Record<string, { en: string; zh: string }> = {
  NEW: { en: 'New lead', zh: '新客戶' },
  QUALIFIED: { en: 'Qualified', zh: '需求已確認' },
  RFQ_SENT: { en: 'Quote sent', zh: '報價已發出' },
  SOURCING: { en: 'Fetching specs', zh: '抓取規格中' },
  PENDING_APPROVAL: { en: 'Pending approval', zh: '待審批' },
  SENT: { en: 'Sent', zh: '已發出' },
  NEGOTIATING: { en: 'Negotiating', zh: '議價中' },
  WON: { en: 'Won', zh: '已成交' },
  LOST: { en: 'Lost', zh: '已流失' },
  EXPIRED: { en: 'Expired', zh: '已過期' },
  NEGATIVE_FEEDBACK: { en: 'Negative feedback', zh: '負面回饋' },
};

function stageLabel(stage: string | null | undefined): { en: string; zh: string } | null {
  if (!stage) return null;
  const known = STAGE_LABELS[stage.toUpperCase()];
  if (known) return known;
  const flat = stage.replace(/_/g, ' ').toLowerCase();
  return { en: flat, zh: flat };
}

function formatMoney(value: number | null | undefined, currency: string | null | undefined): string | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const opts: Intl.NumberFormatOptions = { minimumFractionDigits: 0, maximumFractionDigits: 2 };
  return `${currency || 'USD'} ${new Intl.NumberFormat('en-US', opts).format(n)}`;
}

function formatDueDate(raw: string | null | undefined): { en: string; zh: string } | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  const overdue = d.getTime() < Date.now();
  return { en: `${iso}${overdue ? ' · overdue' : ''}`, zh: `${iso}${overdue ? ' · 已逾期' : ''}` };
}

/** Renders a value, or a muted em-dash so every row shows the same field set. */
function Fact({ label, value }: { label: { en: string; zh: string }; value: string | null | undefined }) {
  const { t } = useLang();
  const known = !!value;
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-medium uppercase tracking-[0.04em]" style={{ color: 'var(--text-muted)' }}>
        {t(label.en, label.zh)}
      </dt>
      <dd
        className={`text-[12.5px] font-medium truncate ${known ? '' : 'italic'}`}
        style={{ color: known ? 'var(--text)' : 'var(--text-muted)' }}
        title={known ? (value as string) : undefined}
      >
        {known ? value : '—'}
      </dd>
    </div>
  );
}

/**
 * Builds the template context client-side from what the queue already returns,
 * so a draft is on screen the instant a row opens — no network, no model wait.
 * The AI draft then replaces it in the background if one is available.
 */
function contextFromItem(item: QueueItem): DraftContext {
  const d = item.detail;
  const kind: DraftContext['kind'] = item.id.startsWith('quote-')
    ? 'quote'
    : item.id.startsWith('fu-')
      ? 'followup'
      : 'reply';
  const currency = d?.currency ?? item.quoteCurrency ?? null;

  return {
    kind,
    sender: item.sender ?? null,
    subject: item.subject ?? null,
    company: d?.company ?? null,
    industry: d?.industry ?? null,
    country: d?.country ?? null,
    stage: d?.stage ?? null,
    nextStep: d?.nextAction ?? null,
    request: d?.whatTheyWant ?? null,
    total: formatMoney(d?.value, currency),
    lines: (d?.lineItems ?? []).map(
      (li) => `- ${li.product} x${li.quantity ?? '?'}${li.unit ? ` ${li.unit}` : ''} = ${formatMoney(li.total, currency) ?? '—'}`
    ),
    missing: d?.missingInfo ?? [],
  };
}

function DraftEditor({ item }: { item: QueueItem }) {
  const { t } = useLang();
  // item.id already carries its type prefix (quote-/conv-/fu-), which is also
  // the queue_drafts key, so it is the canonical id for both fetch and cache.
  const rowKey = item.id;
  const localKey = `queue-draft:${rowKey}`;

  // Seed with the template synchronously: the box is never empty, and the row
  // never appears broken while a 30s model call is in flight.
  const [body, setBody] = useState<string>(() => buildTemplateDraft(contextFromItem(item)));
  const [source, setSource] = useState<'ai' | 'template' | 'human' | 'drafting'>('drafting');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set the moment a human types, so a late-arriving AI draft can never
  // overwrite their words.
  const dirty = useRef(false);

  const persist = (next: string) => {
    fetch('/api/admin/queue/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: rowKey, body: next }),
    }).catch(() => {
      // The local copy below is the safety net; the server is best-effort.
    });
  };

  // Upgrade the seeded template to a real AI draft, without blocking the row.
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // A human edit from a previous session wins over anything we generate.
      try {
        const cached = window.localStorage.getItem(localKey);
        if (cached && !cancelled) {
          dirty.current = true;
          setBody(cached);
          setSource('human');
          return;
        }
      } catch {
        // localStorage unavailable (private mode) — continue.
      }

      try {
        const res = await fetch(`/api/admin/queue/draft?itemId=${encodeURIComponent(rowKey)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.draft?.body && !dirty.current && !cancelled) {
            setBody(json.draft.body);
            setSource(json.draft.source ?? 'ai');
            return;
          }
        }
      } catch {
        // Fall through to generating.
      }

      try {
        const res = await fetch('/api/admin/queue/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: rowKey }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (res.ok && json.draft?.body) {
          if (dirty.current) return;
          setBody(json.draft.body);
          setSource(json.draft.source ?? 'ai');
          if (json.draft.source === 'template') {
            setNotice(t('The AI is slow right now — this is a sample draft. Press Regenerate to retry.', 'AI 目前較慢，這是範本草稿。按「重新產生」重試。'));
          }
        } else {
          setSource('template');
          setNotice(json.error || t('Could not reach the AI. This is a sample draft.', '無法連線至 AI。這是範本草稿。'));
        }
      } catch {
        if (cancelled) return;
        setSource('template');
        setNotice(t('Could not reach the AI. This is a sample draft.', '無法連線至 AI。這是範本草稿。'));
      }
    };

    void run();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowKey]);

  // Debounced persist. The local write is immediate so a refresh mid-typing
  // never loses the edit even when the server has no draft table.
  const onChange = (next: string) => {
    dirty.current = true;
    setBody(next);
    setSource('human');
    setNotice(null);
    try {
      window.localStorage.setItem(localKey, next);
    } catch {
      // Non-fatal: the server copy is still attempted below.
    }
    if (timer.current) clearTimeout(timer.current);
    setSaving(true);
    timer.current = setTimeout(() => {
      persist(next);
      setSaving(false);
    }, 800);
  };

  const regenerate = async () => {
    setNotice(null);
    setSource('drafting');
    // Keep the current text on screen while the model works.
    const previous = body;
    try {
      const res = await fetch('/api/admin/queue/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: rowKey, regenerate: true }),
      });
      const json = await res.json();
      if (res.ok && json.draft?.body) {
        dirty.current = false;
        setBody(json.draft.body);
        setSource(json.draft.source ?? 'ai');
        try {
          window.localStorage.removeItem(localKey);
        } catch {
          // Non-fatal.
        }
      } else {
        setSource('human');
        setNotice(json.error || t('Could not draft this email', '無法產生草稿'));
      }
    } catch {
      setSource('human');
      setBody(previous);
      setNotice(t('Could not reach the AI. Check your connection and try again.', '無法連線至 AI，請檢查網絡後再試。'));
    }
  };

  // ── Can this deployment send at all? ───────────────────────────────────
  // Resolved once per page rather than per row: it is a property of the
  // deployment, not of the item. A Send button that always fails is worse than
  // a disabled one that says why.
  const [mailOk, setMailOk] = useState<{ configured: boolean; fix: string | null } | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/email-status')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j) setMailOk({ configured: Boolean(j.configured), fix: j.fix ?? null });
      })
      .catch(() => {
        // Unknown is treated as "let them try" — a failed preflight should not
        // block a send that would actually work.
        if (!cancelled) setMailOk({ configured: true, fix: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Send the exact text on screen ──────────────────────────────────────
  // Each row type already has a hardened send route (approval gate, pricing
  // gate, PDF attachment for quotes); the queue's job is to hand the reviewed
  // text to the right one. Quotes are deliberately excluded — a quote only
  // goes out from its own page, where the approval gate and line items are
  // visible, so this button must never become a way around that.
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [sendError, setSendError] = useState<string | null>(null);
  const isQuote = item.id.startsWith('quote-');
  const recipient = item.detail?.recipientEmail ?? null;
  const mailBlocked = mailOk !== null && !mailOk.configured;
  const canSend = Boolean(recipient) && !isQuote && body.trim().length > 0 && !mailBlocked;
  const blockedReason = !recipient
    ? t('No contact email on this row', '此列沒有聯絡電郵')
    : mailBlocked
      ? mailOk?.fix || t('No sending address is configured.', '尚未設定發送地址。')
      : null;

  const send = async () => {
    if (!canSend || sendState === 'sending') return;
    setSendState('sending');
    setSendError(null);
    try {
      let res: Response;
      if (item.id.startsWith('fu-')) {
        const itemId = rowKey.slice('fu-'.length);
        if (!item.sequenceId) throw new Error('This follow-up is not linked to a sequence.');
        res = await fetch(`/api/admin/follow-ups/${item.sequenceId}/items/${itemId}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body, subject: item.subject ?? undefined }),
        });
      } else {
        res = await fetch(`/api/admin/inbox/${rowKey.slice('conv-'.length)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: body, kind: 'reply' }),
        });
      }

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || t('Could not send', '無法發送'));

      setSendState('sent');
      setSource('human');
      try {
        window.localStorage.removeItem(localKey);
      } catch {
        // Non-fatal.
      }
      // The row has left the queue (no longer "you owe them"), so a refresh
      // pulls the new state rather than leaving a ghost row behind.
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setSendState('error');
      setSendError(err instanceof Error ? err.message : t('Could not send', '無法發送'));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.04em]" style={{ color: 'var(--text-muted)' }}>
          {t('Email draft', '郵件草稿')}
        </p>
        <div className="flex items-center gap-2">
          {saving ? (
            <span className="text-[10.5px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {t('Saving…', '儲存中…')}
            </span>
          ) : (
            <span
              className="text-[10.5px] font-medium px-1.5 py-0.5 rounded"
              style={
                source === 'ai'
                  ? { color: '#027A48', background: '#ECFDF3' }
                  : source === 'human'
                    ? { color: 'var(--text-muted)', background: 'var(--surface)' }
                    : { color: '#B54708', background: '#FFFAEB' }
              }
            >
              {source === 'ai'
                ? t('AI draft', 'AI 草稿')
                : source === 'human'
                  ? t('Edited', '已編輯')
                  : source === 'drafting'
                    ? t('Writing…', '撰寫中…')
                    : t('Sample', '範本')}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void regenerate();
            }}
            className="text-[11px] font-medium hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            {source === 'template' ? t('Retry AI', '重試 AI') : t('Regenerate', '重新產生')}
          </button>
        </div>
      </div>

      <textarea
        value={body}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        rows={8}
        spellCheck={false}
        className="w-full rounded-lg px-3 py-2.5 text-[12.5px] leading-relaxed resize-y focus:outline-none"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'inherit' }}
      />

      {notice && (
        <p className="text-[11px] mt-1" style={{ color: '#B54708' }}>
          {notice}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 mt-2">
        <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
          {isQuote
            ? t('Quotes send from the quote page, where the approval gate applies.', '報價於報價頁面發送，並經審批。')
            : recipient
              ? `${t('To', '收件人')}: ${recipient}`
              : t('No contact email on this row', '此列沒有聯絡電郵')}
        </p>

        {isQuote ? (
          <a
            href={item.href}
            onClick={(e) => e.stopPropagation()}
            className="text-[11px] font-medium whitespace-nowrap hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            {t('Open quote to send', '開啟報價以發送')}
          </a>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void send();
            }}
            disabled={!canSend || sendState === 'sending' || sendState === 'sent'}
            className="text-[11px] font-medium whitespace-nowrap disabled:opacity-40"
            style={{ color: 'var(--accent)' }}
          >
            {sendState === 'sending'
              ? t('Sending…', '發送中…')
              : sendState === 'sent'
                ? t('Sent', '已發送')
                : t('Send draft', '發送草稿')}
          </button>
        )}
      </div>

      {blockedReason && (
        <p className="text-[11px] mt-1" style={{ color: '#B54708' }}>
          {blockedReason}
        </p>
      )}

      {sendError && (
        <p className="text-[11px] mt-1" style={{ color: '#B54708' }}>
          {sendError}
        </p>
      )}
    </div>
  );
}

/**
 * The approval context panel. Every row gets the identical set of fields and
 * the identical order, whether it is a reply, a quote or a follow-up — a
 * reviewer should never have to learn a new layout per row type. Missing data
 * renders as an em-dash rather than collapsing the field.
 */
function DetailPanel({ item }: { item: QueueItem }) {
  const { t } = useLang();
  const d = item.detail;
  if (!d) return null;

  const stage = stageLabel(d.stage);
  const total = formatMoney(d.value, d.currency);
  const due = formatDueDate(d.nextActionDue);
  const lines = d.lineItems ?? [];

  return (
    <div className="px-4 md:px-6 pb-4 -mt-1" onClick={(e) => e.stopPropagation()}>
      <div
        className="rounded-xl p-3 md:p-4 space-y-4"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
      >
        <DraftEditor item={item} />

        {/* The five facts a reviewer always needs, in the same order every time. */}
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2.5">
          <Fact label={{ en: 'Company', zh: '公司' }} value={d.company} />
          <Fact label={{ en: 'Industry', zh: '行業' }} value={d.industry} />
          <Fact label={{ en: 'Stage', zh: '階段' }} value={stage ? t(stage.en, stage.zh) : null} />
          <Fact label={{ en: 'Country', zh: '地區' }} value={d.country} />
          <Fact label={{ en: 'Next step', zh: '下一步' }} value={d.nextAction} />
          <Fact label={{ en: 'Value', zh: '金額' }} value={total} />
          <Fact label={{ en: 'Contact', zh: '聯絡人' }} value={d.contactTitle} />
          <Fact label={{ en: 'Due', zh: '到期' }} value={due ? t(due.en, due.zh) : null} />
          <Fact
            label={{ en: 'Last message', zh: '最新訊息' }}
            value={d.lastMessageAt ? formatTimeAgo(d.lastMessageAt) : null}
          />
        </dl>

        <div>
          <p className="text-[10.5px] font-medium uppercase tracking-[0.04em] mb-1" style={{ color: 'var(--text-muted)' }}>
            {t('What they asked for', '客戶要求')}
          </p>
          <p className="text-[12.5px] leading-relaxed" style={{ color: d.whatTheyWant ? 'var(--text)' : 'var(--text-muted)' }}>
            {d.whatTheyWant || '—'}
          </p>
        </div>

        {d.missingInfo && d.missingInfo.length > 0 && (
          <div className="rounded-lg px-2.5 py-2" style={{ background: '#FFFAEB' }}>
            <p className="text-[11px] font-semibold mb-0.5" style={{ color: '#B54708' }}>
              {t('Specs still missing', '仍缺少規格')}
            </p>
            <p className="text-[11.5px] leading-relaxed" style={{ color: '#7A4A0B' }}>
              {d.missingInfo.join(' · ')}
            </p>
          </div>
        )}

        <div>
          <p className="text-[10.5px] font-medium uppercase tracking-[0.04em] mb-1.5" style={{ color: 'var(--text-muted)' }}>
            {t('Quoted items', '報價項目')}
          </p>
          {lines.length === 0 ? (
            <p className="text-[12px] italic" style={{ color: 'var(--text-muted)' }}>
              {t('No quote on this item', '此項目沒有報價')}
            </p>
          ) : (
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              <table className="w-full text-[11.5px]">
                <thead>
                  <tr style={{ background: 'var(--surface)' }}>
                    <th className="text-left font-medium px-2.5 py-1.5" style={{ color: 'var(--text-muted)' }}>
                      {t('Item', '項目')}
                    </th>
                    <th className="text-right font-medium px-2 py-1.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {t('Qty', '數量')}
                    </th>
                    <th className="text-right font-medium px-2 py-1.5 whitespace-nowrap hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>
                      {t('Unit', '單價')}
                    </th>
                    <th className="text-right font-medium px-2.5 py-1.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {t('Amount', '金額')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((li, idx) => (
                    <tr key={`${li.product}-${idx}`} style={{ borderTop: '1px solid var(--border)' }}>
                      <td className="px-2.5 py-1.5 min-w-0">
                        <div className="font-medium truncate" style={{ color: 'var(--text)' }}>{li.product}</div>
                        {li.description && (
                          <div className="truncate" style={{ color: 'var(--text-muted)' }}>{li.description}</div>
                        )}
                      </td>
                      <td className="text-right px-2 py-1.5 tabular-nums whitespace-nowrap" style={{ color: 'var(--text)' }}>
                        {li.quantity ?? '—'}{li.unit ? ` ${li.unit}` : ''}
                      </td>
                      <td className="text-right px-2 py-1.5 tabular-nums whitespace-nowrap hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>
                        {formatMoney(li.unitPrice, d.currency) ?? '—'}
                      </td>
                      <td className="text-right px-2.5 py-1.5 tabular-nums whitespace-nowrap font-medium" style={{ color: 'var(--text)' }}>
                        {formatMoney(li.total, d.currency) ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <td className="px-2.5 py-1.5 font-semibold" style={{ color: 'var(--text)' }} colSpan={3}>
                      {t('Total', '合計')}
                    </td>
                    <td className="text-right px-2.5 py-1.5 tabular-nums font-semibold whitespace-nowrap" style={{ color: 'var(--text)' }}>
                      {total ?? '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          {d.marginPct != null && (
            <p className="text-[11px] mt-1 tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {t('Margin', '毛利')} {d.marginPct}%
            </p>
          )}
        </div>

        <Link
          href={item.href}
          className="inline-flex items-center gap-1 text-[12px] font-medium hover:underline"
          style={{ color: 'var(--accent)' }}
        >
          {item.kind === 'reply'
            ? t('Open thread', '開啟對話')
            : t('Open record', '開啟記錄')}
          <ArrowUpRight width="12" height="12" />
        </Link>
      </div>
    </div>
  );
}

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
    case 'you_owe':
      return { en: 'Nothing waiting on you.', zh: '沒有需要你處理的項目。' };
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
  // Expanded approval-context rows, keyed by `${kind}-${id}`.
  const [openRows, setOpenRows] = useState<Set<string>>(() => new Set());

  const toggleRow = useCallback((key: string) => {
    setOpenRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

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
                    const rowKey = `${item.kind}-${item.id}`;
                    const open = openRows.has(rowKey);
                    return (
                      <div
                        key={rowKey}
                        className="w-full border-b last:border-b-0 transition-colors hover:bg-black/[0.02]"
                        style={{ borderColor: 'var(--border)', background: open ? 'var(--surface)' : undefined }}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          aria-expanded={item.detail ? open : undefined}
                          onClick={() => item.detail && toggleRow(rowKey)}
                          onKeyDown={(e) => {
                            if (!item.detail) return;
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleRow(rowKey);
                            }
                          }}
                          className={`grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(200px,240px)_1fr_auto_auto] items-center gap-2 md:gap-4 px-4 md:px-6 py-3 ${item.detail ? 'cursor-pointer' : ''}`}
                        >
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
                          <div className="col-start-2 row-start-1 md:col-start-4 self-center flex items-center gap-1.5">
                            <PrimaryActionButton item={item} action={action} />
                            {item.detail && (
                              <ChevronDown
                                width="15"
                                height="15"
                                aria-hidden="true"
                                className="transition-transform flex-shrink-0"
                                style={{
                                  color: 'var(--text-muted)',
                                  transform: open ? 'rotate(180deg)' : undefined,
                                }}
                              />
                            )}
                          </div>
                        </div>
                        {open && <DetailPanel item={item} />}
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
      onClick={(e) => e.stopPropagation()}
      className="glass-press flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold text-white whitespace-nowrap transition-opacity hover:opacity-90"
      style={{ background: bg }}
    >
      <Icon width="13" height="13" />
      <span>{t(action.label.en, action.label.zh)}</span>
      <ArrowUpRight width="12" height="12" className="opacity-70" />
    </Link>
  );
}