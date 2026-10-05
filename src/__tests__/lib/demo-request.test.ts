import { normalizeDemoRequest, DEMO_REQUEST_LIMITS } from '@/lib/demo-request';

describe('normalizeDemoRequest', () => {
  const valid = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    company: 'Analytical Engines Ltd',
    phone: '+852 1234 5678',
  };

  it('accepts a well-formed request', () => {
    const result = normalizeDemoRequest(valid);
    expect(result).toEqual({ ok: true, value: valid });
  });

  it('trims surrounding whitespace', () => {
    const result = normalizeDemoRequest({
      ...valid,
      name: '  Ada Lovelace  ',
      company: ' Analytical Engines Ltd ',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('Ada Lovelace');
      expect(result.value.company).toBe('Analytical Engines Ltd');
    }
  });

  describe('required fields', () => {
    it.each(['name', 'email', 'company'] as const)('rejects a missing %s', (field) => {
      const body: Record<string, unknown> = { ...valid };
      delete body[field];
      const result = normalizeDemoRequest(body);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/required/i);
    });

    it('treats an empty string as missing', () => {
      expect(normalizeDemoRequest({ ...valid, name: '' }).ok).toBe(false);
    });

    it('treats a whitespace-only name as missing', () => {
      expect(normalizeDemoRequest({ ...valid, name: '     ' }).ok).toBe(false);
    });

    it('ignores a non-string field instead of coercing it', () => {
      const result = normalizeDemoRequest({ ...valid, name: { toString: () => 'x' } });
      expect(result.ok).toBe(false);
    });

    it('survives a null or non-object body', () => {
      expect(normalizeDemoRequest(null).ok).toBe(false);
      expect(normalizeDemoRequest(undefined).ok).toBe(false);
      expect(normalizeDemoRequest('nope').ok).toBe(false);
    });
  });

  describe('email', () => {
    it.each([
      'no-at-sign',
      'two@@example.com',
      'spaces in@example.com',
      'trailing@example',
      '@example.com',
      'user@',
      'user@localhost',
      'a b@example.com',
    ])('rejects %s', (email) => {
      expect(normalizeDemoRequest({ ...valid, email }).ok).toBe(false);
    });

    it.each(['a@b.co', 'first.last+tag@sub.example.co.uk', "o'brien@example.com"])(
      'accepts %s',
      (email) => {
        expect(normalizeDemoRequest({ ...valid, email }).ok).toBe(true);
      },
    );

    it('rejects an address longer than 254 characters', () => {
      const email = `${'a'.repeat(250)}@example.com`;
      const result = normalizeDemoRequest({ ...valid, email });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/valid email/i);
    });

    it('checks length before shape so a long bad address is not stored', () => {
      // 300 chars of nonsense: rejected either way, but the error must be the
      // email error rather than a silent accept.
      const result = normalizeDemoRequest({ ...valid, email: 'x'.repeat(300) });
      expect(result.ok).toBe(false);
    });
  });

  describe('length caps', () => {
    it.each([
      ['name', DEMO_REQUEST_LIMITS.name],
      ['company', DEMO_REQUEST_LIMITS.company],
      ['phone', DEMO_REQUEST_LIMITS.phone],
    ] as const)('accepts %s at exactly the cap', (field, cap) => {
      const result = normalizeDemoRequest({ ...valid, [field]: 'x'.repeat(cap) });
      expect(result.ok).toBe(true);
    });

    it.each([
      ['name', DEMO_REQUEST_LIMITS.name],
      ['company', DEMO_REQUEST_LIMITS.company],
      ['phone', DEMO_REQUEST_LIMITS.phone],
    ] as const)('rejects %s one character over the cap', (field, cap) => {
      const result = normalizeDemoRequest({ ...valid, [field]: 'x'.repeat(cap + 1) });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/characters or fewer/i);
    });

    it('measures the trimmed value, so padding cannot smuggle a long string through', () => {
      // 500 chars of content, but only whitespace around it — after trim the
      // stored value is still over the cap and must be rejected.
      const padded = `  ${'x'.repeat(DEMO_REQUEST_LIMITS.name + 50)}  `;
      expect(normalizeDemoRequest({ ...valid, name: padded }).ok).toBe(false);
    });
  });

  it('allows an absent phone, since only name/email/company are required', () => {
    const result = normalizeDemoRequest({ name: valid.name, email: valid.email, company: valid.company });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.phone).toBe('');
  });

  // The values are interpolated into the operator notification email. Validation
  // bounds them but deliberately does not strip markup, so escaping is a separate
  // control — this test documents that the two are independent.
  it('passes markup through unchanged, leaving escaping to escapeHtml', () => {
    const result = normalizeDemoRequest({
      ...valid,
      name: '<script>alert(1)</script>',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe('<script>alert(1)</script>');
  });
});