import { normalizeBookingRequest, BOOKING_LIMITS } from '@/lib/booking-request';

describe('normalizeBookingRequest', () => {
  const valid = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    company: 'Analytical Engines Ltd',
    volume: '50–200',
    note: 'Bring last month invoices',
    whenIso: '2026-10-16T08:30:00.000Z',
    whenLabel: 'Friday, 16 October · 4:30 pm',
    tz: 'Asia/Hong_Kong',
  };

  it('accepts a well-formed booking', () => {
    const result = normalizeBookingRequest(valid);
    expect(result).toEqual({ ok: true, value: valid });
  });

  it('trims surrounding whitespace', () => {
    const result = normalizeBookingRequest({ ...valid, name: '  Ada Lovelace  ', company: ' Acme ' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('Ada Lovelace');
      expect(result.value.company).toBe('Acme');
    }
  });

  describe('required fields', () => {
    it.each(['name', 'email', 'company'] as const)('rejects a missing %s', (field) => {
      const body: Record<string, unknown> = { ...valid };
      delete body[field];
      const result = normalizeBookingRequest(body);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/required/i);
    });

    it('requires a valid call time', () => {
      expect(normalizeBookingRequest({ ...valid, whenIso: '' }).ok).toBe(false);
      expect(normalizeBookingRequest({ ...valid, whenIso: 'not-a-date' }).ok).toBe(false);
    });

    it('rejects non-object bodies', () => {
      expect(normalizeBookingRequest(null).ok).toBe(false);
      expect(normalizeBookingRequest(undefined).ok).toBe(false);
      expect(normalizeBookingRequest('nope').ok).toBe(false);
    });

    it('ignores non-string fields', () => {
      expect(normalizeBookingRequest({ ...valid, name: { toString: () => 'x' } }).ok).toBe(false);
    });
  });

  describe('email', () => {
    it.each(['nope', 'a@b', 'a b@c.com', '@x.com'])('rejects %j', (email) => {
      expect(normalizeBookingRequest({ ...valid, email }).ok).toBe(false);
    });

    it('accepts a normal address', () => {
      expect(normalizeBookingRequest({ ...valid, email: 'ada@example.co.uk' }).ok).toBe(true);
    });

    it('rejects an over-long email', () => {
      expect(normalizeBookingRequest({ ...valid, email: `${'x'.repeat(260)}@a.com` }).ok).toBe(false);
    });
  });

  describe('length caps', () => {
    it.each([
      ['name', BOOKING_LIMITS.name],
      ['company', BOOKING_LIMITS.company],
      ['volume', BOOKING_LIMITS.volume],
      ['note', BOOKING_LIMITS.note],
      ['whenLabel', BOOKING_LIMITS.whenLabel],
      ['tz', BOOKING_LIMITS.tz],
    ] as const)('accepts %s at exactly the cap', (field, cap) => {
      expect(normalizeBookingRequest({ ...valid, [field]: 'x'.repeat(cap) }).ok).toBe(true);
    });

    it.each([
      ['name', BOOKING_LIMITS.name],
      ['company', BOOKING_LIMITS.company],
      ['volume', BOOKING_LIMITS.volume],
      ['note', BOOKING_LIMITS.note],
      ['whenLabel', BOOKING_LIMITS.whenLabel],
      ['tz', BOOKING_LIMITS.tz],
    ] as const)('rejects %s one over the cap', (field, cap) => {
      const result = normalizeBookingRequest({ ...valid, [field]: 'x'.repeat(cap + 1) });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/characters or fewer/i);
    });
  });

  it('allows optional fields to be absent', () => {
    const result = normalizeBookingRequest({
      name: valid.name,
      email: valid.email,
      company: valid.company,
      whenIso: valid.whenIso,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.volume).toBe('');
      expect(result.value.note).toBe('');
      expect(result.value.whenLabel).toBe('');
      expect(result.value.tz).toBe('');
    }
  });

  it('passes markup through unchanged, leaving escaping to escapeHtml', () => {
    const result = normalizeBookingRequest({ ...valid, name: '<script>alert(1)</script>' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe('<script>alert(1)</script>');
  });
});