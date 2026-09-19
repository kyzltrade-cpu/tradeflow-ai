/**
 * Cron: Process due follow-ups
 *
 * GET /api/cron/follow-ups
 *
 * Finds all follow_up_items that are scheduled and due,
 * generates the message via NIM, sends via the item's channel,
 * and marks items as sent.
 *
 * Call this via Vercel Cron or a scheduler every ~15 minutes:
 *   vercel.json → { "crons": [{ "path": "/api/cron/follow-ups", "schedule": "0,15,30,45 * * * *" }] }
 *
 * Protected by CRON_SECRET (Bearer token).
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';
import { generateFollowUpMessage } from '@/lib/follow-up-engine';
import type { FollowUpItem } from '@/types/trading';
import type { FollowUpContext } from '@/lib/follow-up-engine';

const CRON_SECRET = process.env.CRON_SECRET;

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

function verifyCron(req: NextRequest): boolean {
  if (!CRON_SECRET) {
    console.warn('[cron/follow-ups] CRON_SECRET not set — allowing request in dev');
    return true;
  }
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${CRON_SECRET}`;
}

// ---------------------------------------------------------------------------
// Types (local)
// ---------------------------------------------------------------------------

interface DueItemRow {
  id: string;
  sequence_id: string;
  company_id: string;
  step_number: number;
  delay_days: number;
  scheduled_for: string;
  status: string;
  message_type: string;
  subject: string | null;
  message_body: string | null;
  follow_up_sequences: {
    id: string;
    opportunity_id: string;
    channel: string;
    status: string;
    quote_id: string | null;
  };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date().toISOString();

  // ── 1. Fetch all due items across all companies ──────────────────
  const { data: items, error: fetchError } = await supabaseAdmin
    .from('follow_up_items')
    .select(`
      id,
      sequence_id,
      company_id,
      step_number,
      delay_days,
      scheduled_for,
      status,
      message_type,
      subject,
      message_body,
      follow_up_sequences!inner (
        id,
        opportunity_id,
        channel,
        status,
        quote_id
      )
    `)
    .eq('status', 'scheduled')
    .lte('scheduled_for', now)
    .limit(50);

  if (fetchError) {
    console.error('[cron/follow-ups] Fetch error:', fetchError.message);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No due follow-ups' });
  }

  // Filter to active sequences only
  const activeItems = (items as unknown as DueItemRow[]).filter(
    (item) => item.follow_up_sequences?.status === 'active'
  );

  if (activeItems.length === 0) {
    return NextResponse.json({ processed: 0, message: 'All due items belong to inactive sequences' });
  }

  let processed = 0;
  let failed = 0;

  // ── 2. Process each item ──────────────────────────────────────────
  for (const item of activeItems) {
    try {
      const seq = item.follow_up_sequences;
      const channel = (seq.channel as 'email' | 'whatsapp') || 'email';

      // ── Build context for NIM generation ────────────────────────
      const context = await buildContext(item);

      // ── Generate or use existing message body ───────────────────
      let messageBody = item.message_body;
      let subject = item.subject || `Follow-up: Step ${item.step_number}`;

      if (!messageBody) {
        // Generate via NIM
        const followUpItem: FollowUpItem = {
          id: item.id,
          sequenceId: item.sequence_id,
          stepOrder: item.step_number,
          delayDays: item.delay_days,
          channel,
          templateId: null,
          subject: item.subject,
          bodyTemplate: null,
          status: 'scheduled',
          scheduledFor: item.scheduled_for,
          sentAt: null,
          completedAt: null,
          cancelledAt: null,
          cancelReason: null,
          createdAt: now,
          updatedAt: now,
        };

        const generated = await generateFollowUpMessage(followUpItem, context);
        // generated format: "Subject: ...\n\nBody..."
        const parts = generated.split('\n\n');
        if (parts.length >= 2 && parts[0].toLowerCase().startsWith('subject:')) {
          subject = parts[0].replace(/^subject:\s*/i, '').trim();
          messageBody = parts.slice(1).join('\n\n').trim();
        } else {
          messageBody = generated;
        }
      }

      // ── Resolve customer email ─────────────────────────────────
      let customerEmail: string | null = null;
      if (seq.opportunity_id) {
        const { data: opp } = await supabaseAdmin
          .from('opportunities')
          .select('customer_id')
          .eq('id', seq.opportunity_id)
          .single();

        if (opp?.customer_id) {
          const { data: customer } = await supabaseAdmin
            .from('customers')
            .select('email')
            .eq('id', opp.customer_id)
            .single();
          customerEmail = customer?.email || null;
        }
      }

      // ── Send via channel ───────────────────────────────────────
      let sendResult: { success: boolean; error?: string } = { success: false, error: 'Unknown channel' };

      if (channel === 'email' && customerEmail) {
        const { data: company } = await supabaseAdmin
          .from('companies')
          .select('name, email_sender_name')
          .eq('id', item.company_id)
          .single();

        const result = await sendEmail({
          to: customerEmail,
          subject,
          html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #374151; font-size: 14px; line-height: 1.7; max-width: 600px; margin: 0 auto; padding: 24px;">${messageBody.replace(/\n/g, '<br>')}</div>`,
          from: company?.email_sender_name
            ? `${company.email_sender_name} <onboarding@resend.dev>`
            : undefined,
        });
        sendResult = { success: result.success, error: result.error };
      } else if (channel === 'whatsapp') {
        sendResult = { success: false, error: 'WhatsApp sending not yet implemented' };
      }

      // ── Update item status ────────────────────────────────────
      const newStatus = sendResult.success ? 'sent' : 'failed';
      await supabaseAdmin
        .from('follow_up_items')
        .update({
          status: newStatus,
          message_body: messageBody,
          subject,
          sent_at: sendResult.success ? now : null,
          error_message: sendResult.error || null,
          updated_at: now,
        })
        .eq('id', item.id);

      // ── Log audit ─────────────────────────────────────────────
      await supabaseAdmin.from('audit_events').insert({
        company_id: item.company_id,
        event_type: sendResult.success ? 'sent' : 'failed',
        entity_type: 'follow_up_item',
        entity_id: item.id,
        actor_id: null,
        actor_email: 'cron',
        metadata: {
          sequence_id: item.sequence_id,
          channel,
          step_number: item.step_number,
          subject,
          recipient: customerEmail,
          email_id: null,
          error: sendResult.error || null,
        },
      });

      if (sendResult.success) {
        processed++;
      } else {
        failed++;
        console.error(`[cron/follow-ups] Item ${item.id} send failed:`, sendResult.error);
      }
    } catch (itemErr) {
      failed++;
      console.error(`[cron/follow-ups] Item ${item.id} error:`, itemErr);

      // Mark as failed
      await supabaseAdmin
        .from('follow_up_items')
        .update({
          status: 'failed',
          error_message: itemErr instanceof Error ? itemErr.message : 'Unknown error',
          updated_at: now,
        })
        .eq('id', item.id);
    }
  }

  return NextResponse.json({
    processed,
    failed,
    total: activeItems.length,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function buildContext(item: DueItemRow): Promise<FollowUpContext> {
  const seq = item.follow_up_sequences;

  let customerName = 'the customer';
  let customerCompany: string | null = null;
  let productName: string | null = null;
  let quantity: number | null = null;
  let unit: string | null = null;
  let quoteTotal: number | null = null;
  let currency: string | null = null;
  let quoteSentAt: string | null = null;

  // Fetch opportunity details
  if (seq.opportunity_id) {
    const { data: opp } = await supabaseAdmin
      .from('opportunities')
      .select('title, customer_id, estimated_value, currency')
      .eq('id', seq.opportunity_id)
      .single();

    if (opp) {
      if (opp.customer_id) {
        const { data: customer } = await supabaseAdmin
          .from('customers')
          .select('name, company')
          .eq('id', opp.customer_id)
          .single();
        if (customer) {
          customerName = customer.name;
          customerCompany = customer.company;
        }
      }
      quoteTotal = opp.estimated_value;
      currency = opp.currency;
    }
  }

  // Fetch quote details
  if (seq.quote_id) {
    const { data: quote } = await supabaseAdmin
      .from('quotes')
      .select('sent_at, quote_line_items')
      .eq('id', seq.quote_id)
      .single();

    if (quote) {
      quoteSentAt = quote.sent_at;
      const lineItems = quote.quote_line_items as Array<Record<string, unknown>> | null;
      if (lineItems && lineItems.length > 0) {
        const first = lineItems[0];
        productName = (first.product_name as string) || null;
        quantity = (first.quantity as number) || null;
        unit = (first.unit as string) || null;
      }
    }
  }

  const daysSinceSent = quoteSentAt
    ? Math.round((Date.now() - new Date(quoteSentAt).getTime()) / 86_400_000)
    : item.delay_days;

  return {
    opportunityTitle: seq.opportunity_id?.slice(0, 8) || 'your inquiry',
    customerName,
    customerCompany,
    productName,
    quantity,
    unit,
    quoteTotal,
    currency,
    quoteSentAt,
    daysSinceSent,
    stepNumber: item.step_number,
  };
}
