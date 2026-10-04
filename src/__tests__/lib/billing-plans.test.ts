import {
  BILLING_CURRENCY,
  PLANS,
  currencySymbol,
  formatPrice,
  pricingKnowledgeBlock,
  toMinorUnits,
} from '@/lib/billing-plans'

describe('toMinorUnits', () => {
  it('converts two-decimal currencies to minor units', () => {
    expect(toMinorUnits(1880, 'hkd')).toBe(188000)
    expect(toMinorUnits(29, 'usd')).toBe(2900)
    expect(toMinorUnits(29, 'eur')).toBe(2900)
  })

  it('leaves zero-decimal currencies untouched', () => {
    expect(toMinorUnits(1880, 'jpy')).toBe(1880)
    expect(toMinorUnits(1880, 'krw')).toBe(1880)
  })

  it('defaults to the configured billing currency', () => {
    expect(toMinorUnits(PLANS.starter.monthly)).toBe(188000)
  })
})

describe('currencySymbol', () => {
  it('maps common currencies to their symbol', () => {
    expect(currencySymbol('hkd')).toBe('HK$')
    expect(currencySymbol('usd')).toBe('US$')
    expect(currencySymbol('eur')).toBe('€')
  })

  it('falls back to an uppercased code for unmapped currencies', () => {
    expect(currencySymbol('brl')).toBe('R$')
    expect(currencySymbol('zzz')).toBe('ZZZ ')
  })
})

describe('formatPrice', () => {
  it('groups thousands and prefixes the symbol', () => {
    expect(formatPrice(4880, 'hkd')).toBe('HK$4,880')
    expect(formatPrice(120, 'usd')).toBe('US$120')
  })
})

describe('pricingKnowledgeBlock', () => {
  it('quotes every plan from the catalogue instead of hardcoded prose', () => {
    const block = pricingKnowledgeBlock()
    expect(block).toContain(`PRICING (${BILLING_CURRENCY.toUpperCase()})`)
    for (const plan of Object.values(PLANS)) {
      expect(block).toContain(plan.name.replace('Sailwise ', ''))
    }
    expect(block).toContain(formatPrice(PLANS.starter.monthly))
    expect(block).toContain('Let me check with the team')
  })

  it('inlines the setup fee in the currency actually being charged', () => {
    expect(pricingKnowledgeBlock(1000)).toContain(`for ${formatPrice(1000)}`)
  })
})