/**
 * Send policy: decide whether an outbound message may leave without a human.
 *
 * Rule (from the product spec):
 *   - Routine spec chases — questions only, no prices, no terms, no promises —
 *     may send fully automatically, including outside working hours.
 *   - Anything that states a number, term, price, timeline or commitment must
 *     be approved by a human before it sends.
 *
 * The classifier is intentionally conservative: a false "needs approval" costs
 * one tap, a false "auto" could send a price we never agreed to. When in doubt,
 * gate it.
 *
 * It works sentence by sentence. A declarative sentence that mentions a
 * commercial term is treated as an assertion (gated); the same term inside a
 * question is treated as an ask (allowed), because asking the buyer for their
 * target price or preferred Incoterm commits us to nothing.
 */

export type SendPolicy = 'auto' | 'approval';

export interface PolicyVerdict {
  policy: SendPolicy;
  /** Human-readable reasons an approval is required. Empty when auto. */
  reasons: string[];
}

// --- Signals ---------------------------------------------------------------

/** Actual money or a percentage — always gated, even inside a question. */
const MONEY_AMOUNT =
  /(?:[$€£¥]\s?\d[\d.,]*)|(?:\b(?:usd|eur|hkd|cny|rmb|gbp|jpy|aud|cad|sgd|chf|nzd)\b\s?\d[\d.,]*)|(?:\b\d[\d.,]*\s?(?:usd|eur|hkd|cny|rmb|gbp|jpy|aud|cad|sgd|chf|nzd|dollars?|euros?|yuan|renminbi)\b)|(?:\b\d[\d.,]*\s?[%％])|(?:\b\d+(?:\.\d+)?\s?percent\b)/i;

/** Incoterms: an assertion freezes a delivery term. */
const INCOTERM = /\b(?:FOB|CIF|CFR|CIP|CPT|DDP|DDU|EXW|FCA|DAP|DAT)\b/;

/** Payment terms: an assertion sets commercial terms. */
const PAYMENT_TERM =
  /(?:\bT\/T\b)|(?:\bL\/C\b)|(?:\bD\/P\b)|(?:\bD\/A\b)|(?:\bnet\s?(?:15|30|45|60|90)\b)|(?:open\s+account)/i;

/** Delivery timelines and concrete dates. */
const TIMELINE =
  /(?:\bby\s+(?:mon|tue|wed|thu|fri|sat|sun)\w*\b)|(?:\bby\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\b)|(?:\b(?:january|february|march|april|june|july|august|september|october|november|december)\b)|(?:\bwithin\s+\d+\s+(?:hour|day|week|month)s?\b)|(?:\blead\s?time\b)|(?:\b\d+\s?(?:day|week|month)s?\s+(?:lead|delivery|production|turnaround|transit)\b)|(?:\b(?:deliver|delivery|ship|shipped|shipment|dispatch|ready|produce|arrive)\b[^.!?]{0,24}\bby\b)|(?:\b\d{4}-\d{2}-\d{2}\b)|(?:\bnext\s+(?:week|month)\b)|(?:\bweek\s+of\b)/i;

/** First-person promises. */
const COMMITMENT =
  /(?:\b(?:we|i)\s+(?:will|shall)\b)|(?:\b(?:we|i)\s+(?:can|are\s+able\s+to|would\s+be\s+able\s+to)\s+(?:offer|provide|supply|deliver|ship|arrange|send|confirm|guarantee|hold|reserve|quote|match|beat|discount|extend|finalise|finalize)\b)|(?:\b(?:we|i)\s+(?:guarantee|warrant|assure|ensure|commit|confirm)\b)|(?:\bwe\s+are\s+(?:pleased|happy|able)\s+to\b)|(?:\b(?:our|the)\s+(?:best|final|lowest)\s+(?:price|offer|quote|terms)\b)/i;

/** Warranty / guarantee language is a promise. */
const GUARANTEE =
  /\b(?:guarantee|guaranteed|warranty|warranties|money[- ]back|refund|free\s+shipping|free\s+delivery)\b/i;

/** Mentions of money that only gate when asserted, not when asked about. */
const MONEY_WORD =
  /\b(?:price|pricing|quotation|quote|unit\s+price|cost|discount|deposit|invoice|payment|moq|minimum\s+order)\b/i;

const QUESTION_LEAD =
  /^(?:hi|hello|dear|hey|thanks|thank\s+you|good\s+(?:morning|afternoon|evening))?[^a-z]*?(?:could|would|can|will|do|does|did|is|are|was|were|what|which|when|where|who|whom|why|how|may|might|shall|should|please|kindly|any|let\s+me\s+know)\b/i;

function isQuestion(sentence: string): boolean {
  if (/\?/.test(sentence)) return true;
  return QUESTION_LEAD.test(sentence.trim());
}

interface Check {
  label: string;
  re: RegExp;
  /** If true, gates even inside a question. */
  always: boolean;
}

const ALWAYS_CHECKS: Check[] = [
  { label: 'states an amount or percentage', re: MONEY_AMOUNT, always: true },
  { label: 'states a delivery timeline or date', re: TIMELINE, always: true },
  { label: 'makes a commitment', re: COMMITMENT, always: true },
  { label: 'offers a guarantee', re: GUARANTEE, always: true },
];

const ASSERTION_CHECKS: Check[] = [
  { label: 'sets an Incoterm', re: INCOTERM, always: false },
  { label: 'sets payment terms', re: PAYMENT_TERM, always: false },
  { label: 'quotes a commercial figure', re: MONEY_WORD, always: false },
];

const LABELS: Record<string, string> = {
  'states an amount or percentage': 'price/amount',
  'states a delivery timeline or date': 'timeline',
  'makes a commitment': 'commitment',
  'offers a guarantee': 'guarantee',
  'sets an Incoterm': 'Incoterm',
  'sets payment terms': 'payment terms',
  'quotes a commercial figure': 'commercial figure',
};

function splitSentences(text: string): string[] {
  return text
    // Don't split a trailing parenthetical away from the question it answers,
    // e.g. "Which terms do you prefer? (FOB, CIF, DDP, etc.)" — splitting there
    // would turn the option list into a declarative sentence and gate it.
    .split(/(?<=[.!?])\s+(?!\()|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Classify a message body. Returns `auto` only when nothing that needs a human
 * was detected.
 */
export function classifyOutbound(text: string | null | undefined): PolicyVerdict {
  const body = (text ?? '').trim();
  if (!body) {
    return { policy: 'approval', reasons: ['empty message'] };
  }

  const reasons = new Set<string>();

  for (const sentence of splitSentences(body)) {
    const question = isQuestion(sentence);
    for (const check of ALWAYS_CHECKS) {
      if (check.re.test(sentence)) reasons.add(LABELS[check.label] ?? check.label);
    }
    if (!question) {
      for (const check of ASSERTION_CHECKS) {
        if (check.re.test(sentence)) reasons.add(LABELS[check.label] ?? check.label);
      }
    }
  }

  if (reasons.size > 0) {
    return { policy: 'approval', reasons: [...reasons] };
  }
  return { policy: 'auto', reasons: [] };
}

export function requiresApproval(text: string | null | undefined): boolean {
  return classifyOutbound(text).policy === 'approval';
}
