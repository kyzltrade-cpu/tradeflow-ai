import { priceQuotableLines, type AutoDraftLine } from '@/lib/auto-draft'

jest.mock('@/lib/supabase')
jest.mock('@/lib/quote-generator')

const pricedLine = (overrides: Partial<AutoDraftLine> = {}): AutoDraftLine => ({
  product: 'Double-Wall Vacuum Bottle',
  matched_product_id: 'p-1',
  matched_product_name: 'Double-Wall Vacuum Bottle',
  quantity: 500,
  unit: 'pcs',
  unit_price: 18.72,
  cost_price: 14.4,
  margin_pct: 30,
  needs_review: false,
  ...overrides,
})

describe('priceQuotableLines', () => {
  it('keeps only fully-quotable lines in the quote', () => {
    const { quotable, excluded } = priceQuotableLines([
      pricedLine(),
      pricedLine({ product: 'Zero qty bottle', quantity: 0 }),
      pricedLine({ product: 'Missing qty bottle', quantity: undefined }),
      pricedLine({ product: 'No price bottle', unit_price: 0 }),
      pricedLine({ product: 'Pending review engraving', unit_price: 10, needs_review: true }),
    ])

    expect(quotable.map((l) => l.product)).toEqual(['Double-Wall Vacuum Bottle'])
    expect(excluded.map((l) => l.product)).toHaveLength(4)
  })

  it('computes totals, cost, margin and margin_pct', () => {
    const { totals } = priceQuotableLines([
      pricedLine({ quantity: 500, unit_price: 18.72, cost_price: 14.4 }),
      pricedLine({ product: 'Lanyards', quantity: 1000, unit_price: 1.98, cost_price: 1.2 }),
    ])

    expect(totals.amount).toBe(11340) // 9360 + 1980
    expect(totals.cost).toBe(8400) // 7200 + 1200
    expect(totals.margin).toBe(2940)
    expect(totals.margin_pct).toBe(0.26)
  })

  it('falls back to unit_price as cost basis when cost_price is absent (zero margin)', () => {
    const { totals } = priceQuotableLines([pricedLine({ cost_price: undefined })])

    expect(totals.amount).toBe(9360)
    expect(totals.cost).toBe(9360)
    expect(totals.margin).toBe(0)
    expect(totals.margin_pct).toBe(0)
  })

  it('returns zero totals for no quotable lines', () => {
    const { quotable, excluded, totals } = priceQuotableLines([
      pricedLine({ quantity: undefined }),
      pricedLine({ needs_review: true }),
    ])

    expect(quotable).toHaveLength(0)
    expect(excluded).toHaveLength(2)
    expect(totals).toEqual({ amount: 0, cost: 0, margin: 0, margin_pct: 0 })
  })
})