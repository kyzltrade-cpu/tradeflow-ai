/**
 * The summary strip above the inbox: one pass over the derived thread states
 * that answers "what needs me right now, and what is it worth".
 *
 * Exporters lose deals to silence, not to competitors, so the strip leads with
 * reply risk (owed replies + how long the oldest has waited), then approvals
 * parked on a human, then the quote-ready pipeline in money terms, then what
 * is due to chase.
 *
 * Pure on purpose — the inbox route composes it into the list payload, and it
 * is the second-highest-value thing to unit test after thread-state itself.
 */

import type { ThreadDerivation } from './thread-state';

export interface SummaryThread {
  /** Mailbox folder the conversation sits in; only `inbox` is work in progress. */
  folder: string;
  created_at: string | null;
  estimated_value: number | null;
  currency: string | null;
  next_action_due: string | null;
  hasPendingDraft: boolean;
  missing: string[];
  thread: ThreadDerivation;
}

export interface ValueTotal {
  currency: string;
  amount: number;
}

export interface InboxSummary {
  /** Threads where the buyer wrote last and we owe the reply. */
  owedReplies: number;
  /** Age of the longest-waiting owed reply, in hours. */
  oldestOwedHours: number | null;
  /** Threads with a draft parked waiting for a human. */
  needsYou: number;
  /** Threads still collecting specs (the in-progress lens). */
  needsSpecs: number;
  /** Threads where the ball is in the buyer's court. */
  waitingOnBuyer: number;
  /** Threads with everything needed to send a price. */
  readyToQuote: number;
  /** Sum of `estimated_value` on quote-ready threads, grouped by currency. */
  readyValue: ValueTotal[];
  /** Threads the buyer has gone quiet on. */
  followUps: number;
  /** Follow-ups whose `next_action_due` is already in the past. */
  followUpsOverdue: number;
  /** Conversations that arrived since local midnight. */
  newToday: number;
  /** Most frequently missing spec fields across active threads. */
  topMissing: { field: string; count: number }[];
}

const MS_PER_HOUR = 3_600_000;

function startOfLocalDay(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function parseTime(value: string | null | undefined): number {
  if (!value) return Number.NaN;
  return Date.parse(value);
}

/**
 * Bucket the same way the inbox lenses do, so a number on the strip and the
 * list you get after clicking it can never disagree:
 * - follow-ups and ready-to-quote threads have graduated out of the active set,
 * - everything else is work in progress.
 */
export function buildInboxSummary(
  threads: SummaryThread[],
  now: Date = new Date()
): InboxSummary {
  const queue = threads.filter((x) => x.folder === 'inbox');
  const active = queue.filter((x) => !x.thread.followUpDue && !x.thread.readyToQuote);

  const owed = active.filter((x) => x.thread.owedReply);
  let oldestMs = 0;
  for (const x of owed) {
    const at = parseTime(x.thread.lastInboundAt);
    if (!Number.isNaN(at)) oldestMs = Math.max(oldestMs, now.getTime() - at);
  }

  const ready = queue.filter((x) => x.thread.readyToQuote && !x.thread.followUpDue);
  const byCurrency = new Map<string, number>();
  for (const x of ready) {
    if (typeof x.estimated_value !== 'number' || !Number.isFinite(x.estimated_value)) continue;
    const currency = (x.currency || 'USD').toUpperCase();
    byCurrency.set(currency, (byCurrency.get(currency) || 0) + x.estimated_value);
  }

  const followUps = queue.filter((x) => x.thread.followUpDue);
  const todayStart = startOfLocalDay(now);

  const missingTally = new Map<string, number>();
  for (const x of active) {
    for (const raw of x.missing) {
      const field = raw.trim();
      if (!field) continue;
      missingTally.set(field, (missingTally.get(field) || 0) + 1);
    }
  }

  return {
    owedReplies: owed.length,
    oldestOwedHours: owed.length === 0 ? null : Math.max(1, Math.round(oldestMs / MS_PER_HOUR)),
    needsYou: active.filter((x) => x.thread.needsYou).length,
    needsSpecs: active.filter((x) => x.thread.needsSpecs).length,
    waitingOnBuyer: queue.filter((x) => x.thread.waitingOnBuyer && !x.thread.followUpDue).length,
    readyToQuote: ready.length,
    readyValue: [...byCurrency.entries()]
      .map(([currency, amount]) => ({ currency, amount }))
      .sort((a, b) => b.amount - a.amount),
    followUps: followUps.length,
    followUpsOverdue: followUps.filter((x) => {
      const due = parseTime(x.next_action_due);
      return !Number.isNaN(due) && due < todayStart;
    }).length,
    newToday: queue.filter((x) => {
      const created = parseTime(x.created_at);
      return !Number.isNaN(created) && created >= todayStart;
    }).length,
    topMissing: [...missingTally.entries()]
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count || a.field.localeCompare(b.field))
      .slice(0, 3),
  };
}
