/**
 * WhatsApp alerts for the owner, via Twilio.
 *
 * When an inbound inquiry matches one of the company's configured alert
 * triggers (new enquiry, pricing question, big deal, or escalation) we message
 * the owner on WhatsApp. This is best-effort and never blocks intake: if Twilio
 * is not configured, alerts are disabled, or the company has no WhatsApp
 * number, it is a no-op.
 */

import { supabaseAdmin } from '@/lib/supabase';
import { normaliseNotifications, resolveAlerts } from '@/lib/notifications';

export interface OwnerAlert {
  companyId: string;
  conversationId?: string | null;
  title: string;
  value: number | null;
  currency: string | null;
  priority?: string | null;
  stage?: string | null;
  /** Inbound text used for keyword-based triggers (pricing / escalation). */
  text?: string | null;
}

export interface PingResult {
  ok: boolean;
  skipped?: string;
  error?: string;
  reasons?: string[];
}

const TWILIO_API = 'https://api.twilio.com/2010-04-01/Accounts';

function normaliseWhatsAppNumber(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/[^\d+]/g, '');
  if (!digits) return null;
  const withPlus = digits.startsWith('+') ? digits : `+${digits}`;
  return `whatsapp:${withPlus}`;
}

function formatValue(value: number | null, currency: string | null): string {
  if (value == null || value <= 0) return 'value pending';
  return `${new Intl.NumberFormat('en-US').format(value)} ${currency || 'USD'}`;
}

/**
 * Send a WhatsApp alert to the company's number when the inbound inquiry
 * matches a configured trigger. Returns `ok: true` on delivery, `skipped` when
 * there is nothing to do, and `ok: false` (with an error) on a genuine Twilio
 * failure.
 */
export async function notifyOwner(ping: OwnerAlert): Promise<PingResult> {
  let ownerNumber: string | null = null;
  let config = normaliseNotifications(null);

  try {
    const [{ data: company }, { data: settings }] = await Promise.all([
      supabaseAdmin.from('companies').select('whatsapp_number').eq('id', ping.companyId).maybeSingle(),
      supabaseAdmin.from('company_settings').select('pricing').eq('company_id', ping.companyId).maybeSingle(),
    ]);
    ownerNumber = (company?.whatsapp_number as string | null) ?? null;
    const pricing = (settings?.pricing as Record<string, unknown> | null) ?? null;
    config = normaliseNotifications(pricing?.notifications);
  } catch (err) {
    console.error('[whatsapp] owner lookup failed:', err);
    return { ok: false, skipped: 'owner_lookup_failed' };
  }

  const { shouldAlert, reasons } = resolveAlerts({
    config,
    text: ping.text,
    value: ping.value,
    priority: ping.priority,
  });
  if (!shouldAlert) return { ok: false, skipped: 'no_trigger' };
  if (!ownerNumber) return { ok: false, skipped: 'no_owner_number', reasons };

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER?.trim();
  if (!accountSid || !authToken || !fromNumber) {
    return { ok: false, skipped: 'twilio_not_configured', reasons };
  }

  const from = normaliseWhatsAppNumber(fromNumber);
  const to = normaliseWhatsAppNumber(ownerNumber);
  if (!from || !to) return { ok: false, skipped: 'invalid_number', reasons };

  const body =
    `${reasons.join(' · ')}: ${ping.title}\n` +
    `${formatValue(ping.value, ping.currency)}` +
    (ping.priority ? `\nPriority: ${ping.priority}` : '');

  try {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const response = await fetch(`${TWILIO_API}/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }).toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[whatsapp] twilio send failed:', response.status, text.slice(0, 300));
      return { ok: false, error: `Twilio ${response.status}`, reasons };
    }
    return { ok: true, reasons };
  } catch (err) {
    console.error('[whatsapp] ping failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'unknown', reasons };
  }
}
