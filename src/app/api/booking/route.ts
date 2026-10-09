import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, EMAIL_ERROR_CODES } from '@/lib/email';
import { checkRateLimit, createRateLimitResponse, getClientIp } from '@/lib/rate-limit';
import { escapeHtml } from '@/lib/html-escape';
import { normalizeBookingRequest } from '@/lib/booking-request';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/** Where the "someone booked a call" notification lands. */
const OWNER_EMAIL = process.env.BOOKING_NOTIFY_EMAIL || 'tradeflow@gmail.com';

/** Resend's sandbox sender — only ever delivers to the account owner, which
 *  is exactly the recipient here. Used when no platform sender is configured. */
const SANDBOX_FROM = 'Sailwise Bookings <onboarding@resend.dev>';

/**
 * Emails the operator. Prefers the app's configured platform sender; if that
 * is not set up it falls back to Resend's sandbox sender, mirroring the
 * existing demo-request endpoint so a booking is never silently dropped.
 */
async function notifyOwner(subject: string, html: string, replyTo: string): Promise<void> {
  const viaHelper = await sendEmail({ to: OWNER_EMAIL, subject, html, replyTo });
  if (viaHelper.success) return;
  if (viaHelper.code !== EMAIL_ERROR_CODES.SENDER_NOT_CONFIGURED) {
    console.error('[booking] email error:', viaHelper.error);
    return;
  }
  if (!resend) {
    console.error('[booking] email error:', viaHelper.error);
    return;
  }
  const { error } = await resend.emails.send({ from: SANDBOX_FROM, to: OWNER_EMAIL, replyTo, subject, html });
  if (error) console.error('[booking] sandbox email error:', error.message);
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

    // Every interpolated field is attacker-controlled and lands in the
    // operator's mail client, so each one goes through escapeHtml below.
    const row = (label: string, value: string) =>
      `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">${label}</td><td style="padding:8px;border:1px solid #ddd;">${value}</td></tr>`;

    const html = `
      <h2>New pilot-call booking</h2>
      <table style="border-collapse: collapse; width: 100%; max-width: 560px;">
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">When</td><td style="padding:8px;border:1px solid #ddd;">${escapeHtml(whenLabel || whenIso)} (${escapeHtml(tz || 'unknown tz')})</td></tr>
        ${row('Name', escapeHtml(name))}
        ${row('Email', escapeHtml(email))}
        ${row('Company', escapeHtml(company))}
        ${row('Inquiries / month', escapeHtml(volume || 'Not provided'))}
        ${row('Note', escapeHtml(note || 'Not provided'))}
        <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">ISO time</td><td style="padding:8px;border:1px solid #ddd;">${escapeHtml(whenIso)}</td></tr>
      </table>
      <p style="margin-top:16px;">
        <a href="mailto:${encodeURIComponent(email)}" style="background:#000;color:white;padding:10px 20px;text-decoration:none;border-radius:4px;">Reply to ${escapeHtml(name)}</a>
      </p>
    `;

    await notifyOwner(`[Booking] ${company} - ${name}`, html, email);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[booking] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}