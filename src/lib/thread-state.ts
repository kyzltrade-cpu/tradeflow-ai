/**
 * Derive the live state of a buyer thread from its messages. Nothing is
 * stored for this: the inbox filters are lenses over the same data, recomputed
 * on every read, so a reply from the buyer moves the thread automatically.
 *
 * This module is pure on purpose — it is the highest-value thing to unit test
 * because every filter, badge and auto-chase decision reads from it.
 */

export type ThreadState =
  | 'needs_specs'
  | 'waiting_on_buyer'
  | 'ready_to_quote'
  | 'cold'
  | 'closed';

export type ThreadFilter =
  | 'needs_specs'
  | 'waiting_on_buyer'
  | 'ready_to_quote'
  | 'follow_ups'
  | 'needs_you'
  | 'owed_replies'
  | 'all';

/** Roles that represent the buyer writing to us. */
export const INBOUND_ROLES = new Set(['user', 'customer', 'lead', 'buyer', 'contact', 'client']);

/** Roles that are neither buyer nor us; they never move the thread clock. */
const IGNORED_ROLES = new Set(['system', 'tool']);

/** Opportunity stages that mean the thread is done. */
const CLOSED_STAGES = new Set(['won', 'lost', 'expired', 'closed', 'converted', 'cancelled', 'canceled']);

/** Conversations we consider finished regardless of opportunity. */
const CLOSED_STATUSES = new Set(['closed', 'archived', 'resolved']);

/** How many unanswered outbound nudges before we stop and call it cold. */
export const COLD_AFTER_CHASES = 2;

/** Days of buyer silence before a waiting thread graduates to Follow-ups. */
export const FOLLOW_UP_AFTER_DAYS = 3;

export interface ThreadMessage {
  id?: string | null;
  role?: string | null;
  kind?: string | null;
  content?: string | null;
  subject?: string | null;
  status?: string | null;
  conversation_id?: string | null;
  created_at?: string | null;
}

export interface ThreadConversation {
  status?: string | null;
  missing_info?: unknown;
  opportunity_id?: string | null;
  next_action_due?: string | null;
  last_message_at?: string | null;
  created_at?: string | null;
}

export interface ThreadOpportunity {
  stage?: string | null;
}

export interface DeriveThreadInput {
  conversation: ThreadConversation;
  messages: ThreadMessage[];
  hasPendingDraft?: boolean;
  opportunity?: ThreadOpportunity | null;
  now?: Date;
}

export interface ThreadDerivation {
  state: ThreadState;
  label: string;
  missing: string[];
  missingCount: number;
  owedReply: boolean;
  needsYou: boolean;
  waitingOnBuyer: boolean;
  needsSpecs: boolean;
  readyToQuote: boolean;
  followUpDue: boolean;
  cold: boolean;
  paused: boolean;
  chaseCount: number;
  lastInboundAt: string | null;
  lastOutboundAt: string | null;
  lastActivityAt: string | null;
  silentDays: number;
}

const LABELS: Record<ThreadState, string> = {
  needs_specs: 'Needs specs',
  waiting_on_buyer: 'Waiting on buyer',
  ready_to_quote: 'Ready to quote',
  cold: 'Cold',
  closed: 'Closed',
};

const MS_PER_DAY = 86_400_000;

function isInbound(role: string | null | undefined): boolean {
  return !!role && INBOUND_ROLES.has(role.toLowerCase());
}

function isIgnored(role: string | null | undefined): boolean {
  return !!role && IGNORED_ROLES.has(role.toLowerCase());
}

function toTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

function latest(values: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  let bestT = -Infinity;
  for (const v of values) {
    const t = toTime(v);
    if (t !== null && t >= bestT) {
      bestT = t;
      best = v ?? null;
    }
  }
  return best;
}

/** `missing_info` may be an array, a JSON string, or a comma list. */
export function normalizeMissing(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>;
          const label = o.label ?? o.fieldName ?? o.name ?? o.field;
          return typeof label === 'string' ? label : '';
        }
        return '';
      })
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return [];
    try {
      return normalizeMissing(JSON.parse(s));
    } catch {
      return s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function deriveThread(input: DeriveThreadInput): ThreadDerivation {
  const { conversation, messages } = input;
  const now = input.now ?? new Date();
  const nowMs = now.getTime();

  const ordered = [...messages].sort((a, b) => {
    const ta = toTime(a.created_at);
    const tb = toTime(b.created_at);
    if (ta === null || tb === null) return 0;
    return ta - tb;
  });

  const relevant = ordered.filter((m) => !isIgnored(m.role));

  let lastInboundAt: string | null = null;
  let lastOutboundAt: string | null = null;
  let lastInboundIdx = -1;
  let lastOutboundIdx = -1;

  relevant.forEach((m, idx) => {
    if (isInbound(m.role)) {
      lastInboundAt = latest([lastInboundAt, m.created_at]);
      lastInboundIdx = idx;
    } else {
      lastOutboundAt = latest([lastOutboundAt, m.created_at]);
      lastOutboundIdx = idx;
    }
  });

  // Outbound messages sent after the buyer's most recent message are unanswered
  // nudges. Count them to decide when a thread has gone cold.
  let chaseCount = 0;
  relevant.forEach((m, idx) => {
    if (!isInbound(m.role) && idx > lastInboundIdx) chaseCount += 1;
  });

  const lastActivityAt = latest([
    lastInboundAt,
    lastOutboundAt,
    conversation.last_message_at,
    conversation.created_at,
  ]);

  const lastMessageInbound = lastInboundIdx > lastOutboundIdx;
  const missing = normalizeMissing(conversation.missing_info);
  const oppStage = input.opportunity?.stage?.toLowerCase() ?? null;
  const closed =
    (oppStage !== null && CLOSED_STAGES.has(oppStage)) ||
    (!!conversation.status && CLOSED_STATUSES.has(conversation.status.toLowerCase()));

  const cold = !closed && chaseCount >= COLD_AFTER_CHASES && !lastMessageInbound;
  const paused = conversation.status?.toLowerCase() === 'ai_paused';

  let state: ThreadState;
  if (closed) {
    state = 'closed';
  } else if (cold) {
    state = 'cold';
  } else if (missing.length > 0) {
    state = lastMessageInbound ? 'needs_specs' : 'waiting_on_buyer';
  } else {
    state = 'ready_to_quote';
  }

  const silentAnchor = lastInboundAt ?? lastActivityAt;
  const anchorMs = toTime(silentAnchor);
  const silentDays = anchorMs === null ? 0 : Math.max(0, Math.floor((nowMs - anchorMs) / MS_PER_DAY));

  const waitingOnBuyer = !closed && !cold && !lastMessageInbound && lastOutboundIdx >= 0;

  // A thread graduates out of the inbox into Follow-ups once the buyer has
  // gone quiet for FOLLOW_UP_AFTER_DAYS. Cold threads (chased twice with no
  // answer) belong there too — they are the deepest end of the same silence.
  // Threads whose specs are already complete belong to Opportunities instead,
  // so they are never "follow-up due" here; the situated buckets stay
  // mutually exclusive (needs specs / follow-ups / opportunities).
  const followUpDue =
    !closed &&
    state !== 'ready_to_quote' &&
    (cold || (waitingOnBuyer && silentDays >= FOLLOW_UP_AFTER_DAYS));

  return {
    state,
    label: LABELS[state],
    missing,
    missingCount: missing.length,
    owedReply: !closed && lastMessageInbound,
    needsYou: !!input.hasPendingDraft,
    waitingOnBuyer,
    needsSpecs: !closed && !cold && missing.length > 0,
    readyToQuote: state === 'ready_to_quote',
    followUpDue,
    cold,
    paused,
    chaseCount,
    lastInboundAt,
    lastOutboundAt,
    lastActivityAt,
    silentDays,
  };
}

export function matchesFilter(d: ThreadDerivation, filter: ThreadFilter): boolean {
  switch (filter) {
    case 'needs_specs':
      return d.needsSpecs;
    case 'waiting_on_buyer':
      return d.waitingOnBuyer;
    case 'ready_to_quote':
      return d.readyToQuote;
    case 'follow_ups':
      return d.followUpDue;
    case 'needs_you':
      return d.needsYou;
    case 'owed_replies':
      return d.owedReply;
    case 'all':
    default:
      return true;
  }
}
