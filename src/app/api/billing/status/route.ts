import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getPlanLimits, getCapsForPlan, type PlanId } from '@/lib/billing/limits';

const PLAN_LABELS: Record<PlanId, { en: string; zh: string }> = {
  trial: { en: 'Free trial', zh: '免費試用' },
  starter: { en: 'Starter SDR', zh: 'Starter SDR' },
  growth: { en: 'Growth Trading Desk', zh: 'Growth Trading Desk' },
  enterprise: { en: 'Enterprise', zh: 'Enterprise' },
};

export const dynamic = 'force-dynamic';

// GET /api/billing/status — current plan, usage vs caps, and whether billing is usable
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }

    const snapshot = await getPlanLimits(auth.companyId);

    const missing = [
      !snapshot.billing.env.secret_key && 'STRIPE_SECRET_KEY',
      !snapshot.billing.env.webhook_secret && 'STRIPE_WEBHOOK_SECRET',
      !snapshot.billing.env.publishable_key && 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    ].filter(Boolean) as string[];

    return NextResponse.json({
      company_id: snapshot.company_id,
      plan: snapshot.plan,
      plan_label: PLAN_LABELS[snapshot.plan],
      plan_source: snapshot.plan_source,
      subscription_status: snapshot.subscription_status,
      subscription_current_period_end: snapshot.subscription_current_period_end,
      has_billing_customer: !!snapshot.stripe_customer_id,
      is_demo_company: snapshot.is_demo_company,
      billing: {
        mode: snapshot.billing.mode,
        usable: snapshot.billing.stripe_usable,
        enforcement_enabled: snapshot.billing.enforcement_enabled,
        enforcement_off_reason: snapshot.billing.enforcement_off_reason,
        missing_env: missing,
      },
      usage: snapshot.usage,
      limits: snapshot.limits,
      all_caps: {
        trial: getCapsForPlan('trial'),
        starter: getCapsForPlan('starter'),
        growth: getCapsForPlan('growth'),
        enterprise: getCapsForPlan('enterprise'),
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[billing:status] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
