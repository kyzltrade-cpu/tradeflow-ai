import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireAuth } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getBillingConfig, isPlaceholderSecret, type PlanId } from '@/lib/billing/limits';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let stripeClient: any = null;
function getStripe() {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    try {
      stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2026-08-26.dahlia',
      });
    } catch (err) {
      console.error(
        '[billing:checkout] STRIPE_SECRET_KEY could not initialise the Stripe SDK (placeholder or malformed):',
        err instanceof Error ? err.message : 'unknown error'
      );
      return null;
    }
  }
  return stripeClient;
}

const TIERS = {
  starter: {
    name: 'Sailwise Starter',
    description: 'Email-first assistant · 1,000 AI conversations/mo',
    monthly: 188000,
    annual: 150400,
  },
  growth: {
    name: 'Sailwise Growth',
    description: 'Email-first assistant · 5,000 AI conversations/mo',
    monthly: 248000,
    annual: 198400,
  },
  enterprise: {
    name: 'Sailwise Enterprise',
    description: 'Email-first assistant · Unlimited AI · Dedicated manager',
    monthly: 488000,
    annual: 390400,
  },
} as const;

type Tier = keyof typeof TIERS;

const BILLING_NOT_CONFIGURED =
  'Billing is not configured by the operator yet. Set STRIPE_SECRET_KEY (and STRIPE_WEBHOOK_SECRET) to a real Stripe key, then reload.';

function priceIdEnvKey(tier: Tier, interval: 'month' | 'year'): string {
  return `STRIPE_PRICE_${tier.toUpperCase()}_${interval === 'year' ? 'YEAR' : 'MONTH'}`;
}

export async function POST(req: NextRequest) {
  try {
    const billing = getBillingConfig();

    if (!billing.stripe_usable) {
      const reason = !process.env.STRIPE_SECRET_KEY
        ? 'STRIPE_SECRET_KEY is not set'
        : isPlaceholderSecret(process.env.STRIPE_SECRET_KEY)
          ? 'STRIPE_SECRET_KEY is still a placeholder value'
          : 'STRIPE_SECRET_KEY is not a recognised Stripe key';
      console.warn(`[billing:checkout] ${reason} — checkout disabled, returning 503.`);
      return NextResponse.json(
        { error: BILLING_NOT_CONFIGURED, code: 'billing_not_configured', reason, mode: billing.mode },
        { status: 503 }
      );
    }

    const stripe = getStripe();
    if (!stripe) {
      console.warn('[billing:checkout] Stripe SDK unavailable — checkout disabled.');
      return NextResponse.json(
        { error: BILLING_NOT_CONFIGURED, code: 'billing_not_configured', mode: billing.mode },
        { status: 503 }
      );
    }

    let tier: Tier = 'starter';
    let interval: 'month' | 'year' = 'month';
    try {
      const body = await req.json();
      if (body.tier && TIERS[body.tier as Tier]) {
        tier = body.tier as Tier;
      }
      if (body.interval === 'year') {
        interval = 'year';
      }
    } catch {
      // Default to starter if no body
    }

    const auth = await requireAuth(req);

    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('name, stripe_customer_id')
      .eq('id', auth.companyId)
      .single();

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    let customerId = company.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: auth.user.email,
        name: company.name || undefined,
        metadata: { company_id: auth.companyId },
      });
      customerId = customer.id;

      await supabaseAdmin
        .from('companies')
        .update({ stripe_customer_id: customerId })
        .eq('id', auth.companyId);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const tierConfig = TIERS[tier];
    const configuredPriceId = process.env[priceIdEnvKey(tier, interval)];

    const lineItem: Record<string, unknown> = configuredPriceId
      ? { price: configuredPriceId, quantity: 1 }
      : {
          price_data: {
            currency: 'hkd',
            product_data: {
              name: tierConfig.name,
              description: tierConfig.description,
            },
            recurring: { interval },
            unit_amount: interval === 'year' ? tierConfig.annual : tierConfig.monthly,
          },
          quantity: 1,
        };

    if (!configuredPriceId) {
      console.warn(
        `[billing:checkout] ${priceIdEnvKey(tier, interval)} is not set — using inline price_data for ${tier}/${interval}.`
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [lineItem as never],
      metadata: {
        company_id: auth.companyId,
        tier,
        interval,
        plan: tier as PlanId,
      },
      client_reference_id: auth.companyId,
      subscription_data: {
        metadata: { company_id: auth.companyId, tier, plan: tier },
      },
      success_url: `${appUrl}/admin/settings?billing=success`,
      cancel_url: `${appUrl}/admin/settings?billing=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[billing:checkout] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
