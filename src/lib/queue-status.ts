/**
 * Pure Queue derivation.
 *
 * Turns the company's working data into the fixed groups shown at
 * /admin (the authenticated home). Every row has exactly ONE primary action.
 * No side effects here — the API layer gathers data, this pure module
 * classifies it, tests pin the rules down.
 */

export type QueueGroupKey = 'you_owe' | 'needs_approval' | 'they_owe';

export const QUEUE_GROUPS: QueueGroupKey[] = [
  'you_owe',
  'needs_approval',
  'they_owe',
];

export const QUEUE_GROUP_LABELS: Record<QueueGroupKey, { en: string; zh: string }> = {
  you_owe: { en: 'You owe them', zh: '你欠回复' },
  needs_approval: { en: 'Needs approval', zh: '待审批' },
  they_owe: { en: 'They owe you', zh: '等客户回复' },
};

export type PrimaryAction = 'reply' | 'approve' | 're-approve' | 'send-followup' | 'wait';

export type QueueItem = {
  id: string;
  kind: 'reply' | 'draft_ready' | 'approval' | 'reapproval' | 'awaiting_customer' | 'followup';
  group: QueueGroupKey;
  title: string;
  sender?: string | null;
  subject?: string | null;
  quoteNumber?: string | null;
  quoteCurrency?: string | null;
  amount?: number | null;
  primaryAction: PrimaryAction;
  href: string;
  time: string | null;
  meta?: Record<string, unknown>;
};

export type QueueGroup = {
  key: QueueGroupKey;
  count: number;
  items: QueueItem[];
};

// ---------------------------------------------------------------------------
// Input shapes (what the API layer passes in)
// ---------------------------------------------------------------------------

export type ConversationInput = {
  id: string;
  customer?: string | null;
  subject?: string | null;
  needs_reply?: boolean | null;
  waiting_on?: boolean | null;
  last_activity_at?: string | null;
  unread?: boolean | null;
};

export type QuoteInput = {
  id: string;
  quote_number?: string | null;
  customer_name?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  status?: string | null;
  currency?: string | null;
  total_amount?: number | null;
  current_version?: number | null;
  approval_version?: number | null;
  sent_at?: string | null;
  customer_replied_at?: string | null;
  accepted_at?: string | null;
  rejected_at?: string | null;
  overdue_for_review?: boolean | null;
  has_gate_issues?: boolean | null;
  updated_at?: string | null;
};

export type FollowUpInput = {
  id: string;
  subject?: string | null;
  opportunity?: string | null;
  scheduledFor?: string | null;
};

export type QueueDataInput = {
  conversations: ConversationInput[];
  quotes: QuoteInput[];
  followUps: FollowUpInput[];
};

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

export function daysAgo(iso: string | null | undefined): number {
  if (!iso) return 0;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

export function deriveQueueGroups(input: QueueDataInput): QueueGroup[] {
  const youOwe: QueueItem[] = [];
  const needsApproval: QueueItem[] = [];
  const theyOwe: QueueItem[] = [];

  // ── You owe them: un-replied conversations (customer wrote) ─────────────
  for (const c of input.conversations) {
    if (c.needs_reply) {
      youOwe.push({
        id: `conv-${c.id}`,
        kind: 'reply',
        group: 'you_owe',
        title: `${c.customer ?? 'Customer'} wrote in`,
        sender: c.customer ?? null,
        subject: c.subject ?? null,
        primaryAction: 'reply',
        href: `/admin/inbox/${c.id}`,
        time: c.last_activity_at ?? null,
        meta: { unread: !!c.unread },
      });
    }
  }

  // ── You owe them: completed DRAFT quotes awaiting approval request ──────
  for (const q of input.quotes) {
    if (q.status === 'DRAFT' && !q.overdue_for_review) {
      youOwe.push({
        id: `quote-${q.id}`,
        kind: 'draft_ready',
        group: 'you_owe',
        title: `Quote ${q.quote_number ?? q.id.slice(0, 8)} ready to review`,
        sender: q.contact_name ?? q.customer_name ?? q.contact_email ?? null,
        quoteNumber: q.quote_number ?? null,
        quoteCurrency: q.currency ?? null,
        amount: q.total_amount ?? null,
        primaryAction: 'approve',
        href: `/admin/quotes/${q.id}`,
        time: q.updated_at ?? null,
      });
    }
  }

  // ── Needs approval: IN_REVIEW quotes + APPROVED quotes with gate issues ──
  for (const q of input.quotes) {
    if (q.status === 'IN_REVIEW') {
      needsApproval.push({
        id: `quote-${q.id}`,
        kind: 'approval',
        group: 'needs_approval',
        title: `Quote ${q.quote_number ?? q.id.slice(0, 8)} awaits approval`,
        sender: q.contact_name ?? q.customer_name ?? q.contact_email ?? null,
        quoteNumber: q.quote_number ?? null,
        quoteCurrency: q.currency ?? null,
        amount: q.total_amount ?? null,
        primaryAction: 'approve',
        href: `/admin/quotes/${q.id}`,
        time: q.updated_at ?? null,
      });
    } else if (q.status === 'APPROVED' && q.has_gate_issues) {
      needsApproval.push({
        id: `quote-${q.id}`,
        kind: 'reapproval',
        group: 'needs_approval',
        title: `Quote ${q.quote_number ?? q.id.slice(0, 8)} needs a re-approval`,
        sender: q.contact_name ?? q.customer_name ?? q.contact_email ?? null,
        quoteNumber: q.quote_number ?? null,
        quoteCurrency: q.currency ?? null,
        amount: q.total_amount ?? null,
        primaryAction: 're-approve',
        href: `/admin/quotes/${q.id}`,
        time: q.updated_at ?? null,
      });
    }
  }

  // ── They owe you: sent quotes awaiting customer reply + due follow-ups ──
  for (const q of input.quotes) {
    if (q.status === 'SENT' && !q.customer_replied_at && !q.accepted_at && !q.rejected_at) {
      theyOwe.push({
        id: `quote-${q.id}`,
        kind: 'awaiting_customer',
        group: 'they_owe',
        title: `Quote ${q.quote_number ?? q.id.slice(0, 8)} awaiting customer`,
        sender: q.contact_name ?? q.customer_name ?? q.contact_email ?? null,
        quoteNumber: q.quote_number ?? null,
        quoteCurrency: q.currency ?? null,
        amount: q.total_amount ?? null,
        primaryAction: 'wait',
        href: `/admin/quotes/${q.id}`,
        time: q.sent_at ?? q.updated_at ?? null,
        meta: { days_since_sent: daysAgo(q.sent_at) },
      });
    }
  }

  for (const f of input.followUps) {
    theyOwe.push({
      id: `fu-${f.id}`,
      kind: 'followup',
      group: 'they_owe',
      title: `Send follow-up${f.opportunity ? ` on ${f.opportunity}` : ''}`,
      subject: f.subject ?? null,
      primaryAction: 'send-followup',
      href: `/admin/follow-ups`,
      time: f.scheduledFor ?? null,
    });
  }

  const groups: Array<[QueueGroupKey, QueueItem[]]> = [
    ['you_owe', youOwe],
    ['needs_approval', needsApproval],
    ['they_owe', theyOwe],
  ];

  return groups.map(([key, items]) => ({
    key,
    count: items.length,
    items: items.sort((a, b) => (b.time ?? '').localeCompare(a.time ?? '')),
  }));
}