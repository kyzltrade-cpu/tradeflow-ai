import {
  deriveQueueGroups,
  QUEUE_GROUPS,
  QUEUE_GROUP_LABELS,
  daysAgo,
  type QueueDataInput,
} from '@/lib/queue-status'

const base = (overrides: Partial<QueueDataInput> = {}): QueueDataInput => ({
  conversations: [],
  quotes: [],
  followUps: [],
  ...overrides,
})

describe('deriveQueueGroups', () => {
  it('always returns the three fixed groups in order', () => {
    const groups = deriveQueueGroups(base())
    expect(groups.map((g) => g.key)).toEqual(QUEUE_GROUPS)
    expect(groups.map((g) => g.count)).toEqual([0, 0, 0])
  })

  it('puts un-replied conversations in You owe them with Reply action', () => {
    const groups = deriveQueueGroups(
      base({
        conversations: [
          {
            id: 'c1',
            customer: 'Acme Corp',
            subject: 'Bottle quote',
            needs_reply: true,
            last_activity_at: new Date().toISOString(),
          },
        ],
      }),
    )
    const youOwe = groups.find((g) => g.key === 'you_owe')!
    expect(youOwe.count).toBe(1)
    expect(youOwe.items[0].primaryAction).toBe('reply')
    expect(youOwe.items[0].href).toBe('/admin/inbox/c1')
    expect(youOwe.items[0].sender).toBe('Acme Corp')
  })

  it('does not list conversations that are not needs_reply', () => {
    const groups = deriveQueueGroups(
      base({ conversations: [{ id: 'c1', needs_reply: false, waiting_on: true }] }),
    )
    expect(groups.find((g) => g.key === 'you_owe')!.count).toBe(0)
  })

  it('lists DRAFT quotes as ready-to-review items', () => {
    const groups = deriveQueueGroups(
      base({
        quotes: [
          {
            id: 'q1',
            quote_number: 'QT-0001',
            status: 'DRAFT',
            currency: 'USD',
            total_amount: 9360,
            contact_name: 'Jane',
          },
        ],
      }),
    )
    const youOwe = groups.find((g) => g.key === 'you_owe')!
    expect(youOwe.items[0].kind).toBe('draft_ready')
    expect(youOwe.items[0].amount).toBe(9360)
  })

  it('sends IN_REVIEW quotes to Needs approval', () => {
    const groups = deriveQueueGroups(
      base({
        quotes: [
          {
            id: 'q1',
            quote_number: 'QT-0002',
            status: 'IN_REVIEW',
            currency: 'USD',
            total_amount: 12000,
          },
        ],
      }),
    )
    const na = groups.find((g) => g.key === 'needs_approval')!
    expect(na.count).toBe(1)
    expect(na.items[0].primaryAction).toBe('approve')
  })

  it('sends APPROVED quotes with gate issues to Needs approval as re-approval', () => {
    const groups = deriveQueueGroups(
      base({
        quotes: [
          { id: 'q1', quote_number: 'QT-0003', status: 'APPROVED', has_gate_issues: true },
        ],
      }),
    )
    const na = groups.find((g) => g.key === 'needs_approval')!
    expect(na.items[0].kind).toBe('reapproval')
    expect(na.items[0].primaryAction).toBe('re-approve')
  })

  it('puts sent quotes awaiting reply into They owe you', () => {
    const groups = deriveQueueGroups(
      base({
        quotes: [
          { id: 'q1', quote_number: 'QT-0007', status: 'SENT', sent_at: new Date().toISOString() },
        ],
      }),
    )
    const to = groups.find((g) => g.key === 'they_owe')!
    expect(to.count).toBe(1)
    expect(to.items[0].kind).toBe('awaiting_customer')
  })

  it('lists due follow-ups in They owe you', () => {
    const groups = deriveQueueGroups(
      base({
        followUps: [
          { id: 'f1', subject: 'Checking in', opportunity: 'Acme project', scheduledFor: new Date().toISOString() },
        ],
      }),
    )
    const to = groups.find((g) => g.key === 'they_owe')!
    expect(to.items.some((i) => i.kind === 'followup')).toBe(true)
  })

  it('sorts each group by most recent activity first', () => {
    const older = new Date(Date.now() - 86_400_000).toISOString()
    const groups = deriveQueueGroups(
      base({
        conversations: [
          { id: 'old', needs_reply: true, last_activity_at: older },
          { id: 'new', needs_reply: true, last_activity_at: new Date().toISOString() },
        ],
      }),
    )
    const youOwe = groups.find((g) => g.key === 'you_owe')!
    expect(youOwe.items[0].id).toBe('conv-new')
  })

  it('exposes stable en/zh labels for every group', () => {
    for (const key of QUEUE_GROUPS) {
      expect(QUEUE_GROUP_LABELS[key].en.length).toBeGreaterThan(0)
      expect(QUEUE_GROUP_LABELS[key].zh.length).toBeGreaterThan(0)
    }
  })
})

describe('daysAgo', () => {
  it('computes elapsed whole days', () => {
    const iso = new Date(Date.now() - 2 * 86_400_000).toISOString()
    expect(daysAgo(iso)).toBe(2)
  })
  it('is safe on null/undefined/garbage', () => {
    expect(daysAgo(null)).toBe(0)
    expect(daysAgo(undefined)).toBe(0)
    expect(daysAgo('not-a-date')).toBe(0)
  })
})