import { classifyOutbound, requiresApproval } from '@/lib/send-policy';
import { buildChaseDraft } from '@/lib/chase-draft';

describe('classifyOutbound', () => {
  it('auto-sends a pure spec chase built from missing-field questions', () => {
    const chase = buildChaseDraft({
      sender: 'James Park',
      productSummary: 'insulated stainless steel bottles, 500ml',
      missing: [
        { label: 'Quantity', suggestion: 'How many units do you need? Please also confirm the unit (pieces, sets, kg, etc.).' },
        { label: 'Incoterms', suggestion: 'Which shipping terms do you prefer? (FOB, CIF, DDP, EXW, etc.)' },
        { label: 'Target Price', suggestion: 'Do you have a target price or budget range in mind for this order?' },
      ],
    });
    expect(classifyOutbound(chase)).toEqual({ policy: 'auto', reasons: [] });
  });

  it('auto-sends the second chase too', () => {
    const chase = buildChaseDraft({
      sender: 'James',
      productSummary: 'vacuum flasks',
      missing: [{ label: 'Quantity', suggestion: 'How many units do you need?' }],
      step: 2,
    });
    expect(classifyOutbound(chase).policy).toBe('auto');
  });

  it('gates a stated price', () => {
    const v = classifyOutbound('We can offer USD 2.10 per unit.');
    expect(v.policy).toBe('approval');
    expect(v.reasons).toContain('price/amount');
  });

  it('gates a bare currency amount inside a question', () => {
    expect(requiresApproval('Can you pay a USD 5,000 deposit?')).toBe(true);
  });

  it('gates a percentage', () => {
    expect(requiresApproval('We can give you a 5% discount.')).toBe(true);
  });

  it('gates a committed timeline', () => {
    expect(requiresApproval('We can deliver by 15 March.')).toBe(true);
  });

  it('gates a lead time', () => {
    expect(requiresApproval('Our lead time is about three weeks.')).toBe(true);
  });

  it('gates an asserted Incoterm', () => {
    expect(requiresApproval('The price is FOB Shenzhen.')).toBe(true);
  });

  it('gates asserted payment terms', () => {
    expect(requiresApproval('We need 30% deposit and the balance on T/T.')).toBe(true);
  });

  it('gates an explicit promise', () => {
    expect(requiresApproval('I will hold this price for you until Friday.')).toBe(true);
  });

  it('gates a guarantee even in a question', () => {
    expect(requiresApproval('Can we guarantee a 12 month warranty?')).toBe(true);
  });

  it('allows asking the buyer for their target price', () => {
    expect(requiresApproval('Do you have a target price or budget range in mind?')).toBe(false);
  });

  it('allows offering Incoterm options as a question', () => {
    expect(requiresApproval('Which shipping terms do you prefer? (FOB, CIF, DDP, EXW, etc.)')).toBe(false);
  });

  it('allows a plain status question', () => {
    expect(requiresApproval('Could you confirm which colour you need?')).toBe(false);
  });

  it('gates an empty message', () => {
    const v = classifyOutbound('   ');
    expect(v.policy).toBe('approval');
    expect(v.reasons).toContain('empty message');
  });

  it('gates a declarative mention of a quotation', () => {
    expect(requiresApproval('The quotation is attached for your review.')).toBe(true);
  });
});
