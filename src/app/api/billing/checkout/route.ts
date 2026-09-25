import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireAuth } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let stripeClient: any = null;
function getStripe() {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-08-26.dahlia',
    });
  }
  return stripeClient;
}

const TIERS = {
  starter: {
    name: 'Sailwise Starter',
    description: 'Email-first assistant · 1,000 AI conversations/mo',
    monthly: 188000, // HKD HK$1,880.00
    annual: 150400, // HKD HK$1,504.00/mo (20% off)
  },
  growth: {
    name: 'Sailwise Growth',
    description: 'Email-first assistant · 5,000 AI conversations/mo',
    monthly: 248000, // HKD HK$2,480.00
    annual: 198400, // HKD HK$1,984.00/mo (20% off)
  },
  enterprise: {
    name: 'Sailwise Enterprise',
    description: 'Email-first assistant · Unlimited AI · Dedicated manager',
    monthly: 488000, // HKD HK$4,880.00
    annual: 390400, // HKD HK$3,904.00/mo (20% off)
  },
} as const;

type Tier = keyof typeof TIERS;

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }

    // Parse tier from request body
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

    // Create or reuse Stripe customer
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

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
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
        },
      ],
      metadata: {
        company_id: auth.companyId,
        tier,
        interval,
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
