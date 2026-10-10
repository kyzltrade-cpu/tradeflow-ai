import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, EMAIL_ERROR_CODES } from '@/lib/email';
import { checkRateLimit, createRateLimitResponse, getClientIp } from '@/lib/rate-limit';
import { escapeHtml } from '@/lib/html-escape';
import { normalizeBookingRequest, type BookingRequestInput } from '@/lib/booking-request';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/** Where the "someone booked a call" notification lands. */
const OWNER_EMAIL = process.env.BOOKING_NOTIFY_EMAIL || 'tradeflow.hk@gmail.com';

/** Resend's sandbox sender — only ever delivers to the account owner, which
 *  is exactly the recipient here. Used when no platform sender is configured. */
const SANDBOX_FROM = 'Sailwise Bookings <onboarding@resend.dev>';

const INK = '#0A0D0B';
const PAPER = '#F7F4ED';
const PINE = '#0A6E5C';

/**
 * The notification, as a card.
 *
 * Tables and inline styles only: mail clients strip <style> blocks, flexbox and
 * most of what a web page would use, so the layout has to be the oldest kind
 * there is. Square corners match the site, and the chosen time gets the largest
 * type on the card because it is the one detail the operator acts on.
 */
function bookingCard(v: BookingRequestInput, whenLabel: string, bookedAt: string): string {
  const row = (label: string, value: string, href?: string) => `
            <tr>
              <td style="padding:14px 0;border-bottom:1px solid ${PAPER};font:500 11px/1.5 Helvetica,Arial,sans-serif;letter-spacing:0.14em;text-transform:uppercase;color:#7E847C;width:150px;vertical-align:top;">${label}</td>
              <td style="padding:14px 0;border-bottom:1px solid ${PAPER};font:400 15px/1.5 Helvetica,Arial,sans-serif;color:${INK};vertical-align:top;word-break:break-word;">${
                href ? `<a href="${href}" style="color:${PINE};text-decoration:none;">${value}</a>` : value
              }</td>
            </tr>`;

  const first = v.name.split(' ')[0] || v.name;

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:${PAPER};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border:1px solid #E4DFD3;">

      <tr><td style="background:${INK};padding:20px 30px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font:500 16px/1 Helvetica,Arial,sans-serif;color:${PAPER};">Sailwise</td>
          <td align="right" style="font:500 11px/1 Helvetica,Arial,sans-serif;letter-spacing:0.18em;text-transform:uppercase;color:#7FD1B9;">New booking</td>
        </tr></table>
      </td></tr>

      <tr><td style="padding:30px 30px 6px;">
        <div style="font:500 11px/1 Helvetica,Arial,sans-serif;letter-spacing:0.16em;text-transform:uppercase;color:${PINE};">Pilot call</div>
        <div style="font:600 25px/1.3 Helvetica,Arial,sans-serif;color:${INK};padding-top:12px;letter-spacing:-0.02em;">${escapeHtml(
          whenLabel
        )}</div>
        <div style="font:400 13px/1.5 Helvetica,Arial,sans-serif;color:#7E847C;padding-top:6px;">${escapeHtml(
          v.tz || 'timezone not reported'
        )}</div>
      </td></tr>

      <tr><td style="padding:6px 30px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${row('Name', escapeHtml(v.name))}
          ${row('Email', escapeHtml(v.email), `mailto:${encodeURIComponent(v.email)}`)}
          ${row('Company', escapeHtml(v.company))}
          ${row('Inquiries', escapeHtml(v.volume || 'Not provided'))}
        </table>
      </td></tr>

      <tr><td style="padding:24px 30px 0;">
        <div style="font:500 11px/1.5 Helvetica,Arial,sans-serif;letter-spacing:0.14em;text-transform:uppercase;color:#7E847C;">What is costing them time</div>
        <div style="margin-top:12px;padding:16px 18px;background:${PAPER};font:400 15px/1.65 Helvetica,Arial,sans-serif;color:${INK};white-space:pre-wrap;">${escapeHtml(
          v.note || 'Left blank.'
        )}</div>
      </td></tr>

      <tr><td style="padding:26px 30px 0;">
        <a href="mailto:${encodeURIComponent(v.email)}?subject=${encodeURIComponent(
          'Your Sailwise pilot call'
        )}" style="display:inline-block;background:${INK};color:${PAPER};font:500 15px/1 Helvetica,Arial,sans-serif;padding:15px 26px;text-decoration:none;">Reply to ${escapeHtml(
          first
        )}</a>
      </td></tr>

      <tr><td style="padding:26px 30px 28px;">
        <div style="border-top:1px solid #E4DFD3;padding-top:16px;font:400 12px/1.6 Helvetica,Arial,sans-serif;color:#9AA096;">
          Booked ${escapeHtml(bookedAt)} &middot; slot sent as ${escapeHtml(v.whenIso)}
        </div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

/** Same content, for clients that show text and for deliverability. */
function bookingText(v: BookingRequestInput, whenLabel: string, bookedAt: string): string {
  return [
    'NEW PILOT-CALL BOOKING',
    '',
    `When      ${whenLabel} (${v.tz || 'timezone not reported'})`,
    `Name      ${v.name}`,
    `Email     ${v.email}`,
    `Company   ${v.company}`,
    `Inquiries ${v.volume || 'Not provided'}`,
    '',
    'What is costing them time:',
    v.note || 'Left blank.',
    '',
    `Booked ${bookedAt} - slot sent as ${v.whenIso}`,
  ].join('\n');
}

/**
 * Emails the operator. Prefers the app's configured platform sender; if that is
 * not set up it falls back to Resend's sandbox sender, mirroring the existing
 * demo-request endpoint so a booking is never silently dropped.
 *
 * Returns whether the operator was actually reached: "we stored a row" and "a
 * human was told" are different things, and the caller reports both.
 */
async function notifyOwner(
  subject: string,
  html: string,
  text: string,
  replyTo: string
): Promise<{ sent: boolean; reason?: string }> {
  const viaHelper = await sendEmail({ to: OWNER_EMAIL, subject, html, text, replyTo });
  if (viaHelper.success) return { sent: true };

  if (viaHelper.code !== EMAIL_ERROR_CODES.SENDER_NOT_CONFIGURED) {
    return { sent: false, reason: viaHelper.error };
  }

  // No platform sender: Resend's shared sandbox address is the only one that
  // will deliver without a verified domain, and only to the account owner.
  if (!resend) return { sent: false, reason: viaHelper.error };

  const { error } = await resend.emails.send({
    from: SANDBOX_FROM,
    to: OWNER_EMAIL,
    replyTo,
    subject,
    html,
    text,
  });
  return error ? { sent: false, reason: error.message } : { sent: true };
}

export async function POST(req: Request) {
  // Unauthenticated write + outbound email: without a throttle this is a free
  // mail-bomb and lead-table-spam endpoint.
  const ip = getClientIp(req);
  const limit = checkRateLimit(`booking:${ip}`, { windowMs: 60_000, maxRequests: 5 });
  if (!limit.allowed) return createRateLimitResponse(limit.resetTime);

  try {
    const body = await req.json();
    const parsed = normalizeBookingRequest(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { name, email, company, volume, note, whenIso, whenLabel, tz } = parsed.value;
    const bookedAt = new Date().toISOString();

    const { error: dbError } = await supabaseAdmin.from('booking_requests').insert({
      name,
      email,
      company,
      volume: volume || null,
      note: note || null,
      scheduled_for: whenIso,
      timezone: tz || null,
      slot_label: whenLabel || null,
      status: 'requested',
    });
    if (dbError) {
      // Email is the contract; a missing table must not drop the notification.
      console.error('[booking] DB error:', dbError.message);
    }

    const label = whenLabel || whenIso;
    const { sent, reason } = await notifyOwner(
      `[Booking] ${company} — ${name}`,
      bookingCard(parsed.value, label, bookedAt),
      bookingText(parsed.value, label, bookedAt),
      email
    );

    if (!sent) {
      // Both channels are down. Print the whole booking so it is recoverable
      // from the logs rather than gone — this is a lead, and losing it silently
      // is the one outcome nobody can undo.
      console.error('[booking] notification failed:', reason);
      console.error(
        '[booking] UNDELIVERED',
        JSON.stringify({ name, email, company, volume, note, whenIso, whenLabel, tz, bookedAt })
      );
    }

    // `notified` is reported so a failure is visible from outside instead of
    // looking like a clean success while the operator hears nothing.
    return NextResponse.json({ success: true, stored: !dbError, notified: sent });
  } catch (err) {
    console.error('[booking] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
