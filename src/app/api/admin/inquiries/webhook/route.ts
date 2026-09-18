import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { processAttachment, type AttachmentInput } from '@/lib/attachment-processor';
import { createHash } from 'node:crypto';

// POST /api/admin/inquiries/webhook — Resend inbound email webhook
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Resend webhook payload structure
    const {
      type,
      created_at,
      data: {
        email_id,
        from,
        to,
        subject,
        html,
        text,
        attachments: emailAttachments,
      } = {},
    } = body;

    // Only process email.received events
    if (type !== 'email.received') {
      return NextResponse.json({ ok: true, skipped: true });
    }

    if (!email_id) {
      return NextResponse.json({ error: 'Missing email_id' }, { status: 400 });
    }

    // Idempotency: check provider_event_id
    const { data: existing } = await supabaseAdmin
      .from('inquiries')
      .select('id')
      .eq('provider_event_id', email_id)
      .single();

    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true, inquiry_id: existing.id });
    }

    // Parse sender info
    const senderEmail = typeof from === 'string' ? from : from?.email || '';
    const senderName = typeof from === 'string' ? '' : from?.name || '';

    // Find company by recipient email domain or explicit mapping
    // For now, match against all companies — in production you'd have a domain mapping
    const recipientEmail = typeof to === 'string' ? to : Array.isArray(to) ? to[0]?.email || '' : to?.email || '';

    // Look up company by any configured email address
    const { data: companySettings } = await supabaseAdmin
      .from('company_settings')
      .select('company_id')
      .eq('inbound_email', recipientEmail)
      .single();

    // Fallback: try matching against company domain
    let companyId = companySettings?.company_id;
    if (!companyId && recipientEmail) {
      const domain = recipientEmail.split('@')[1];
      const { data: company } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('domain', domain)
        .single();
      companyId = company?.id;
    }

    if (!companyId) {
      console.error('[webhook] No company found for recipient:', recipientEmail);
      return NextResponse.json({ ok: true, no_company: true });
    }

    // Fetch full email content via Resend API if we don't have text content
    let emailContent = text || '';
    let emailHtml = html || '';

    if (!emailContent && process.env.RESEND_API_KEY) {
      try {
        const resendResponse = await fetch(`https://api.resend.com/emails/${email_id}`, {
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
        });

        if (resendResponse.ok) {
          const emailData = await resendResponse.json();
          emailContent = emailData.text || emailData.content || '';
          emailHtml = emailData.html || '';
        }
      } catch (err) {
        console.error('[webhook] Failed to fetch email from Resend:', err);
      }
    }

    if (!emailContent) {
      emailContent = emailHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Create inquiry record
    const { data: inquiry, error: inquiryError } = await supabaseAdmin
      .from('inquiries')
      .insert({
        company_id: companyId,
        source_channel: 'email',
        provider_event_id: email_id,
        sender_name: senderName || null,
        sender_email: senderEmail || null,
        subject: subject || null,
        original_message: emailContent || '(empty email)',
        raw_html: emailHtml || null,
        processing_status: 'RECEIVED',
        received_at: created_at || new Date().toISOString(),
      })
      .select('id')
      .single();

    if (inquiryError) {
      console.error('[webhook] Failed to create inquiry:', inquiryError.message);
      return NextResponse.json({ error: inquiryError.message }, { status: 500 });
    }

    // Process attachments if present
    if (emailAttachments && Array.isArray(emailAttachments) && emailAttachments.length > 0) {
      for (const att of emailAttachments) {
        try {
          // Download attachment from Resend
          const attResponse = await fetch(`https://api.resend.com/emails/${email_id}/attachments/${att.id}`, {
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            },
          });

          if (!attResponse.ok) {
            console.error(`[webhook] Failed to download attachment ${att.id}:`, attResponse.statusText);
            continue;
          }

          const attBuffer = Buffer.from(await attResponse.arrayBuffer());
          const contentHash = createHash('sha256').update(attBuffer).digest('hex');
          const safeFilename = (att.filename || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_');
          const storagePath = `${companyId}/${inquiry.id}/${Date.now()}_${safeFilename}`;

          // Upload to storage
          const { error: uploadError } = await supabaseAdmin.storage
            .from('inquiry-attachments')
            .upload(storagePath, attBuffer, {
              contentType: att.content_type || 'application/octet-stream',
              upsert: false,
            });

          if (uploadError) {
            console.error(`[webhook] Storage upload failed for ${att.filename}:`, uploadError.message);
            continue;
          }

          // Process for text extraction
          const input: AttachmentInput = {
            buffer: attBuffer,
            filename: att.filename || 'attachment',
            mimeType: att.content_type || 'application/octet-stream',
            fileSize: attBuffer.length,
          };

          const result = await processAttachment(input);

          // Store attachment record
          await supabaseAdmin.from('inquiry_attachments').insert({
            inquiry_id: inquiry.id,
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
          console.error(`[webhook] Error processing attachment:`, err);
        }
      }
    }

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
      console.error('[webhook] Failed to queue extraction job:', err);
      // Non-critical — inquiry is created, extraction can be triggered manually
    }

    return NextResponse.json({ ok: true, inquiry_id: inquiry.id });
  } catch (err) {
    console.error('[webhook] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
