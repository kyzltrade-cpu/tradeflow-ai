import {
  deriveThread,
  matchesFilter,
  normalizeMissing,
  type ThreadMessage,
} from '@/lib/thread-state';

const now = new Date('2026-10-10T00:00:00Z');
const inbound = (at: string): ThreadMessage => ({ role: 'customer', kind: 'received', created_at: at });
const outbound = (at: string): ThreadMessage => ({ role: 'assistant', kind: 'sent', created_at: at });

describe('normalizeMissing', () => {
  it('handles arrays of labels', () => {
    expect(normalizeMissing(['Quantity', 'Port'])).toEqual(['Quantity', 'Port']);
  });
  it('handles arrays of objects', () => {
    expect(normalizeMissing([{ label: 'Quantity' }, { fieldName: 'Port' }])).toEqual(['Quantity', 'Port']);
  });
  it('handles JSON strings', () => {
    expect(normalizeMissing('["Quantity","Port"]')).toEqual(['Quantity', 'Port']);
  });
  it('handles comma strings', () => {
    expect(normalizeMissing('Quantity, Port')).toEqual(['Quantity', 'Port']);
  });
  it('handles null', () => {
    expect(normalizeMissing(null)).toEqual([]);
  });
});

describe('deriveThread', () => {
  it('marks a fresh enquiry with missing specs as needs_specs and owed', () => {
    const d = deriveThread({
      now,
      conversation: { status: 'active', missing_info: ['Quantity', 'Incoterms'], created_at: '2026-10-08T00:00:00Z' },
      messages: [inbound('2026-10-08T00:00:00Z')],
    });
    expect(d.state).toBe('needs_specs');
    expect(d.needsSpecs).toBe(true);
    expect(d.owedReply).toBe(true);
    expect(d.waitingOnBuyer).toBe(false);
    expect(d.chaseCount).toBe(0);
    expect(d.silentDays).toBe(2);
  });

  it('flips to waiting_on_buyer once a chase has gone out', () => {
    const d = deriveThread({
      now,
      conversation: { status: 'active', missing_info: ['Quantity'] },
      messages: [inbound('2026-10-08T00:00:00Z'), outbound('2026-10-09T00:00:00Z')],
    });
    expect(d.state).toBe('waiting_on_buyer');
    expect(d.waitingOnBuyer).toBe(true);
    expect(d.chaseCount).toBe(1);
  });

  it('goes cold after two unanswered nudges', () => {
    const d = deriveThread({
      now,
      conversation: { status: 'active', missing_info: ['Quantity'] },
      messages: [
        inbound('2026-10-05T00:00:00Z'),
        outbound('2026-10-06T00:00:00Z'),
        outbound('2026-10-08T00:00:00Z'),
      ],
    });
    expect(d.state).toBe('cold');
    expect(d.cold).toBe(true);
    expect(d.chaseCount).toBe(2);
    expect(d.needsSpecs).toBe(false);
    expect(matchesFilter(d, 'needs_specs')).toBe(false);
  });

  it('becomes ready_to_quote once specs are complete', () => {
    const d = deriveThread({
      now,
      conversation: { status: 'active', missing_info: [] },
      messages: [inbound('2026-10-08T00:00:00Z'), outbound('2026-10-09T00:00:00Z')],
    });
    expect(d.state).toBe('ready_to_quote');
    expect(d.readyToQuote).toBe(true);
  });

  it('moves ready_to_quote after the buyer supplies the missing specs', () => {
    const first = deriveThread({
      now,
      conversation: { status: 'active', missing_info: ['Quantity'] },
      messages: [inbound('2026-10-08T00:00:00Z'), outbound('2026-10-09T00:00:00Z')],
    });
    expect(first.state).toBe('waiting_on_buyer');

    const second = deriveThread({
      now,
      conversation: { status: 'active', missing_info: [] },
      messages: [inbound('2026-10-08T00:00:00Z'), outbound('2026-10-09T00:00:00Z'), inbound('2026-10-10T00:00:00Z')],
    });
    expect(second.state).toBe('ready_to_quote');
    expect(second.owedReply).toBe(true);
  });

  it('flags needs_you when a gated draft awaits approval', () => {
    const d = deriveThread({
      now,
      conversation: { status: 'active', missing_info: [] },
      messages: [inbound('2026-10-08T00:00:00Z')],
      hasPendingDraft: true,
    });
    expect(d.needsYou).toBe(true);
    expect(matchesFilter(d, 'needs_you')).toBe(true);
  });

  it('closes when the opportunity is won or lost', () => {
    const d = deriveThread({
      now,
      conversation: { status: 'active', missing_info: [] },
      messages: [inbound('2026-10-08T00:00:00Z')],
      opportunity: { stage: 'WON' },
    });
    expect(d.state).toBe('closed');
    expect(d.owedReply).toBe(false);
    expect(matchesFilter(d, 'all')).toBe(true);
  });

  it('reports a paused conversation', () => {
    const d = deriveThread({
      now,
      conversation: { status: 'ai_paused', missing_info: ['Quantity'] },
      messages: [inbound('2026-10-08T00:00:00Z')],
    });
    expect(d.paused).toBe(true);
  });

  it('ignores system messages when picking the last speaker', () => {
    const d = deriveThread({
      now,
      conversation: { status: 'active', missing_info: [] },
      messages: [inbound('2026-10-08T00:00:00Z'), { role: 'system', created_at: '2026-10-09T00:00:00Z' }],
    });
    expect(d.owedReply).toBe(true);
  });
});

describe('followUpDue', () => {
  it('is not due while the buyer is still fresh (under 3 days)', () => {
    const d = deriveThread({
      now,
      conversation: { status: 'active', missing_info: ['Quantity'] },
      messages: [inbound('2026-10-08T00:00:00Z'), outbound('2026-10-09T00:00:00Z')],
    });
    expect(d.waitingOnBuyer).toBe(true);
    expect(d.silentDays).toBe(2);
    expect(d.followUpDue).toBe(false);
    expect(matchesFilter(d, 'follow_ups')).toBe(false);
  });

  it('becomes due once a chased buyer is silent for 3+ days', () => {
    const d = deriveThread({
      now,
      conversation: { status: 'active', missing_info: ['Quantity'] },
      messages: [inbound('2026-10-05T00:00:00Z'), outbound('2026-10-06T00:00:00Z')],
    });
    expect(d.state).toBe('waiting_on_buyer');
    expect(d.silentDays).toBe(5);
    expect(d.followUpDue).toBe(true);
    expect(matchesFilter(d, 'follow_ups')).toBe(true);
  });

  it('is due for a cold thread', () => {
    const d = deriveThread({
      now,
      conversation: { status: 'active', missing_info: ['Quantity'] },
      messages: [
        inbound('2026-10-05T00:00:00Z'),
        outbound('2026-10-06T00:00:00Z'),
        outbound('2026-10-08T00:00:00Z'),
      ],
    });
    expect(d.cold).toBe(true);
    expect(d.followUpDue).toBe(true);
  });

  it('is not due when the buyer owes a reply (we are not waiting on them)', () => {
    const d = deriveThread({
      now,
      conversation: { status: 'active', missing_info: ['Quantity'] },
      messages: [inbound('2026-10-08T00:00:00Z')],
    });
    expect(d.owedReply).toBe(true);
    expect(d.waitingOnBuyer).toBe(false);
    expect(d.followUpDue).toBe(false);
  });

  it('is not due once specs are complete', () => {
    const d = deriveThread({
      now,
      conversation: { status: 'active', missing_info: [] },
      messages: [inbound('2026-10-05T00:00:00Z'), outbound('2026-10-06T00:00:00Z')],
    });
    expect(d.readyToQuote).toBe(true);
    expect(d.followUpDue).toBe(false);
  });
});

describe('matchesFilter', () => {
  const base = deriveThread({
    now,
    conversation: { status: 'active', missing_info: ['Quantity'] },
    messages: [inbound('2026-10-08T00:00:00Z'), outbound('2026-10-09T00:00:00Z')],
  });
  it('needs_specs matches while specs are missing', () => {
    expect(matchesFilter(base, 'needs_specs')).toBe(true);
  });
  it('waiting_on_buyer matches after a chase', () => {
    expect(matchesFilter(base, 'waiting_on_buyer')).toBe(true);
  });
  it('ready_to_quote does not match', () => {
    expect(matchesFilter(base, 'ready_to_quote')).toBe(false);
  });
  it('all matches everything', () => {
    expect(matchesFilter(base, 'all')).toBe(true);
  });
});
