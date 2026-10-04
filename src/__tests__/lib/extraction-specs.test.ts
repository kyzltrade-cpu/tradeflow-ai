import {
  extractionSpecKey,
  sanitizeExtractionSpecs,
  MAX_EXTRACTION_SPECS,
} from '@/lib/extraction-specs'

describe('extractionSpecKey', () => {
  it('slugifies labels into stable machine keys', () => {
    expect(extractionSpecKey('Packaging')).toBe('packaging')
    expect(extractionSpecKey('Delivery Window (weeks)')).toBe('delivery_window_weeks')
    expect(extractionSpecKey('  材質  ')).toBe('field')
  })
})

describe('sanitizeExtractionSpecs', () => {
  it('keeps well-formed entries and trims them', () => {
    const out = sanitizeExtractionSpecs([
      { label: '  Packaging ', hint: '  gift box  ' },
      { key: 'incoterm', label: 'Incoterm', hint: '' },
    ])
    expect(out).toEqual([
      { key: 'packaging', label: 'Packaging', hint: 'gift box' },
      { key: 'incoterm', label: 'Incoterm', hint: '' },
    ])
  })

  it('drops entries with no label so they never render a blank row', () => {
    const out = sanitizeExtractionSpecs([{ label: '   ', hint: 'orphan' }, { label: 'MOQ' }])
    expect(out).toEqual([{ key: 'moq', label: 'MOQ', hint: '' }])
  })

  it('de-duplicates keys produced by different labels', () => {
    const out = sanitizeExtractionSpecs([{ label: 'Packaging' }, { label: 'packaging!' }])
    expect(out.map((f) => f.key)).toEqual(['packaging', 'packaging_2'])
  })

  it('caps the list so the prompt cannot grow unbounded', () => {
    const many = Array.from({ length: MAX_EXTRACTION_SPECS + 10 }, (_, i) => ({ label: `Field ${i}` }))
    expect(sanitizeExtractionSpecs(many)).toHaveLength(MAX_EXTRACTION_SPECS)
  })

  it('returns an empty list for anything that is not an array', () => {
    expect(sanitizeExtractionSpecs(null)).toEqual([])
    expect(sanitizeExtractionSpecs('nope')).toEqual([])
    expect(sanitizeExtractionSpecs(undefined)).toEqual([])
  })

  it('caps label and hint length', () => {
    const [field] = sanitizeExtractionSpecs([{ label: 'L'.repeat(200), hint: 'H'.repeat(400) }])
    expect(field.label).toHaveLength(60)
    expect(field.hint).toHaveLength(160)
  })
})