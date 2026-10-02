/**
 * Deterministic spec-chase drafts.
 *
 * A chase asks the buyer for the information we are missing so we can quote.
 * It is deliberately written as pure questions: no prices, no terms, no
 * timelines, no promises. That is what makes it eligible for the auto-send
 * policy in `send-policy.ts` — the same text is re-checked there before it
 * goes out, so this builder must never introduce a gated phrase.
 *
 * Keep it template-bound: a human is not in the loop for these, so the
 * language must be boring and safe.
 */

export interface ChaseDraftInput {
  /** Contact name or email; first name is used in the greeting. */
  sender: string | null;
  /** Company the buyer is writing as, if known. */
  company?: string | null;
  /** Short product phrase, e.g. "insulated stainless steel bottles, 500ml". */
  productSummary: string | null;
  /** Missing fields, each with a ready-made question. */
  missing: Array<{ label: string; suggestion: string }>;
  /** 1 = first chase, 2 = final chase. Caps at 2 by policy. */
  step?: number;
}

const FALLBACK_QUESTIONS = [
  'Could you confirm the exact product and specification you need?',
  'How many units do you need, and in what unit of measure?',
  'Which destination should we plan for?',
];

function firstName(full: string | null): string | null {
  if (!full) return null;
  const trimmed = full.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/^(mr|mrs|ms|miss|dr|prof)\.?\s+/i, '');
  const [first] = cleaned.split(/\s+/);
  return first || null;
}

function questionsFor(missing: ChaseDraftInput['missing']): string[] {
  const qs = missing.map(
    (m) => m.suggestion?.trim() || `Could you confirm the ${m.label.toLowerCase()}?`,
  );
  return qs.length > 0 ? qs.slice(0, 5) : FALLBACK_QUESTIONS;
}

export function buildChaseDraft(input: ChaseDraftInput): string {
  const name = firstName(input.sender);
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  const product = input.productSummary?.trim();
  const subject = product ? `about ${product}` : 'about your enquiry';
  const step = input.step ?? 1;
  const questions = questionsFor(input.missing)
    .map((q) => `- ${q}`)
    .join('\n');

  const opener =
    step <= 1
      ? `Thanks for your enquiry ${subject}. To point you at the right options, could you send a few details?`
      : `Following up on your enquiry ${subject}. I still need a few details before I can respond properly:`;

  const closer =
    step <= 1
      ? 'Just reply with the details and I can take it from there. If anything has changed since you wrote, let me know.'
      : 'If any of this has changed since you wrote, just say so. Otherwise a quick reply is all I need.';

  return [greeting, opener, questions, closer, 'Best regards,\nSailwise Team'].join('\n\n');
}
