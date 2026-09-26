import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { processAttachment, type AttachmentInput } from '@/lib/attachment-processor';
import { stripHtml } from '@/lib/email';
import { DEMO_COMPANY_ID } from '@/lib/inquiry-context';
import { createHash } from 'node:crypto';

/**
 * POST /api/admin/inquiries/webhook — inbound real email.
 *
 * Accepts the Resend inbound shape (`email.received`) and an equivalent
 * normalized shape so a future mailbox poller can post the same payload:
 *
 *   { type: 'email.received', data: { id|email_id, from|sender, to|recipient,
 *                                     subject, text|body, html, attachments } }
 *
 * Each message becomes:
 *   1. an `inquiries` row (existing behaviour, keeps the RFQ pipeline intact)
 *   2. a message in that company's `conversations` thread, so it shows up in
 *      the Inbox with the real sender and text
 *   3. the inquiry is linked back to the conversation
 *
 * Tenant safety: the recipient address decides which company owns the mail.
 * Nothing is ever written for a company the recipient doesn't belong to, and
 * the demo/lead company is never written to.
 */

const MAX_CONTENT_CHARS = 20_000;

// ---------------------------------------------------------------------------
// Payload parsing
// ---------------------------------------------------------------------------

type LooseAddress = string | { email?: string; name?: string } | null | undefined;

type NormalizedEmail = {
  providerEventId: string;
  receivedAt: string;
  senderEmail: string;
  senderName: string;
  recipientEmails: string[];
  subject: string;
  text: string;
  html: string;
  threadId: string | null;
  attachments: Array<{ id?: string; filename?: string; content_type?: string; size?: number }>;
};

/** `"Jane Doe <jane@x.com>"` → `{ email, name }`. */
function parseAddress(value: LooseAddress): { email: string; name: string } {
  if (!value) return { email: '', name: '' };
  if (typeof value === 'object') {
    return {
      email: (value.email || '').trim().toLowerCase(),
      name: (value.name || '').trim(),
    };
  }
  const raw = value.trim();
  const angle = raw.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (angle) {
    return { email: angle[2].trim().toLowerCase(), name: angle[1].trim() };
  }
  return { email: raw.toLowerCase(), name: '' };
}

function toAddressList(value: unknown): string[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  const out: string[] = [];
  for (const item of list) {
    const { email } = parseAddress(item as LooseAddress);
    if (email.includes('@')) out.push(email);
  }
  return out;
}

function headerValue(headers: unknown, name: string): string | null {
  if (!headers || typeof headers !== 'object') return null;
  const entries = Array.isArray(headers)
    ? headers.map((h) => [String(h?.key ?? '').toLowerCase(), h?.value] as const)
    : Object.entries(headers as Record<string, unknown>).map(
        ([k, v]) => [k.toLowerCase(), v] as const
      );
  const match = entries.find(([k]) => k === name);
  const value = match?.[1];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizePayload(body: Record<string, unknown>): NormalizedEmail {
  const data = (body.data && typeof body.data === 'object' ? body.data : body) as Record<
    string,
    unknown
  >;
  const createdAt =
    (typeof body.created_at === 'string' && body.created_at) ||
    (typeof data.created_at === 'string' && data.created_at) ||
    new Date().toISOString();

  const sender = parseAddress((data.from ?? data.sender) as LooseAddress);
  const subject = typeof data.subject === 'string' ? data.subject.trim() : '';
  const html = typeof data.html === 'string' ? data.html : '';
  const rawText = typeof data.text === 'string' ? data.text : typeof data.body === 'string' ? data.body : '';
  const text = (rawText || stripHtml(html)).slice(0, MAX_CONTENT_CHARS);

  const attachments = Array.isArray(data.attachments)
    ? (data.attachments as NormalizedEmail['attachments']).filter(
        (a) => a && typeof a === 'object'
      )
    : [];

  return {
    providerEventId: String(
      data.email_id ?? data.id ?? data.message_id ?? data.provider_event_id ?? ''
    ).trim(),
    receivedAt: createdAt,
    senderEmail: sender.email,
    senderName: sender.name,
    recipientEmails: toAddressList(data.to ?? data.recipient),
    subject,
    text,
    html,
    threadId: headerValue(data.headers, 'in-reply-to') || headerValue(data.headers, 'references'),
    attachments,
  };
}

// ---------------------------------------------------------------------------
// Tenant resolution
// ---------------------------------------------------------------------------

/**
 * Maps the recipient address(es) onto exactly one company:
 *   1. the company's own configured sending address (`email_from_email`)
 *   2. the company's email domain, when that domain is unambiguous
 */
async function resolveCompanyId(recipientEmails: string[]): Promise<string | null> {
  if (recipientEmails.length === 0) return null;

  // Targeted lookup by address (case-insensitive) rather than loading every
  // tenant's settings — service-role queries bypass RLS, so this also keeps
  // other companies' addresses out of the request.
  const byAddressFilter = recipientEmails.map((r) => `email_from_email.ilike.${r}`).join(',');
  const { data: settings, error: settingsError } = await supabaseAdmin
    .from('company_settings')
    .select('company_id, email_from_email')
    .or(byAddressFilter);

  if (settingsError) {
    console.error('[webhook] company_settings lookup failed:', settingsError.message);
  }

  const byAddress = new Map<string, string>();
  for (const row of settings || []) {
    const addr = (row.email_from_email || '').trim().toLowerCase();
    if (addr.includes('@')) byAddress.set(addr, row.company_id);
  }

  for (const recipient of recipientEmails) {
    const hit = byAddress.get(recipient);
    if (hit) return hit;
  }

  const domains = Array.from(
    new Set(recipientEmails.map((e) => e.split('@')[1]).filter(Boolean))
  );
  if (domains.length === 0) return null;

  const { data: companies, error: companiesError } = await supabaseAdmin
    .from('companies')
    .select('id, email_domain')
    .in('email_domain', domains);

  if (companiesError) {
    console.error('[webhook] companies lookup failed:', companiesError.message);
    return null;
  }

  // Only trust a domain match when exactly one company claims it.
  return companies && companies.length === 1 ? companies[0].id : null;
}

// ---------------------------------------------------------------------------
// Inbox thread
// ---------------------------------------------------------------------------

type ThreadResult = { conversationId: string; messageId: string | null; created: boolean };

/**
 * Finds the company's existing thread with this sender, or starts one, then
 * appends the inbound message. Mirrors the seeded mailbox shape so the Inbox
 * filters (Focused / Waiting on you / Bookmarked) behave the same for real mail.
 */
async function appendToInbox(
  companyId: string,
  email: NormalizedEmail
): Promise<ThreadResult | null> {
  let conversation: { id: string } | null = null;

  if (email.senderEmail) {
    const { data } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('company_id', companyId)
      .eq('channel', 'email')
      .eq('contact_email', email.senderEmail)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    conversation = data ?? null;
  }

  if (!conversation && email.senderName) {
    const { data } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('company_id', companyId)
      .eq('channel', 'email')
      .eq('contact_name', email.senderName)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    conversation = data ?? null;
  }

  let conversationId: string;

  let created = false;
  if (!conversation) {
    const { data: settings } = await supabaseAdmin
      .from('company_settings')
      .select('pricing')
      .eq('company_id', companyId)
      .maybeSingle();
    const currency =
      (settings?.pricing as { currency?: string } | null)?.currency || 'USD';

    const { data: inserted, error } = await supabaseAdmin
      .from('conversations')
      .insert({
        company_id: companyId,
        channel: 'email',
        source_channel: 'email',
        contact_name: email.senderName || email.senderEmail || 'Website enquiry',
        contact_email: email.senderEmail || null,
        status: 'active',
        currency,
        external_search_enabled: false,
        created_at: email.receivedAt,
        updated_at: email.receivedAt,
      })
      .select('id')
      .single();

    if (error || !inserted) {
      console.error('[webhook] failed to create conversation:', error?.message);
      return null;
    }
    conversationId = inserted.id;
    created = true;
  } else {
    conversationId = conversation.id;
  }

  const body = (email.text || email.subject || '(empty email)').slice(0, MAX_CONTENT_CHARS);
  const { data: message, error: messageError } = await supabaseAdmin
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: 'customer',
      content: body,
      tokens_used: 0,
      created_at: email.receivedAt,
    })
    .select('id')
    .single();

  if (messageError || !message) {
    console.error('[webhook] failed to insert message:', messageError?.message);
    return { conversationId, messageId: null, created };
  }

  // The Inbox lists threads by updated_at, so that is the column to bump.
  const { error: touchError } = await supabaseAdmin
    .from('conversations')
    .update({ updated_at: email.receivedAt })
    .eq('id', conversationId);

  if (touchError) {
    console.error('[webhook] failed to touch conversation:', touchError.message);
  }

  return { conversationId, messageId: message.id, created };
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

async function ingestAttachments(
  companyId: string,
  inquiryId: string,
  emailId: string,
  attachments: NormalizedEmail['attachments']
): Promise<void> {
  if (attachments.length === 0) return;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[webhook] attachments skipped — RESEND_API_KEY not configured');
    return;
  }

  for (const att of attachments) {
    try {
      const attResponse = await fetch(
        `https://api.resend.com/emails/${emailId}/attachments/${att.id}`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );

      if (!attResponse.ok) {
        console.error(`[webhook] failed to download attachment ${att.id}:`, attResponse.statusText);
        continue;
      }

      const attBuffer = Buffer.from(await attResponse.arrayBuffer());
      const contentHash = createHash('sha256').update(attBuffer).digest('hex');
      const safeFilename = (att.filename || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${companyId}/${inquiryId}/${Date.now()}_${safeFilename}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('inquiry-attachments')
        .upload(storagePath, attBuffer, {
          contentType: att.content_type || 'application/octet-stream',
          upsert: false,
        });

      if (uploadError) {
        console.error(`[webhook] storage upload failed for ${att.filename}:`, uploadError.message);
        continue;
      }

      const input: AttachmentInput = {
        buffer: attBuffer,
        filename: att.filename || 'attachment',
        mimeType: att.content_type || 'application/octet-stream',
        fileSize: attBuffer.length,
      };

      const result = await processAttachment(input);

      await supabaseAdmin.from('inquiry_attachments').insert({
        inquiry_id: inquiryId,
        company_id: companyId,
        original_name: att.filename || 'attachment',
        mime_type: att.content_type || 'application/octet-stream',
        file_size: attBuffer.length,
        storage_path: storagePath,
        content_hash: contentHash,
        extracted_text: result.text || null,
        extracted_tables: result.tables.length > 0 ? result.tables : null,
        extraction_status: result.status,
        extraction_error: result.error || null,
      });
    } catch (err) {
      console.error('[webhook] error processing attachment:', err);
    }
  }
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // Optional shared-secret gate. Set INQUIRY_WEBHOOK_SECRET and Resend (or
    // any caller) must send it in x-sailwise-webhook-secret; without it the
    // endpoint stays open for local testing but says so loudly.
    const expectedSecret = process.env.INQUIRY_WEBHOOK_SECRET;
    if (expectedSecret) {
      const provided = req.headers.get('x-sailwise-webhook-secret');
      if (provided !== expectedSecret) {
        return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
      }
    } else {
      console.warn(
        '[webhook] INQUIRY_WEBHOOK_SECRET not set — inbound email endpoint is unauthenticated'
      );
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const type = typeof body.type === 'string' ? body.type : 'email.received';
    if (type !== 'email.received') {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const email = normalizePayload(body);
    const emailId = email.providerEventId;
    if (!emailId) {
      return NextResponse.json({ error: 'Missing email_id' }, { status: 400 });
    }

    const companyId = await resolveCompanyId(email.recipientEmails);
    if (!companyId) {
      console.warn(
        '[webhook] no company owns the recipient address:',
        email.recipientEmails.join(', ') || '(none)'
      );
      return NextResponse.json({ ok: true, no_company: true });
    }

    // The demo/lead company is never written to by live inbound mail.
    if (companyId === DEMO_COMPANY_ID) {
      return NextResponse.json({ ok: true, skipped: 'demo_company' });
    }

    // Idempotency: one inquiry per provider event.
    const { data: existing } = await supabaseAdmin
      .from('inquiries')
      .select('id, conversation_id')
      .eq('provider_event_id', emailId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        inquiry_id: existing.id,
        conversation_id: existing.conversation_id ?? null,
      });
    }

    const content = (email.text || stripHtml(email.html) || '(empty email)').slice(
      0,
      MAX_CONTENT_CHARS
    );

    // Inquiry first: it is the durable record. If the inbox thread then fails,
    // the mail is still captured and extraction still runs — the reverse order
    // would leave an orphan message in someone's inbox with no inquiry behind it.
    const { data: inquiry, error: inquiryError } = await supabaseAdmin
      .from('inquiries')
      .insert({
        company_id: companyId,
        source_channel: 'email',
        provider_event_id: emailId,
        message_thread_id: email.threadId,
        conversation_id: null,
        sender_name: email.senderName || null,
        sender_email: email.senderEmail || null,
        subject: email.subject || null,
        original_message: content,
        raw_html: email.html || null,
        processing_status: 'RECEIVED',
        received_at: email.receivedAt,
      })
      .select('id')
      .single();

    if (inquiryError) {
      console.error('[webhook] failed to create inquiry:', inquiryError.message);
      return NextResponse.json({ error: inquiryError.message }, { status: 500 });
    }

    // Now file it in the company's inbox thread and link the two together.
    const thread = await appendToInbox(companyId, email);
    if (thread) {
      const { error: linkError } = await supabaseAdmin
        .from('inquiries')
        .update({ conversation_id: thread.conversationId })
        .eq('id', inquiry.id);
      if (linkError) {
        console.error('[webhook] failed to link inquiry to conversation:', linkError.message);
      }
    }

    await ingestAttachments(companyId, inquiry.id, emailId, email.attachments);

    // Queue extraction job asynchronously via workflow_jobs
    try {
      await supabaseAdmin.from('workflow_jobs').insert({
        company_id: companyId,
        job_type: 'inquiry_extraction',
        entity_type: 'inquiry',
        entity_id: inquiry.id,
        status: 'pending',
        payload: JSON.stringify({ inquiry_id: inquiry.id }),
        idempotency_key: `extraction-${inquiry.id}`,
      });
    } catch (err) {
      console.error('[webhook] failed to queue extraction job:', err);
      // Non-critical — inquiry is created, extraction can be triggered manually
    }

    return NextResponse.json({
      ok: true,
      inquiry_id: inquiry.id,
      conversation_id: thread?.conversationId ?? null,
      message_id: thread?.messageId ?? null,
      new_thread: thread?.created ?? false,
    });
  } catch (err) {
    console.error('[webhook] unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
