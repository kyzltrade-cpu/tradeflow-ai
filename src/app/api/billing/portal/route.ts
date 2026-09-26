import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireAuth } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getBillingConfig, isPlaceholderSecret } from '@/lib/billing/limits';

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
        '[billing:portal] STRIPE_SECRET_KEY could not initialise the Stripe SDK (placeholder or malformed):',
        err instanceof Error ? err.message : 'unknown error'
      );
      return null;
    }
  }
  return stripeClient;
}

const BILLING_NOT_CONFIGURED =
  'Billing is not configured by the operator yet. Set STRIPE_SECRET_KEY (and STRIPE_WEBHOOK_SECRET) to a real Stripe key, then reload.';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);

    const billing = getBillingConfig();
    if (!billing.stripe_usable) {
      const reason = !process.env.STRIPE_SECRET_KEY
        ? 'STRIPE_SECRET_KEY is not set'
        : isPlaceholderSecret(process.env.STRIPE_SECRET_KEY)
          ? 'STRIPE_SECRET_KEY is still a placeholder value'
          : 'STRIPE_SECRET_KEY is not a recognised Stripe key';
      console.warn(`[billing:portal] ${reason} — customer portal disabled, returning 503.`);
      return NextResponse.json(
        { error: BILLING_NOT_CONFIGURED, code: 'billing_not_configured', reason, mode: billing.mode },
        { status: 503 }
      );
    }

    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('stripe_customer_id')
      .eq('id', auth.companyId)
      .single();

    if (!company?.stripe_customer_id) {
      return NextResponse.json(
        {
          error: 'No active subscription',
          code: 'no_subscription',
          hint: 'Subscribe to a plan first, then manage it here.',
        },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const stripe = getStripe();
    if (!stripe) {
      console.warn('[billing:portal] Stripe SDK unavailable — customer portal disabled.');
      return NextResponse.json(
        { error: BILLING_NOT_CONFIGURED, code: 'billing_not_configured', mode: billing.mode },
        { status: 503 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: `${appUrl}/admin/settings?billing=portal_return`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[billing:portal] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
