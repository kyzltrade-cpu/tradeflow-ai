import { buildTemplateDraft, type DraftContext } from '@/lib/queue-draft-template';

const base: DraftContext = {
  kind: 'reply',
  sender: 'James Park',
  subject: '500ml bottle enquiry',
  company: 'Blue Ocean Retail',
  industry: 'Retail',
  country: 'Hong Kong',
  stage: 'new',
  nextStep: 'Confirm the logo file before we quote',
  request: 'We need 5,000 vacuum bottles with our logo.',
  total: 'USD 15750',
  lines: ['- 500ml Stainless Steel Vacuum Bottle x5000 = USD 14250'],
  missing: ['logo design file'],
};

describe('buildTemplateDraft', () => {
  it('greets by first name, not the full name', () => {
    expect(buildTemplateDraft(base)).toContain('Dear James,');
  });

  it('asks for the specs the AI could not confirm, never inventing them', () => {
    const out = buildTemplateDraft(base);
    expect(out).toContain('logo design file');
    expect(out).toContain('Before we confirm pricing and lead times');
  });

  it('keeps the same shape for a quote row: greeting, items, total, sign-off', () => {
    const out = buildTemplateDraft({ ...base, kind: 'quote' });
    expect(out.startsWith('Dear James,')).toBe(true);
    expect(out).toContain('Blue Ocean Retail');
    expect(out).toContain('USD 15750');
    expect(out.endsWith('Best regards,\nSailwise Team')).toBe(true);
  });

  it('keeps the same shape for a follow-up row with no quote', () => {
    const out = buildTemplateDraft({ ...base, kind: 'followup', lines: [], total: null, missing: [] });
    expect(out.startsWith('Dear James,')).toBe(true);
    expect(out).toContain('follow up on your recent enquiry');
    expect(out.endsWith('Best regards,\nSailwise Team')).toBe(true);
  });

  it('falls back to a neutral greeting when the sender is unknown', () => {
    const out = buildTemplateDraft({ ...base, sender: null });
    expect(out).toContain('Dear Sir or Madam,');
  });

  it('drops honorifics from the greeting', () => {
    expect(buildTemplateDraft({ ...base, sender: 'Dr. Chen Wei' })).toContain('Dear Chen,');
  });

  it('always signs off, even with no facts at all', () => {
    const out = buildTemplateDraft({
      ...base,
      sender: null,
      company: null,
      lines: [],
      total: null,
      missing: [],
      nextStep: null,
      request: null,
    });
    // Still a complete, sendable-shaped email rather than a bare stub.
    expect(out).toBe(
      'Dear Sir or Madam,\n\nThank you for getting in touch.\n\nBest regards,\nSailwise Team'
    );
  });

  it('is deterministic for the same input', () => {
    expect(buildTemplateDraft(base)).toBe(buildTemplateDraft(base));
  });
});
