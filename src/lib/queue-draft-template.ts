/**
 * Deterministic queue email drafts.
 *
 * Two reasons this exists:
 *
 * 1. The panel must never show an empty box. The model answers in 7-30s and
 *    rate-limits; a reviewer who opens a row and waits 30s for nothing will
 *    stop trusting the approval screen. This builder produces a usable draft
 *    from the same facts in zero time and zero cost.
 * 2. Demos and tests need stable output. This is a pure function of the deal,
 *    so the same row always yields the same draft.
 *
 * It is a template, not intelligence. The model path is the upgrade: when the
 * model answers, its draft replaces this. The UI labels which one you are
 * reading, because a human must not approve a template believing it was vetted.
 */

export type DraftContext = {
  kind: 'reply' | 'quote' | 'followup';
  sender: string | null;
  subject: string | null;
  company: string | null;
  industry: string | null;
  country: string | null;
  stage: string | null;
  nextStep: string | null;
  request: string | null;
  total: string | null;
  lines: string[];
  missing: string[];
};

function firstName(full: string | null): string | null {
  if (!full) return null;
  const trimmed = full.trim();
  if (!trimmed) return null;
  // Avoid "Dear Dr. Chen" style prefixes leaking into the greeting.
  const cleaned = trimmed.replace(/^(mr|mrs|ms|miss|dr|prof)\.?\s+/i, '');
  const [first] = cleaned.split(/\s+/);
  return first || null;
}

function sentenceList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/** "5000 units of 500ml Stainless Steel Vacuum Bottle" style lead-in. */
function itemPhrases(ctx: DraftContext): string[] {
  return ctx.lines
    .map((line) => {
      const body = line.replace(/^-\s*/, '');
      const eq = body.indexOf('=');
      return eq > 0 ? body.slice(0, eq).trim() : body;
    })
    .filter(Boolean);
}

export function buildTemplateDraft(ctx: DraftContext): string {
  const name = firstName(ctx.sender);
  const greeting = name ? `Dear ${name},` : 'Dear Sir or Madam,';
  const items = itemPhrases(ctx);
  const paras: string[] = [greeting];

  if (ctx.kind === 'quote') {
    paras.push(
      ctx.company
        ? `Thank you for your enquiry. We have prepared a draft quotation for ${ctx.company} covering ${sentenceList(items) || 'the items discussed'}${ctx.total ? `, totalling ${ctx.total}` : ''}.`
        : `Thank you for your enquiry. We have prepared a draft quotation covering ${sentenceList(items) || 'the items discussed'}${ctx.total ? `, totalling ${ctx.total}` : ''}.`
    );
  } else if (ctx.kind === 'followup') {
    paras.push(
      `I wanted to follow up on your recent enquiry${ctx.company ? ` with ${ctx.company}` : ''}. To move this towards a quotation, I need to confirm a few details.`
    );
  } else {
    paras.push(
      `Thank you for getting in touch${ctx.company ? `, and for your interest as ${ctx.company}` : ''}.${
        ctx.request ? ' I have reviewed your message and the items you listed.' : ''
      }`
    );
  }

  if (ctx.missing.length > 0) {
    paras.push(
      `Before we confirm pricing and lead times, could you send through ${sentenceList(
        ctx.missing.map((m) => `the ${m.toLowerCase()}`)
      )}? Those details determine which specification we quote against.`
    );
  } else if (ctx.request) {
    paras.push(
      'If any specification has changed since you wrote, let me know and I will revise the draft before it goes out.'
    );
  }

  if (ctx.nextStep) {
    paras.push(`${ctx.nextStep.charAt(0).toUpperCase()}${ctx.nextStep.slice(1)}.`);
  }

  paras.push('Best regards,\nSailwise Team');
  return paras.join('\n\n');
}
