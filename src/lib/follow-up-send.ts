import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';

/**
 * Follow-up sending lives in one place so the cron job and the manual
 * "Send draft" button in the queue cannot drift apart.
 *
 * The status write is the load-bearing part of this module: `follow_up_items`
 * is selected by `status = 'scheduled'`, so if a manual send delivered the
 * email but failed to flip the status, cron would send the same follow-up to
 * the same customer again. Every send here goes through `deliverFollowUp`,
 * which always writes the terminal status.
 */

export type FollowUpRecipient = {
  email: string;
  /** Best available human name, for audit records and fallback greetings. */
  name: string | null;
};

/**
 * Walks sequence → opportunity → contact/customer for a deliverable address.
 *
 * The contact is preferred over the customer record: a follow-up about
 * someone's quote should land with that person, not a shared sales inbox.
 * The customer address is the fallback for opportunities with no linked
 * contact, which is the same fallback the cron job has always used.
 */
export async function resolveFollowUpRecipient(
  sequenceId: string,
  companyId: string
): Promise<FollowUpRecipient | null> {
  const { data: seq } = await supabaseAdmin
    .from('follow_up_sequences')
    .select('id, opportunity_id')
    .eq('id', sequenceId)
    .eq('company_id', companyId)
    .maybeSingle();

  if (!seq?.opportunity_id) return null;

  const { data: opp } = await supabaseAdmin
    .from('opportunities')
    .select('contact_id, customer_id')
    .eq('id', seq.opportunity_id)
    .eq('company_id', companyId)
    .maybeSingle();

  if (!opp) return null;

  if (opp.contact_id) {
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('email, full_name')
      .eq('id', opp.contact_id)
      .eq('company_id', companyId)
      .maybeSingle();

    const email = (contact?.email || '').trim();
    if (email) return { email, name: contact?.full_name ?? null };
  }

  if (opp.customer_id) {
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('email, trading_name, legal_name')
      .eq('id', opp.customer_id)
      .eq('company_id', companyId)
      .maybeSingle();

    const email = (customer?.email || '').trim();
    if (email) {
      return { email, name: customer?.trading_name || customer?.legal_name || null };
    }
  }

  return null;
}

export type DeliverFollowUpResult = {
  success: boolean;
  /** Present on failure; safe to surface to the operator. */
  error?: string;
  /**
   * True when the item is missing or belongs to another company/sequence.
   * Callers must map this to 404, not 502 — it means "you cannot address this
   * row", not "the mail server is down", and conflating the two would tell an
   * operator to go fix their sending address for a request that was never
   * going to be sent.
   */
  notFound?: boolean;
  recipient?: string;
  /** Resend code, kept for parity with the quote send route's error payload. */
  code?: string;
};

function toHtml(body: string): string {
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #374151; font-size: 14px; line-height: 1.7; max-width: 600px; margin: 0 auto; padding: 24px;">${body.replace(/\n/g, '<br>')}</div>`;
}

/**
 * Sends `body` to the sequence's customer and records the outcome on the
 * item, in both directions:
 *
 *   delivered → status 'sent',  sent_at set
 *   failed    → status 'failed', sent_at left null so it stays retryable
 *
 * The sequence's active/inactive state is deliberately *not* checked here.
 * A click on "Send draft" is a human approving that specific email, so it is
 * allowed to go out on a paused sequence; only the cron path applies the
 * active-sequence filter, because nobody is watching when it runs.
 */
export async function deliverFollowUp(params: {
  sequenceId: string;
  itemId: string;
  companyId: string;
  subject: string;
  body: string;
  /** Overrides the resolved address; used when the operator picked one. */
  recipientEmail?: string | null;
}): Promise<DeliverFollowUpResult> {
  const { sequenceId, itemId, companyId, subject, body, recipientEmail } = params;
  const now = new Date().toISOString();

  // Ownership check. Scoped by company and by the parent sequence so a
  // crafted itemId from another tenant cannot be sent.
  const { data: item } = await supabaseAdmin
    .from('follow_up_items')
    .select('id')
    .eq('id', itemId)
    .eq('sequence_id', sequenceId)
    .eq('company_id', companyId)
    .maybeSingle();

  if (!item) {
    return {
      success: false,
      notFound: true,
      error: 'Follow-up item not found in this sequence',
    };
  }

  const recipient = recipientEmail?.trim()
    ? { email: recipientEmail.trim(), name: null }
    : await resolveFollowUpRecipient(sequenceId, companyId);

  if (!recipient) {
    return {
      success: false,
      error:
        'No contact email on this opportunity. Link a contact with an email, or set one on the customer, before sending.',
    };
  }

  const result = await sendEmail({
    to: recipient.email,
    subject,
    html: toHtml(body),
    companyId,
  });

  // `error_message` is deliberately absent. follow_up_items has no such
  // column, and PostgREST rejects the entire update when one is named — which
  // silently left every send stuck on 'scheduled', so the 02:00 cron mailed
  // the same follow-up again every day. The failure reason is recorded in
  // audit_events by the caller instead. Verified against the live schema.
  const { error: updateError } = await supabaseAdmin
    .from('follow_up_items')
    .update({
      status: result.success ? 'sent' : 'failed',
      // Persist the exact text that went out, so the audit trail records what
      // was actually sent rather than what was originally generated.
      message_body: body,
      subject,
      sent_at: result.success ? now : null,
      updated_at: now,
    })
    .eq('id', itemId)
    .eq('company_id', companyId);

  // If the status write itself fails the email has already gone out but the
  // row still reads 'scheduled', so the next cron run would send it again.
  // Surface that loudly instead of returning a cheerful success.
  if (updateError) {
    console.error('[follow-up-send] status write failed after delivering:', updateError.message);
    return {
      success: false,
      error: `The email was sent but the follow-up could not be marked as sent (${updateError.message}). It may be sent again — check the follow-up list before retrying.`,
      recipient: recipient.email,
    };
  }

  if (!result.success) {
    return {
      success: false,
      error:
        result.error ||
        'The email could not be delivered — check the sending address in Settings and retry.',
      recipient: recipient.email,
      code: result.code,
    };
  }

  return { success: true, recipient: recipient.email };
}
