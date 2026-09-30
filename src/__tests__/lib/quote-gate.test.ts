import {
  evaluateSendGate,
  recomputeTotals,
  LOCKED_STATE_COPY,
  type QuoteInput,
  type LineItemInput,
} from '@/lib/quote-gate'

const matchedLine = (overrides: Partial<LineItemInput> = {}): LineItemInput => ({
  id: 'li-1',
  product_name: 'Double-Wall Vacuum Bottle',
  quantity: 500,
  unit_price: 18.72,
  total_price: 9360,
  match_status: 'matched',
  evidence_type: 'factory_reply',
  margin_pct: 30,
  ...overrides,
})

const approvedQuote = (overrides: Partial<QuoteInput> = {}): QuoteInput => ({
  id: 'q-1',
  quote_number: 'QT-0001',
  status: 'APPROVED',
  currency: 'USD',
  total_amount: 9360,
  total_margin: 2160,
  margin_pct: 23.1,
  valid_until: '2999-01-01',
  contact_id: 'c-1',
  recipient_email: 'buyer@acme.io',
  current_version: 2,
  approval_version: 2,
  approval_snapshot: { total_amount: 9360, margin_pct: 23.1, recipient_email: 'buyer@acme.io' },
  line_items: [matchedLine()],
  ...overrides,
})

describe('evaluateSendGate', () => {
  it('passes a fully verified, human-approved quote', () => {
    const result = evaluateSendGate(approvedQuote())
    expect(result.ok).toBe(true)
    expect(result.issues).toEqual([])
  })

  it('blocks non-APPROVED quotes', () => {
    const result = evaluateSendGate(approvedQuote({ status: 'IN_REVIEW' }))
    expect(result.ok).toBe(false)
    expect(result.issues.some((i) => i.code === 'not_approved')).toBe(true)
  })

  it('blocks when the approval covers an older version', () => {
    const result = evaluateSendGate(
      approvedQuote({ current_version: 3, approval_version: 2 }),
    )
    expect(result.ok).toBe(false)
    expect(result.issues.some((i) => i.code === 'approval_stale')).toBe(true)
    expect(result.issues[0].reason).toContain('invalidate')
  })

  it('blocks when the approval snapshot no longer matches the quote', () => {
    const result = evaluateSendGate(
      approvedQuote({
        total_amount: 9999,
        approval_snapshot: { total_amount: 9360, margin_pct: 23.1, recipient_email: 'buyer@acme.io' },
      }),
    )
    expect(result.ok).toBe(false)
    const issue = result.issues.find((i) => i.code === 'approval_snapshot_changed')
    expect(issue).toBeDefined()
    expect(issue?.reason).toContain('total amount changed')
  })

  it('reports Unmatched — evidence needed for unverified lines', () => {
    const result = evaluateSendGate(
      approvedQuote({ line_items: [matchedLine({ match_status: 'unmatched', evidence_type: null })] }),
    )
    expect(result.ok).toBe(false)
    const issue = result.issues.find((i) => i.code === 'unmatched_lines')
    expect(issue?.reason).toContain('Unmatched — evidence needed')
  })

  it('blocks unpriced / zero-quantity lines', () => {
    const result = evaluateSendGate(
      approvedQuote({ line_items: [matchedLine({ quantity: 0, unit_price: 0, total_price: 0 })] }),
    )
    expect(result.ok).toBe(false)
    expect(result.issues.some((i) => i.code === 'unpriced_lines')).toBe(true)
  })

  it('blocks zero-total and zero-margin quotes', () => {
    const zeroTotal = evaluateSendGate(approvedQuote({ total_amount: 0 }))
    expect(zeroTotal.issues.some((i) => i.code === 'zero_total')).toBe(true)

    const zeroMargin = evaluateSendGate(
      approvedQuote({ total_margin: 0, margin_pct: 0 }),
    )
    expect(zeroMargin.issues.some((i) => i.code === 'zero_margin')).toBe(true)
  })

  it('blocks expired validity', () => {
    const result = evaluateSendGate(approvedQuote({ valid_until: '2020-01-01' }))
    expect(result.issues.some((i) => i.code === 'expired_validity')).toBe(true)
  })

  it('blocks when no recipient is resolvable', () => {
    const result = evaluateSendGate(
      approvedQuote({ recipient_email: null, contact_id: null, customer_id: null }),
    )
    expect(result.issues.some((i) => i.code === 'missing_recipient')).toBe(true)
  })

  it('co-locates the locked-state copy used by the UI', () => {
    expect(LOCKED_STATE_COPY).toContain('cannot send until all lines verified')
  })
})

describe('recomputeTotals', () => {
  it('computes amount, margin and margin_pct from line items', () => {
    const totals = recomputeTotals([
      matchedLine({ quantity: 500, unit_price: 18.72, total_price: 9360, margin_pct: 30 }),
      matchedLine({
        product_name: 'Lanyards',
        quantity: 1000,
        unit_price: 1.98,
        total_price: 1980,
        margin_pct: 24,
      }),
    ])
    expect(totals.amount).toBe(11340)
    expect(totals.margin).toBe((9360 * 0.3 + 1980 * 0.24))
    expect(totals.margin_pct).toBe(Number(((totals.margin / totals.amount) * 100).toFixed(1)))
  })

  it('returns zeroes when no lines are priceable', () => {
    expect(recomputeTotals([matchedLine({ quantity: 0, unit_price: 0 })])).toEqual({
      amount: 0,
      margin: 0,
      margin_pct: 0,
    })
  })
})