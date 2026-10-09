import { buildInboxSummary, type SummaryThread } from '@/lib/inbox-summary';
import { deriveThread, type ThreadMessage, type ThreadConversation } from '@/lib/thread-state';

const now = new Date(2026, 9, 10, 12, 0, 0); // local noon, 10 Oct 2026
const MS_PER_HOUR = 3_600_000;

const iso = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * MS_PER_HOUR).toISOString();

const inbound = (at: string): ThreadMessage => ({ role: 'customer', kind: 'received', created_at: at });
const outbound = (at: string): ThreadMessage => ({ role: 'assistant', kind: 'sent', created_at: at });

const yesterdayNine = () => new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 9, 0, 0);

interface MakeOptions {
  folder?: string;
  messages: ThreadMessage[];
  conversation?: ThreadConversation;
  hasPendingDraft?: boolean;
  estimated_value?: number | null;
  currency?: string | null;
  next_action_due?: string | null;
}

function makeThread({ folder = 'inbox', messages, conversation = {}, hasPendingDraft, ...rest }: MakeOptions): SummaryThread {
  const thread = deriveThread({
    now,
    conversation: {
      status: 'active',
      created_at: messages[0]?.created_at ?? null,
      ...conversation,
    },
    messages,
    hasPendingDraft,
  });
  return {
    folder,
    created_at: messages[0]?.created_at ?? null,
    estimated_value: null,
    currency: null,
    next_action_due: null,
    hasPendingDraft: !!hasPendingDraft,
    missing: thread.missing,
    thread,
    ...rest,
  };
}

const owedThread = (hoursAgo: number) =>
  makeThread({
    messages: [inbound(iso(hoursAgo))],
    conversation: { missing_info: ['Quantity'] },
  });

describe('buildInboxSummary', () => {
  it('summarises the inbox queue and ignores archived or trashed threads', () => {
    const summary = buildInboxSummary(
      [
        owedThread(1),
        owedThread(2),
        owedThread(3),
        makeThread({ folder: 'archive', messages: [inbound(iso(4))], conversation: { missing_info: ['Quantity'] } }),
        makeThread({ folder: 'trash', messages: [inbound(iso(5))], conversation: { missing_info: ['Quantity'] } }),
      ],
      now
    );
    expect(summary.owedReplies).toBe(3);
  });

  it('reports how long the longest-waiting owed reply has been silent', () => {
    const summary = buildInboxSummary([owedThread(5), owedThread(30)], now);
    expect(summary.oldestOwedHours).toBe(30);
  });

  it('returns a null wait and zero counts on an empty queue', () => {
    const summary = buildInboxSummary([], now);
    expect(summary).toEqual({
      owedReplies: 0,
      oldestOwedHours: null,
      needsYou: 0,
      needsSpecs: 0,
      waitingOnBuyer: 0,
      readyToQuote: 0,
      readyValue: [],
      followUps: 0,
      followUpsOverdue: 0,
      newToday: 0,
      topMissing: [],
    });
  });

  it('keeps graduated threads out of the active counts, matching the inbox lenses', () => {
    const readyWithDraft = makeThread({
      messages: [inbound(iso(48)), outbound(iso(47))],
      conversation: { missing_info: [] },
      hasPendingDraft: true,
    });
    expect(readyWithDraft.thread.needsYou).toBe(true);

    const summary = buildInboxSummary([readyWithDraft], now);
    expect(summary.needsYou).toBe(0);
    expect(summary.readyToQuote).toBe(1);
    expect(summary.needsSpecs).toBe(0);
  });

  it('totals quote-ready pipeline per currency and skips threads without a value', () => {
    const ready = (value: number | null, currency: string | null) =>
      makeThread({
        messages: [inbound(iso(48)), outbound(iso(47))],
        conversation: { missing_info: [] },
        estimated_value: value,
        currency,
      });

    const summary = buildInboxSummary(
      [ready(1000, 'USD'), ready(500, 'usd'), ready(200, 'EUR'), ready(null, 'USD'), ready(Number.NaN, 'USD')],
      now
    );
    expect(summary.readyToQuote).toBe(5);
    expect(summary.readyValue).toEqual([
      { currency: 'USD', amount: 1500 },
      { currency: 'EUR', amount: 200 },
    ]);
  });

  it('counts only follow-ups whose next action was due before today', () => {
    const followUp = (nextActionDue: string | null) =>
      makeThread({
        messages: [inbound(iso(100)), outbound(iso(97))],
        conversation: { missing_info: ['Quantity'] },
        next_action_due: nextActionDue,
      });

    const summary = buildInboxSummary(
      [followUp(yesterdayNine().toISOString()), followUp(iso(2)), followUp(null)],
      now
    );
    expect(summary.followUps).toBe(3);
    expect(summary.followUpsOverdue).toBe(1);
  });

  it('counts conversations that arrived since local midnight', () => {
    const summary = buildInboxSummary(
      [owedThread(2), owedThread(30)],
      now
    );
    expect(summary.newToday).toBe(1);
  });

  it('ranks the most frequently missing specs, capped at three', () => {
    const summary = buildInboxSummary(
      [
        makeThread({ messages: [inbound(iso(1))], conversation: { missing_info: ['Quantity', 'Port'] } }),
        makeThread({ messages: [inbound(iso(2))], conversation: { missing_info: ['Quantity', 'MOQ'] } }),
        makeThread({ messages: [inbound(iso(3))], conversation: { missing_info: ['Quantity'] } }),
        makeThread({ messages: [inbound(iso(4))], conversation: { missing_info: ['Blind date', 'Lead time'] } }),
      ],
      now
    );
    expect(summary.topMissing.slice(0, 3)).toEqual([
      { field: 'Quantity', count: 3 },
      { field: 'Blind date', count: 1 },
      { field: 'Lead time', count: 1 },
    ]);
    expect(summary.topMissing).toHaveLength(3);
  });
});
