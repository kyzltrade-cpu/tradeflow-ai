/**
 * WhatsApp pings for big deals, via Twilio.
 *
 * When an inbound inquiry looks like a big deal we message the owner on
 * WhatsApp immediately. This is best-effort and never blocks intake: if Twilio
 * is not configured, or the company has no WhatsApp number, it is a no-op.
 */

import { supabaseAdmin } from '@/lib/supabase';
import { isBigDeal } from '@/lib/big-deals';

export interface BigDealPing {
  companyId: string;
  conversationId?: string | null;
  title: string;
  value: number | null;
  currency: string | null;
  priority?: string | null;
  stage?: string | null;
}

export interface PingResult {
  ok: boolean;
  skipped?: string;
  error?: string;
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
 * Send a big-deal ping to the company's WhatsApp number. Returns `ok: true`
 * on delivery, `skipped` when there is nothing to do, and `ok: false` (with an
 * error) on a genuine Twilio failure.
 */
export async function pingBigDeal(ping: BigDealPing): Promise<PingResult> {
  if (
    !isBigDeal({
      stage: ping.stage ?? 'NEW',
      priority: ping.priority ?? null,
      estimated_order_value: ping.value,
    })
  ) {
    return { ok: false, skipped: 'not_big_deal' };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER?.trim();
  if (!accountSid || !authToken || !fromNumber) {
    return { ok: false, skipped: 'twilio_not_configured' };
  }

  let ownerNumber: string | null = null;
  try {
    const { data } = await supabaseAdmin
      .from('companies')
      .select('whatsapp_number')
      .eq('id', ping.companyId)
      .maybeSingle();
    ownerNumber = (data?.whatsapp_number as string | null) ?? null;
  } catch (err) {
    console.error('[whatsapp] owner lookup failed:', err);
    return { ok: false, skipped: 'owner_lookup_failed' };
  }

  if (!ownerNumber) return { ok: false, skipped: 'no_owner_number' };

  const from = normaliseWhatsAppNumber(fromNumber);
  const to = normaliseWhatsAppNumber(ownerNumber);
  if (!from || !to) return { ok: false, skipped: 'invalid_number' };

  const body =
    `Big deal alert: ${ping.title}\n` +
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
      return { ok: false, error: `Twilio ${response.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error('[whatsapp] ping failed:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
  }
}
