import { NextResponse } from 'next/server';
import { handleChat, getOrCreateConversation, checkKeywordOverride, generateHandoffSummary } from '@/lib/ai';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit';
import { createHmac } from 'crypto';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isSubscriptionActive(subscriptionStatus: string | null, periodEnd: string | null): boolean {
  // Allow trial and active subscriptions
  if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
    // Check if period hasn't expired
    if (periodEnd) {
      return new Date(periodEnd) > new Date();
    }
    return true;
  }
  return false;
}

// In-memory dedup cache for WhatsApp message IDs (5-minute TTL)
const processedMessages = new Map<string, number>();
const DEDUP_TTL_MS = 5 * 60 * 1000;

function isDuplicateMessage(messageId: string): boolean {
  const now = Date.now();
  // Evict expired entries periodically
  if (processedMessages.size > 10000) {
    for (const [key, ts] of processedMessages) {
      if (now - ts > DEDUP_TTL_MS) processedMessages.delete(key);
    }
  }
  if (processedMessages.has(messageId)) return true;
  processedMessages.set(messageId, now);
  return false;
}

function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    console.error('[whatsapp-webhook] META_APP_SECRET not configured');
    return false;
  }
  const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex');
  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  message: string
) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace('+', ''),
        type: 'text',
        text: { body: message },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    console.error('Meta WhatsApp API error:', err);
  }
}

export async function POST(req: Request) {
  try {
    // Read raw body for signature verification BEFORE parsing
    const rawBody = await req.text();

    // Verify Meta webhook signature (HMAC-SHA256)
    const signature = req.headers.get('x-hub-signature-256');
    if (!verifySignature(rawBody, signature)) {
      console.warn('[whatsapp-webhook] Invalid signature, rejecting request');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // Rate limiting - 100 requests per minute per IP
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = checkRateLimit(`whatsapp:${clientIp}`, {
      windowMs: 60000,
      maxRequests: 100,
    });

    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.resetTime);
    }

    const body = JSON.parse(rawBody);

    const change = body.entry?.[0]?.changes?.[0];
    if (!change) {
      return NextResponse.json({ ok: true });
    }

    const value = change.value;
    const messages = value.messages || [];
    if (messages.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const msg = messages[0];
    const phoneNumberId = value.metadata?.phone_number_id;
    const from = msg.from; // phone number without +
    const profileName = value.contacts?.[0]?.profile?.name;

    // Deduplication: skip already-processed messages (Meta may redeliver)
    const whatsappMsgId = msg.id;
    if (whatsappMsgId && isDuplicateMessage(whatsappMsgId)) {
      return NextResponse.json({ ok: true, note: 'Duplicate message, skipping' });
    }

    // Handle different message types
    let messageBody = '';
    let mediaType = '';
    let mediaUrl = '';

    if (msg.type === 'text') {
      messageBody = msg.text?.body || '';
    } else if (msg.type === 'image') {
      mediaType = 'image';
      mediaUrl = msg.image?.id || '';
      // Default image response - will be overridden by company settings
      messageBody = '[Image received - please describe what you need help with]';
    } else if (msg.type === 'document') {
      mediaType = 'document';
      mediaUrl = msg.document?.id || '';
      messageBody = '[Document received - please describe what you need help with]';
    } else if (msg.type === 'audio') {
      mediaType = 'audio';
      mediaUrl = msg.audio?.id || '';
      messageBody = '[Audio message received - please type your message]';
    } else if (msg.type === 'location') {
      messageBody = `[Location received: ${msg.location?.latitude}, ${msg.location?.longitude}]`;
    } else {
      // Unsupported message type - look up company first
      const { data: msgCompany } = await supabaseAdmin
        .from('companies')
        .select('whatsapp_access_token')
        .eq('whatsapp_phone_number_id', phoneNumberId)
        .single();
      
      if (msgCompany?.whatsapp_access_token) {
        await sendWhatsAppMessage(
          phoneNumberId,
          msgCompany.whatsapp_access_token,
          from,
          'I can only process text messages right now. Please send your inquiry as text.'
        );
      }
      return NextResponse.json({ ok: true, note: 'Unsupported message type' });
    }

    if (!phoneNumberId || !from || !messageBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Look up company by whatsapp_phone_number_id
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('whatsapp_phone_number_id', phoneNumberId)
      .single();

    if (!company) {
      return NextResponse.json({ ok: true, note: 'No company found for this phone_number_id' });
    }

    // Check subscription status - block AI responses for inactive subscriptions
    if (!isSubscriptionActive(company.subscription_status, company.subscription_current_period_end)) {
      // Send a friendly message to the customer using company's access token
      if (company.whatsapp_access_token) {
        const trialMessage = "Thank you for your message! Our AI assistant is currently unavailable. A team member will get back to you shortly. To enable 24/7 AI responses, please contact our sales team.";
        await sendWhatsAppMessage(phoneNumberId, company.whatsapp_access_token, from, trialMessage);
      }
      return NextResponse.json({ ok: true, note: 'Subscription inactive, sent fallback message' });
    }

    const conversationId = await getOrCreateConversation(
      company.id,
      'whatsapp',
      from,
      profileName || undefined
    );

    // KEYWORD OVERRIDE: instant human handoff
    if (checkKeywordOverride(messageBody)) {
      const summary = await generateHandoffSummary(conversationId, company.name);
      await supabaseAdmin
        .from('conversations')
        .update({ status: 'human', handoff_summary: summary })
        .eq('id', conversationId);
      return NextResponse.json({ ok: true, note: 'Keyword override — AI paused' });
    }

    // For image messages, use the company's custom image_response_prompt if set
    if (mediaType === 'image') {
      const { data: settings } = await supabaseAdmin
        .from('company_settings')
        .select('image_response_prompt')
        .eq('company_id', company.id)
        .single();
      
      if (settings?.image_response_prompt) {
        // Send the custom image response directly
        const accessToken = company.whatsapp_access_token;
        if (accessToken) {
          const delaySeconds = 2;
          await sleep(delaySeconds * 1000);
          await sendWhatsAppMessage(phoneNumberId, accessToken, from, settings.image_response_prompt);
        }
        return NextResponse.json({ ok: true, note: 'Image response sent' });
      }
    }

    const { reply } = await handleChat({
      companyId: company.id,
      channel: 'whatsapp',
      conversationId,
      userMessage: messageBody,
      contactPhone: from,
      contactName: profileName || undefined,
    });

    if (!reply) {
      return NextResponse.json({ ok: true, note: 'No reply (conversation handed off)' });
    }

    // Fetch response delay from settings (default 2 seconds)
    let delaySeconds = 2;
    const { data: settings } = await supabaseAdmin
      .from('company_settings')
      .select('response_delay_seconds')
      .eq('company_id', company.id)
      .single();
    if (settings?.response_delay_seconds != null) {
      delaySeconds = settings.response_delay_seconds;
    }

    // Add small random variance for natural feel (±10%)
    const variance = delaySeconds * 0.1;
    const totalDelay = (delaySeconds + (Math.random() * variance * 2 - variance)) * 1000;
    await sleep(totalDelay);

    // Reply via Meta Cloud API using company's access token
    const accessToken = company.whatsapp_access_token;
    if (!accessToken) {
      console.error('WhatsApp access token not configured for company:', company.id);
      return NextResponse.json({ error: 'Missing access token for company' }, { status: 500 });
    }

    await sendWhatsAppMessage(phoneNumberId, accessToken, from, reply);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Meta webhook verification
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
