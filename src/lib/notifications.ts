/**
 * WhatsApp alert preferences.
 *
 * Traders configure which events should ping their WhatsApp number. Kept in
 * one place so the admin UI, the settings API, and the intake pipeline all
 * agree on the shape. Stored inside `company_settings.pricing->notifications`
 * (no schema change required).
 */

export interface NotificationConfig {
  enabled: boolean;
  newInquiry: boolean;
  pricingQuestion: boolean;
  /** AI extracted a complete spec and opened an opportunity (ready to quote). */
  specExtracted: boolean;
  bigDeal: boolean;
  escalation: boolean;
  bigDealMinValue: number;
}

export const DEFAULT_NOTIFICATIONS: NotificationConfig = {
  enabled: true,
  newInquiry: false,
  pricingQuestion: true,
  specExtracted: true,
  bigDeal: true,
  escalation: true,
  bigDealMinValue: 50_000,
};

export function normaliseNotifications(input: unknown): NotificationConfig {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const num = Number(raw.bigDealMinValue);
  return {
    enabled: raw.enabled !== false,
    newInquiry: raw.newInquiry === true,
    pricingQuestion: raw.pricingQuestion !== false,
    specExtracted: raw.specExtracted !== false,
    bigDeal: raw.bigDeal !== false,
    escalation: raw.escalation !== false,
    bigDealMinValue: Number.isFinite(num) && num > 0 ? num : DEFAULT_NOTIFICATIONS.bigDealMinValue,
  };
}

const PRICING_KEYWORDS = [
  'price', 'pricing', 'quote', 'quotation', 'cost', 'how much', 'discount',
  'fob', 'cif', 'exw', 'unit price', 'moq', 'per unit',
];

const ESCALATION_KEYWORDS = [
  'human', 'manager', 'representative', 'speak to someone', 'speak to a person',
  'refund', 'complaint', 'unacceptable', 'lawyer', 'legal action', 'fraud',
  'angry', 'frustrated', 'cancel my order', 'urgent',
];

function matches(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k));
}

/** Keyword-based detection of triggers we can resolve without the model. */
export function detectTextTriggers(text: string | null | undefined): {
  pricingQuestion: boolean;
  escalation: boolean;
} {
  const lower = (text || '').toLowerCase();
  if (!lower.trim()) return { pricingQuestion: false, escalation: false };
  return {
    pricingQuestion: matches(lower, PRICING_KEYWORDS),
    escalation: matches(lower, ESCALATION_KEYWORDS),
  };
}

export interface ResolvedAlert {
  shouldAlert: boolean;
  reasons: string[];
}

/** Decide which configured triggers apply to a single inbound inquiry. */
export function resolveAlerts(params: {
  config: NotificationConfig;
  text?: string | null;
  value?: number | null;
  priority?: string | null;
  /** True when extraction produced a complete spec and an opportunity was opened. */
  specExtracted?: boolean;
}): ResolvedAlert {
  const { config } = params;
  if (!config.enabled) return { shouldAlert: false, reasons: [] };

  const reasons: string[] = [];

  if (config.newInquiry) reasons.push('New enquiry');
  if (config.specExtracted && params.specExtracted) reasons.push('Full spec extracted');

  const detected = detectTextTriggers(params.text);
  if (config.pricingQuestion && detected.pricingQuestion) reasons.push('Pricing question');
  if (config.escalation && detected.escalation) reasons.push('Needs your attention');

  const value = Number(params.value);
  const byValue = config.bigDeal && Number.isFinite(value) && value >= config.bigDealMinValue;
  if (byValue) reasons.push('Big deal');

  return { shouldAlert: reasons.length > 0, reasons };
}
