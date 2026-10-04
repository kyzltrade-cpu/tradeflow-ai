/* Plan catalogue and display currency, shared by the pricing page, the
   checkout endpoint, and the website chatbot's knowledge block so the three can
   never quote different numbers.

   Currency is configuration, not a constant: set NEXT_PUBLIC_BILLING_CURRENCY
   (public, because the pricing page renders it in the browser) or
   BILLING_CURRENCY (server only) to sell in another market. Amounts are in MAJOR
   units here and converted to Stripe minor units by toMinorUnits, so switching
   currency does not require re-deriving every amount by hand.

   Prices default to the current HK$ catalogue — changing what customers are
   charged is a pricing decision, not a localisation one. */

export type PlanId = 'starter' | 'growth' | 'enterprise';

export const BILLING_CURRENCY = (
  process.env.BILLING_CURRENCY ||
  process.env.NEXT_PUBLIC_BILLING_CURRENCY ||
  'hkd'
).toLowerCase();

export const PLANS: Record<
  PlanId,
  { name: string; description: string; monthly: number; annual: number }
> = {
  starter: {
    name: 'Sailwise Starter',
    description: 'Email-first assistant · Unlimited AI conversations',
    monthly: 1880,
    annual: 1504,
  },
  growth: {
    name: 'Sailwise Growth',
    description: 'Email-first assistant · 5,000 AI conversations/mo',
    monthly: 2480,
    annual: 1984,
  },
  enterprise: {
    name: 'Sailwise Enterprise',
    description: 'Email-first assistant · Unlimited AI · Dedicated manager',
    monthly: 4880,
    annual: 3904,
  },
};

/* Stripe treats these as having no minor unit, so 1880 means ¥1,880, not
   ¥0.0188. Everything else is multiplied by 100. */
const ZERO_DECIMAL = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf']);

export function toMinorUnits(amount: number, currency = BILLING_CURRENCY): number {
  return ZERO_DECIMAL.has(currency.toLowerCase()) ? Math.round(amount) : Math.round(amount * 100);
}

const SYMBOLS: Record<string, string> = {
  hkd: 'HK$',
  usd: 'US$',
  eur: '€',
  gbp: '£',
  sgd: 'S$',
  aud: 'A$',
  cad: 'C$',
  nzd: 'NZ$',
  cny: '¥',
  jpy: '¥',
  inr: '₹',
  brl: 'R$',
  mxn: 'MX$',
  aed: 'AED ',
  sar: 'SAR ',
  chf: 'CHF ',
  sek: 'kr ',
  nok: 'kr ',
  dkk: 'kr ',
  pln: 'zł ',
  try: '₺ ',
  krw: '₩',
};

export function currencySymbol(currency = BILLING_CURRENCY): string {
  return SYMBOLS[currency.toLowerCase()] || `${currency.toUpperCase()} `;
}

export function formatPrice(amount: number, currency = BILLING_CURRENCY): string {
  return `${currencySymbol(currency)}${amount.toLocaleString('en-US')}`;
}

const PLAN_SUMMARY: Record<PlanId, string> = {
  starter:
    '14-day free trial, card required, 50 AI drafts and 25 emails included during the trial. Unlimited AI conversations after the trial. Self-serve setup is free; optional one-time done-for-you setup for {setup} (we connect your email, upload products, configure the AI).',
  growth:
    'Multiple email inbox accounts, multi-user dashboard, analytics & reporting, priority support.',
  enterprise:
    'Automated quote generation, dedicated account manager, custom integrations.',
};

/* The chatbot used to hardcode "PRICING (HKD): Starter: HK$1,880/mo…" in prose,
   which silently went stale and locked the product to one market. Generated from
   the same catalogue the checkout charges. */
export function pricingKnowledgeBlock(setupFee = 1000): string {
  const s = currencySymbol();
  const lines = (Object.keys(PLANS) as PlanId[]).map((id) => {
    const plan = PLANS[id];
    const label = plan.name.replace('Sailwise ', '');
    return `- ${label}: ${s}${plan.monthly.toLocaleString('en-US')}/mo, or ${s}${plan.annual.toLocaleString('en-US')}/mo billed annually (20% off). ${PLAN_SUMMARY[id].replace('{setup}', `${s}${setupFee.toLocaleString('en-US')}`)}`;
  });
  return [
    `PRICING (${BILLING_CURRENCY.toUpperCase()}):`,
    ...lines,
    '- If someone asks about a price or plan feature you don\'t see here, say "Let me check with the team" — don\'t guess.',
  ].join('\n');
}