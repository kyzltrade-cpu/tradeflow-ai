import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
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
        '[stripe-webhook] STRIPE_SECRET_KEY could not initialise the Stripe SDK (placeholder or malformed):',
        err instanceof Error ? err.message : 'unknown error'
      );
      return null;
    }
  }
  return stripeClient;
}

const PLAN_COLUMN_MISSING = /column .*\.plan does not exist|42703/i;

const BILLING_NOT_CONFIGURED =
  'Stripe webhook is not configured. Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to real values.';

function isoOrNull(unixSeconds: unknown): string | null {
  const n = Number(unixSeconds);
  if (!Number.isFinite(n) || n <= 0) return null;
  try {
    return new Date(n * 1000).toISOString();
  } catch {
    return null;
  }
}

function currentPeriodEndIso(subscription: Stripe.Subscription): string | null {
  const item = subscription.items?.data?.[0] as unknown as { current_period_end?: number } | undefined;
  return isoOrNull(item?.current_period_end) ?? isoOrNull((subscription as unknown as { current_period_end?: number }).current_period_end);
}

function planFromMetadata(metadata: Stripe.Metadata | null | undefined, fallback: PlanId): PlanId {
  const raw = (metadata?.plan || metadata?.tier || '').toString().trim().toLowerCase();
  if (raw === 'starter' || raw === 'growth' || raw === 'enterprise') return raw;
  if (raw === 'trial' || raw === 'free') return 'trial';
  return fallback;
}

type CompanyTarget = { id: string } | { stripe_customer_id: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyTarget(query: any, target: CompanyTarget) {
  return 'id' in target ? query.eq('id', target.id) : query.eq('stripe_customer_id', target.stripe_customer_id);
}

async function patchCompany(target: CompanyTarget, patch: Record<string, unknown>): Promise<void> {
  const { error } = await applyTarget(supabaseAdmin.from('companies').update(patch), target);
  if (error) {
    console.error('[stripe-webhook] company update failed:', error.message);
  }
}

async function setCompanyPlan(target: CompanyTarget, plan: PlanId): Promise<void> {
  const { error } = await applyTarget(
    supabaseAdmin.from('companies').update({ plan, updated_at: new Date().toISOString() }),
    target
  );
  if (error) {
    if (PLAN_COLUMN_MISSING.test(error.message)) {
      console.error(
        '[stripe-webhook] companies.plan column is missing — plan not persisted. ' +
          'Apply the billing_plan migration (ADD COLUMN plan TEXT DEFAULT \'trial\') and re-deliver this event. ' +
          `Plan would have been set to "${plan}".`
      );
    } else {
      console.error('[stripe-webhook] plan update failed:', error.message);
    }
  }
}

export async function POST(req: NextRequest) {
  const billing = getBillingConfig();

  if (!billing.stripe_usable) {
    const reason = !process.env.STRIPE_SECRET_KEY
      ? 'STRIPE_SECRET_KEY is not set'
      : isPlaceholderSecret(process.env.STRIPE_SECRET_KEY)
        ? 'STRIPE_SECRET_KEY is still a placeholder value'
        : 'STRIPE_SECRET_KEY is not a recognised Stripe key';
    console.warn(`[stripe-webhook] ${reason} — webhook not accepting events.`);
    return NextResponse.json(
      { error: BILLING_NOT_CONFIGURED, code: 'billing_not_configured', reason, mode: billing.mode },
      { status: 503 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || isPlaceholderSecret(webhookSecret)) {
    console.warn('[stripe-webhook] STRIPE_WEBHOOK_SECRET is missing or a placeholder — cannot verify signatures.');
    return NextResponse.json(
      {
        error: 'Stripe webhook secret is not configured. Set STRIPE_WEBHOOK_SECRET to the signing secret from `stripe listen` or the dashboard.',
        code: 'webhook_secret_not_configured',
      },
      { status: 503 }
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: BILLING_NOT_CONFIGURED, code: 'billing_not_configured' },
      { status: 503 }
    );
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const companyId = session.metadata?.company_id;
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
        const subscriptionId =
          typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

        if (companyId) {
          await patchCompany({ id: companyId }, {
            stripe_customer_id: customerId ?? null,
            stripe_subscription_id: subscriptionId ?? null,
            subscription_status: 'active',
            updated_at: new Date().toISOString(),
          });
          await setCompanyPlan({ id: companyId }, planFromMetadata(session.metadata, 'starter'));
        } else {
          console.warn('[stripe-webhook] checkout.session.completed without company_id metadata — skipped.');
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
        if (!customerId) break;

        const statusMap: Record<string, string> = {
          active: 'active',
          past_due: 'past_due',
          canceled: 'cancelled',
          unpaid: 'past_due',
          trialing: 'active',
          incomplete: 'incomplete',
          incomplete_expired: 'expired',
          paused: 'paused',
        };

        const dbStatus = statusMap[subscription.status] || subscription.status;
        const periodEnd = currentPeriodEndIso(subscription);

        const patch: Record<string, unknown> = {
          subscription_status: dbStatus,
          updated_at: new Date().toISOString(),
        };
        if (periodEnd) patch.subscription_current_period_end = periodEnd;

        await patchCompany({ stripe_customer_id: customerId }, patch);

        const paid = dbStatus === 'active';
        await setCompanyPlan(
          { stripe_customer_id: customerId },
          paid ? planFromMetadata(subscription.metadata, 'starter') : 'trial'
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
        if (!customerId) break;

        await patchCompany({ stripe_customer_id: customerId }, {
          subscription_status: 'cancelled',
          updated_at: new Date().toISOString(),
        });
        await setCompanyPlan({ stripe_customer_id: customerId }, 'trial');
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;

        await patchCompany({ stripe_customer_id: customerId }, {
          subscription_status: 'past_due',
          updated_at: new Date().toISOString(),
        });
        await setCompanyPlan({ stripe_customer_id: customerId }, 'trial');
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;

        await patchCompany({ stripe_customer_id: customerId }, {
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        });
        await setCompanyPlan(
          { stripe_customer_id: customerId },
          planFromMetadata(null, 'starter')
        );
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[stripe-webhook] Error processing event:', event.type, err);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
