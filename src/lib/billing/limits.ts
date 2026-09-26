import { supabaseAdmin } from '@/lib/supabase';

export const DEMO_COMPANY_ID = '99b52405-c9f2-4ac0-bf7e-69b10c3cfea5';

export type PlanId = 'trial' | 'starter' | 'growth' | 'enterprise';

export type MeteredAction = 'ai_quote_draft' | 'quote_send';

export type StripeMode = 'unconfigured' | 'placeholder' | 'test' | 'live';

export interface PlanCaps {
  ai_quote_drafts_per_month: number | null;
  emails_sent_per_month: number | null;
}

export interface PlanUsage {
  ai_quote_draft: number;
  quote_send: number;
  period_start: string;
  period_end: string;
}

export interface BillingConfig {
  mode: StripeMode;
  stripe_usable: boolean;
  enforcement_enabled: boolean;
  enforcement_off_reason: string | null;
  env: {
    secret_key: boolean;
    webhook_secret: boolean;
    publishable_key: boolean;
  };
}

export interface PlanSnapshot {
  company_id: string;
  plan: PlanId;
  plan_source: 'plan_column' | 'subscription_status' | 'default_trial';
  subscription_status: string;
  subscription_current_period_end: string | null;
  stripe_customer_id: string | null;
  is_demo_company: boolean;
  billing: BillingConfig;
  limits: PlanCaps;
  usage: PlanUsage;
  bypass_reason?: string;
}

export type PlanLimitResult =
  | {
      allowed: true;
      enforced: false;
      bypass_reason: string | null;
      plan: PlanId;
      limits: PlanCaps;
      usage: PlanUsage;
    }
  | {
      allowed: false;
      enforced: true;
      code: 'plan_limit_reached';
      status: 402;
      plan: PlanId;
      action: MeteredAction;
      limit: number;
      used: number;
      error: string;
    };

const DEFAULT_CAPS: Record<PlanId, PlanCaps> = {
  trial: { ai_quote_drafts_per_month: 50, emails_sent_per_month: 25 },
  starter: { ai_quote_drafts_per_month: null, emails_sent_per_month: null },
  growth: { ai_quote_drafts_per_month: null, emails_sent_per_month: null },
  enterprise: { ai_quote_drafts_per_month: null, emails_sent_per_month: null },
};

const PLAN_ALIASES: Record<string, PlanId> = {
  trial: 'trial',
  free: 'trial',
  freetrial: 'trial',
  'free_trial': 'trial',
  starter: 'starter',
  start: 'starter',
  'starter_sdr': 'starter',
  growth: 'growth',
  'growth_trading_desk': 'growth',
  enterprise: 'enterprise',
};

const ACTION_CAP_KEY: Record<MeteredAction, keyof PlanCaps> = {
  ai_quote_draft: 'ai_quote_drafts_per_month',
  quote_send: 'emails_sent_per_month',
};

const ACTION_USAGE_KEY: Record<MeteredAction, keyof Pick<PlanUsage, 'ai_quote_draft' | 'quote_send'>> = {
  ai_quote_draft: 'ai_quote_draft',
  quote_send: 'quote_send',
};

const ACTION_LABEL: Record<MeteredAction, string> = {
  ai_quote_draft: 'AI quote drafts',
  quote_send: 'emails sent',
};

const PLACEHOLDER_PATTERNS: RegExp[] = [
  /^your[_-]/i,
  /placeholder/i,
  /changeme/i,
  /^x{3,}$/i,
  /example/i,
  /^<.*>$/,
  /replace[_-]?me/i,
  /^todo/i,
  /^dummy/i,
];

export function isPlaceholderSecret(value: string | undefined | null): boolean {
  if (!value) return true;
  const v = value.trim();
  if (!v) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(v));
}

function classifyKey(value: string | undefined | null, kind: 'secret' | 'publishable' | 'webhook'): StripeMode {
  if (!value || !value.trim()) return 'unconfigured';
  if (isPlaceholderSecret(value)) return 'placeholder';
  const v = value.trim();
  if (kind === 'webhook') return v.startsWith('whsec_') ? 'live' : 'test';
  if (/_live_/.test(v)) return 'live';
  if (/_test_/.test(v)) return 'test';
  if (/^pk_/.test(v) || /^sk_/.test(v) || /^rk_/.test(v)) return 'test';
  return 'test';
}

function readBooleanEnv(name: string): boolean | null {
  const raw = process.env[name];
  if (raw === undefined || raw === null) return null;
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (['on', '1', 'true', 'yes', 'enabled', 'enforce', 'force', 'live', 'test'].includes(v)) return true;
  if (['off', '0', 'false', 'no', 'disabled', 'disable', 'none', 'noop'].includes(v)) return false;
  return null;
}

function readCapEnv(plan: PlanId, key: keyof PlanCaps): number | null | undefined {
  const suffix = key === 'ai_quote_drafts_per_month' ? 'AI_QUOTE_DRAFT_LIMIT' : 'EMAIL_SEND_LIMIT';
  const name = plan.toUpperCase() + '_' + suffix;
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw.trim() === '') return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.floor(n);
}

export function getBillingConfig(): BillingConfig {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  const mode = classifyKey(secretKey, 'secret');
  const stripe_usable = mode === 'test' || mode === 'live';

  const limitFlag = readBooleanEnv('LIMIT_ENFORCEMENT');
  const billingModeFlag = readBooleanEnv('BILLING_MODE');

  let enforcement_enabled: boolean;
  let enforcement_off_reason: string | null = null;

  if (limitFlag === false) {
    enforcement_enabled = false;
    enforcement_off_reason = 'LIMIT_ENFORCEMENT is explicitly off';
  } else if (limitFlag === true) {
    enforcement_enabled = true;
  } else if (billingModeFlag === false) {
    enforcement_enabled = false;
    enforcement_off_reason = 'BILLING_MODE is explicitly off';
  } else if (billingModeFlag === true) {
    enforcement_enabled = true;
  } else if (!secretKey || !secretKey.trim()) {
    enforcement_enabled = false;
    enforcement_off_reason = 'STRIPE_SECRET_KEY is not set';
  } else if (isPlaceholderSecret(secretKey)) {
    enforcement_enabled = false;
    enforcement_off_reason = 'STRIPE_SECRET_KEY is still a placeholder';
  } else {
    enforcement_enabled = true;
  }

  return {
    mode,
    stripe_usable,
    enforcement_enabled,
    enforcement_off_reason,
    env: {
      secret_key: !!secretKey && !isPlaceholderSecret(secretKey),
      webhook_secret: !!webhookSecret && !isPlaceholderSecret(webhookSecret),
      publishable_key: !!publishableKey && !isPlaceholderSecret(publishableKey),
    },
  };
}

export function getCapsForPlan(plan: PlanId): PlanCaps {
  const base = DEFAULT_CAPS[plan];
  const draft = readCapEnv(plan, 'ai_quote_drafts_per_month');
  const send = readCapEnv(plan, 'emails_sent_per_month');
  return {
    ai_quote_drafts_per_month: draft === undefined ? base.ai_quote_drafts_per_month : draft,
    emails_sent_per_month: send === undefined ? base.emails_sent_per_month : send,
  };
}

export function normalizePlan(value: unknown): PlanId | null {
  if (typeof value !== 'string') return null;
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!key) return null;
  if (PLAN_ALIASES[key]) return PLAN_ALIASES[key];
  return null;
}

function monthWindow(now = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { start, end };
}

function planFromSubscriptionStatus(status: string | null | undefined): PlanId | null {
  if (!status) return null;
  const s = status.trim().toLowerCase();
  if (s === 'active' || s === 'trialing') return 'starter';
  return null;
}

interface CompanyBillingRow {
  id: string;
  plan?: string | null;
  subscription_status?: string | null;
  subscription_current_period_end?: string | null;
  stripe_customer_id?: string | null;
}

const PLAN_COLUMN_MISSING = /column .*\.plan does not exist|42703/i;

async function readCompanyBilling(companyId: string): Promise<CompanyBillingRow> {
  const fallbackSelect =
    'id, subscription_status, subscription_current_period_end, stripe_customer_id';

  const withPlan = await supabaseAdmin
    .from('companies')
    .select('id, plan, subscription_status, subscription_current_period_end, stripe_customer_id')
    .eq('id', companyId)
    .maybeSingle();

  if (!withPlan.error) {
    return (withPlan.data || { id: companyId }) as CompanyBillingRow;
  }

  if (PLAN_COLUMN_MISSING.test(withPlan.error.message || '')) {
    const withoutPlan = await supabaseAdmin
      .from('companies')
      .select(fallbackSelect)
      .eq('id', companyId)
      .maybeSingle();
    if (!withoutPlan.error) {
      return (withoutPlan.data || { id: companyId }) as CompanyBillingRow;
    }
    console.error('[billing/limits] company lookup failed:', withoutPlan.error.message);
    return { id: companyId };
  }

  console.error('[billing/limits] company lookup failed:', withPlan.error.message);
  return { id: companyId };
}

interface CountResult {
  count: number;
  failed: boolean;
}

async function countRows(
  table: string,
  companyId: string,
  since: string,
  extra?: Record<string, unknown>
): Promise<CountResult> {
  let query = supabaseAdmin
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gte('created_at', since);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) query = query.eq(k, v);
  }
  const { count, error } = await query;
  if (error) {
    console.error(`[billing/limits] usage count failed on ${table}:`, error.message);
    return { count: 0, failed: true };
  }
  return { count: count ?? 0, failed: false };
}

async function countSentQuotes(companyId: string, since: string): Promise<CountResult> {
  const { count, error } = await supabaseAdmin
    .from('quotes')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .not('sent_at', 'is', null)
    .gte('sent_at', since);
  if (error) {
    console.error('[billing/limits] sent quote count failed:', error.message);
    return { count: 0, failed: true };
  }
  return { count: count ?? 0, failed: false };
}

async function readUsage(companyId: string, window: { start: Date; end: Date }): Promise<PlanUsage> {
  const since = window.start.toISOString();

  const drafts = await countRows('audit_events', companyId, since, {
    entity_type: 'quote',
    'metadata->>auto_created': 'true',
  });
  const draftsFallback =
    drafts.failed ? await countRows('quotes', companyId, since) : { count: drafts.count, failed: false };

  const sends = await countRows('audit_events', companyId, since, { event_type: 'sent' });
  const sendsFallback =
    sends.failed ? await countSentQuotes(companyId, since) : { count: sends.count, failed: false };

  return {
    ai_quote_draft: draftsFallback.count,
    quote_send: sendsFallback.count,
    period_start: window.start.toISOString(),
    period_end: window.end.toISOString(),
  };
}

export async function getPlanLimits(companyId: string): Promise<PlanSnapshot> {
  const billing = getBillingConfig();
  const window = monthWindow();

  if (!companyId) {
    return {
      company_id: '',
      plan: 'trial',
      plan_source: 'default_trial',
      subscription_status: 'unknown',
      subscription_current_period_end: null,
      stripe_customer_id: null,
      is_demo_company: false,
      billing,
      limits: getCapsForPlan('trial'),
      usage: { ai_quote_draft: 0, quote_send: 0, period_start: window.start.toISOString(), period_end: window.end.toISOString() },
    };
  }

  const row = await readCompanyBilling(companyId);
  const isDemo = companyId === DEMO_COMPANY_ID;

  const fromColumn = normalizePlan(row.plan);
  const fromStatus = planFromSubscriptionStatus(row.subscription_status);
  const plan = fromColumn || fromStatus || 'trial';
  const plan_source: PlanSnapshot['plan_source'] = fromColumn
    ? 'plan_column'
    : fromStatus
      ? 'subscription_status'
      : 'default_trial';

  return {
    company_id: companyId,
    plan,
    plan_source,
    subscription_status: row.subscription_status || 'none',
    subscription_current_period_end: row.subscription_current_period_end || null,
    stripe_customer_id: row.stripe_customer_id || null,
    is_demo_company: isDemo,
    billing,
    limits: getCapsForPlan(plan),
    usage: await readUsage(companyId, window),
  };
}

function unverifiedUsage(): PlanUsage {
  const window = monthWindow();
  return {
    ai_quote_draft: 0,
    quote_send: 0,
    period_start: window.start.toISOString(),
    period_end: window.end.toISOString(),
  };
}

function unverifiedSnapshot(companyId: string, billing: BillingConfig, reason: string): PlanSnapshot {
  return {
    company_id: companyId,
    plan: 'trial',
    plan_source: 'default_trial',
    subscription_status: 'unknown',
    subscription_current_period_end: null,
    stripe_customer_id: null,
    is_demo_company: companyId === DEMO_COMPANY_ID,
    billing,
    limits: getCapsForPlan('trial'),
    usage: unverifiedUsage(),
    bypass_reason: reason,
  };
}

export async function enforcePlanLimit(companyId: string, action: MeteredAction): Promise<PlanLimitResult> {
  const billing = getBillingConfig();

  const fastAllow = (reason: string): PlanLimitResult => {
    const snapshot = unverifiedSnapshot(companyId, billing, reason);
    return {
      allowed: true,
      enforced: false,
      bypass_reason: reason,
      plan: snapshot.plan,
      limits: snapshot.limits,
      usage: snapshot.usage,
    };
  };

  if (!companyId) return fastAllow('no company on this request');
  if (companyId === DEMO_COMPANY_ID) return fastAllow('demo company is exempt from plan limits');
  if (!billing.enforcement_enabled) {
    return fastAllow(billing.enforcement_off_reason || 'limit enforcement is off');
  }

  const snapshot = await getPlanLimits(companyId);

  if (snapshot.is_demo_company) return fastAllow('demo company is exempt from plan limits');
  if (!snapshot.billing.enforcement_enabled) {
    return fastAllow(snapshot.billing.enforcement_off_reason || 'limit enforcement is off');
  }

  const cap = snapshot.limits[ACTION_CAP_KEY[action]];
  if (cap === null || !Number.isFinite(cap)) {
    return {
      allowed: true,
      enforced: false,
      bypass_reason: `${snapshot.plan} plan has no cap for this action`,
      plan: snapshot.plan,
      limits: snapshot.limits,
      usage: snapshot.usage,
    };
  }

  const used = snapshot.usage[ACTION_USAGE_KEY[action]];

  if (used < cap) {
    return {
      allowed: true,
      enforced: false,
      bypass_reason: null,
      plan: snapshot.plan,
      limits: snapshot.limits,
      usage: snapshot.usage,
    };
  }

  return {
    allowed: false,
    enforced: true,
    code: 'plan_limit_reached',
    status: 402,
    plan: snapshot.plan,
    action,
    limit: cap,
    used,
    error:
      `Free trial limit reached — your plan includes ${cap} ${ACTION_LABEL[action]} per month. ` +
      `Add a payment method in Settings → Billing to keep going.`,
  };
}

export function planLimitResponse(result: Extract<PlanLimitResult, { allowed: false }>): {
  error: string;
  code: string;
  plan: string;
  action: string;
  limit: number;
  used: number;
  upgrade_url: string;
} {
  return {
    error: result.error,
    code: result.code,
    plan: result.plan,
    action: result.action,
    limit: result.limit,
    used: result.used,
    upgrade_url: '/admin/settings#billing',
  };
}
