import {
  sanitizeDeliveryLocations,
  MAX_DELIVERY_LOCATIONS,
} from '@/lib/delivery-locations'

describe('sanitizeDeliveryLocations', () => {
  it('keeps well-formed locations and trims them', () => {
    const out = sanitizeDeliveryLocations([
      { label: '  Apex 3PL, Singapore ', address: ' 12 Jurong East ', quantity: ' 2,000 pcs ', note: ' marks on cartons ' },
    ])
    expect(out).toEqual([
      { label: 'Apex 3PL, Singapore', address: '12 Jurong East', quantity: '2,000 pcs', note: 'marks on cartons' },
    ])
  })

  it('drops rows with neither a label nor an address', () => {
    const out = sanitizeDeliveryLocations([
      { label: '', address: '', quantity: '5,000 pcs', note: 'x' },
      { label: 'Warehouse B', address: '' },
    ])
    expect(out).toEqual([{ label: 'Warehouse B', address: '', quantity: '', note: '' }])
  })

  it('defaults missing fields to empty strings', () => {
    const out = sanitizeDeliveryLocations([{ address: '1 Main St' }])
    expect(out[0]).toEqual({ label: '', address: '1 Main St', quantity: '', note: '' })
  })

  it('returns an empty list for non-array input', () => {
    expect(sanitizeDeliveryLocations(null)).toEqual([])
    expect(sanitizeDeliveryLocations('nope')).toEqual([])
    expect(sanitizeDeliveryLocations({})).toEqual([])
  })

  it('caps the number of locations', () => {
    const many = Array.from({ length: MAX_DELIVERY_LOCATIONS + 5 }, (_, i) => ({ label: `Loc ${i}` }))
    expect(sanitizeDeliveryLocations(many)).toHaveLength(MAX_DELIVERY_LOCATIONS)
  })
})