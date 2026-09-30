import {
  deriveBigDeals,
  isBigDeal,
  BIG_DEAL_MIN_VALUE,
  BIG_DEAL_MAX,
  type OpportunityInput,
} from '@/lib/big-deals'

const base = (overrides: Partial<OpportunityInput> = {}): OpportunityInput => ({
  id: 'o1',
  title: 'Custom water bottles',
  stage: 'SOURCING',
  priority: 'normal',
  currency: 'USD',
  estimated_order_value: null,
  next_action: null,
  next_action_due: null,
  last_activity_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

describe('isBigDeal', () => {
  it('is false for null / undefined / empty', () => {
    expect(isBigDeal(null)).toBe(false)
    expect(isBigDeal(undefined)).toBe(false)
    expect(isBigDeal({})).toBe(false)
  })

  it('flags a deal at or above the value threshold', () => {
    expect(isBigDeal(base({ estimated_order_value: BIG_DEAL_MIN_VALUE }))).toBe(true)
    expect(isBigDeal(base({ estimated_order_value: 500_000 }))).toBe(true)
  })

  it('does not flag small-value normal-priority deals', () => {
    expect(isBigDeal(base({ estimated_order_value: 5_000 }))).toBe(false)
    expect(isBigDeal(base({ estimated_order_value: BIG_DEAL_MIN_VALUE - 1 }))).toBe(false)
  })

  it('flags high / urgent priority even without a value', () => {
    expect(isBigDeal(base({ priority: 'high' }))).toBe(true)
    expect(isBigDeal(base({ priority: 'urgent' }))).toBe(true)
  })

  it('ignores low / normal / medium priority without value', () => {
    expect(isBigDeal(base({ priority: 'normal' }))).toBe(false)
    expect(isBigDeal(base({ priority: 'low' }))).toBe(false)
    expect(isBigDeal(base({ priority: 'medium' }))).toBe(false)
  })

  it('excludes closed stages even when the value is huge', () => {
    for (const stage of ['WON', 'LOST', 'EXPIRED']) {
      expect(isBigDeal(base({ stage, estimated_order_value: 1_000_000 }))).toBe(false)
    }
  })

  it('treats garbage values as no value', () => {
    expect(isBigDeal(base({ estimated_order_value: Number.NaN }))).toBe(false)
    expect(isBigDeal(base({ estimated_order_value: -10 }))).toBe(false)
  })
})

describe('deriveBigDeals', () => {
  it('returns only big deals', () => {
    const deals = deriveBigDeals([
      base({ id: 'a', estimated_order_value: 100_000 }),
      base({ id: 'b', estimated_order_value: 1_000 }),
      base({ id: 'c', priority: 'urgent' }),
    ])
    expect(deals.map((d) => d.id).sort()).toEqual(['a', 'c'])
  })

  it('sorts by value descending with value-less deals last', () => {
    const deals = deriveBigDeals([
      base({ id: 'big', estimated_order_value: 200_000 }),
      base({ id: 'huge', estimated_order_value: 2_000_000 }),
      base({ id: 'no-value', priority: 'high' }),
    ])
    expect(deals.map((d) => d.id)).toEqual(['huge', 'big', 'no-value'])
  })

  it('caps the result at BIG_DEAL_MAX and fills in display fields', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      base({ id: `o${i}`, title: `Deal ${i}`, estimated_order_value: 100_000 + i }),
    )
    const deals = deriveBigDeals(many)
    expect(deals.length).toBe(BIG_DEAL_MAX)
    expect(deals[0].title).toBe('Deal 19')
    expect(deals[0].currency).toBe('USD')
  })

  it('excludes closed deals entirely', () => {
    const deals = deriveBigDeals([
      base({ id: 'won', stage: 'WON', estimated_order_value: 900_000 }),
      base({ id: 'open', estimated_order_value: 900_000 }),
    ])
    expect(deals.map((d) => d.id)).toEqual(['open'])
  })
})