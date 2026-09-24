import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { createDefaultSequence } from '@/lib/follow-up-engine';
import { generateQuoteHTML, generateQuotePDF } from '@/lib/quote-generator';
import { sendEmail } from '@/lib/email';

// POST /api/admin/quotes/[id]/send
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    const companyId = auth.companyId;
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { recipient_email, subject, message } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // ── Fetch quote with line items ──────────────────────────────────
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quotes')
      .select('*, quote_line_items(*)')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // ── Validate quote status ────────────────────────────────────────
    if (quote.status !== 'APPROVED' && quote.status !== 'DRAFT') {
      return NextResponse.json(
        { error: `Cannot send quote in "${quote.status}" status. Quote must be APPROVED or DRAFT.` },
        { status: 400 }
      );
    }

    if (!quote.quote_line_items || quote.quote_line_items.length === 0) {
      return NextResponse.json(
        { error: 'Quote has no line items. Add items before sending.' },
        { status: 400 }
      );
    }

    if (!quote.currency) {
      return NextResponse.json(
        { error: 'Quote currency is not set.' },
        { status: 400 }
      );
    }

    if (!quote.valid_until) {
      return NextResponse.json(
        { error: 'Quote validity date is not set.' },
        { status: 400 }
      );
    }

    const validUntil = new Date(quote.valid_until);
    if (validUntil <= new Date()) {
      return NextResponse.json(
        { error: 'Quote validity date has already passed. Extend validity before sending.' },
        { status: 400 }
      );
    }

    // ── Fetch company info ───────────────────────────────────────────
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('id, name, email_domain, email_sender_name')
      .eq('id', companyId)
      .single();

    // ── Resolve recipient email ──────────────────────────────────────
    let toEmail = recipient_email || null;

    if (!toEmail && quote.contact_id) {
      const { data: contact } = await supabaseAdmin
        .from('contacts')
        .select('email, name')
        .eq('id', quote.contact_id)
        .single();
      toEmail = contact?.email || null;
    }

    if (!toEmail && quote.customer_id) {
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('email, name')
        .eq('id', quote.customer_id)
        .single();
      toEmail = customer?.email || null;
    }

    if (!toEmail) {
      return NextResponse.json(
        { error: 'No recipient email found. Provide recipient_email or link a contact/customer with an email.' },
        { status: 400 }
      );
    }

    // ── Build HTML email + PDF attachment ─────────────────────────────
    const lineItems = (quote.quote_line_items || []).map((li: Record<string, unknown>) => ({
      id: li.id as string,
      quoteId: li.quote_id as string,
      productName: li.product_name as string,
      description: (li.description as string) || null,
      specifications: (li.specifications as string) || null,
      quantity: li.quantity as number,
      unit: li.unit as string,
      unitPrice: li.unit_price as number,
      totalPrice: li.total_price as number,
      currency: li.currency as string,
      sourceSupplierId: (li.source_supplier_id as string) || null,
      sourceSupplierQuoteId: (li.source_supplier_quote_id as string) || null,
      costBreakdown: [],
      margin: (li.margin as number) || null,
      marginPercent: (li.margin_percent as number) || null,
      notes: (li.notes as string) || null,
      createdAt: li.created_at as string,
      updatedAt: li.updated_at as string,
    }));

    const quoteObj = {
      id: quote.id,
      opportunityId: quote.opportunity_id || '',
      status: quote.status as 'DRAFT' | 'SENT' | 'APPROVED' | 'OPENED' | 'ACCEPTED' | 'REJECTED',
      version: quote.current_version || 1,
      currency: quote.currency,
      validUntil: quote.valid_until,
      paymentTerms: quote.payment_terms || null,
      deliveryTerms: quote.delivery_terms || null,
      incoterms: quote.incoterms || null,
      notes: quote.notes || null,
      internalNotes: null,
      lineItems,
      costComponents: [],
      totalCost: quote.total_cost || 0,
      margin: quote.margin || 0,
      marginPercent: quote.margin_percent || 0,
      sentAt: null,
      openedAt: null,
      acceptedAt: null,
      rejectedAt: null,
      createdAt: quote.created_at,
      updatedAt: quote.updated_at,
    };

    const companyName = company?.name || 'Vectra';
    const companyLogoUrl = null;

    const emailHtml = generateQuoteHTML(quoteObj, { id: companyId, name: companyName, logoUrl: companyLogoUrl }, lineItems);

    // Generate PDF as attachment
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await generateQuotePDF(quoteObj, { id: companyId, name: companyName, logoUrl: companyLogoUrl }, lineItems);
    } catch (pdfErr) {
      console.error('[quotes/[id]/send] PDF generation failed (non-fatal):', pdfErr);
    }

    // ── Send email via Resend ────────────────────────────────────────
    const emailSubject = subject || `Quotation ${quote.id} from ${companyName}`;
    const customHtml = message
      ? `<div style="padding: 24px 32px; color: #374151; font-size: 14px; line-height: 1.6; border-bottom: 1px solid #e5e7eb;">${message.replace(/\n/g, '<br>')}</div>\n${emailHtml.split('</body>')[0]}</body>`
      : emailHtml;

    const emailResult = await sendEmail({
      to: toEmail,
      subject: emailSubject,
      html: customHtml,
      from: company?.email_sender_name
        ? `${company.email_sender_name} <onboarding@resend.dev>`
        : undefined,
      replyTo: company?.email_domain ? `noreply@${company.email_domain}` : undefined,
      attachments: pdfBuffer
        ? [{ filename: `${quote.id}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
        : undefined,
    });

    const now = new Date().toISOString();

    // ── Update quote status to SENT ──────────────────────────────────
    const { error: updateError } = await supabaseAdmin
      .from('quotes')
      .update({
        status: 'SENT',
        sent_at: now,
        updated_at: now,
      })
      .eq('id', id);

    if (updateError) {
      console.error('[quotes/[id]/send:POST] Supabase error:', updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // ── Create follow-up sequence automatically ──────────────────────
    let followUpSequence = null;
    if (quote.opportunity_id) {
      try {
        followUpSequence = await createDefaultSequence({
          companyId,
          opportunityId: quote.opportunity_id,
          quoteId: id,
          channel: 'email',
          createdBy: auth.user.id,
        });
      } catch (fuErr) {
        console.error('[quotes/[id]/send:POST] Follow-up creation failed:', fuErr);
      }
    }

    // ── Update opportunity stage ─────────────────────────────────────
    if (quote.opportunity_id) {
      await supabaseAdmin
        .from('opportunities')
        .update({
          quote_status: 'sent',
          updated_at: now,
          last_activity_at: now,
        })
        .eq('id', quote.opportunity_id);
    }

    // ── Log audit event ──────────────────────────────────────────────
    await supabaseAdmin.from('audit_events').insert({
      company_id: companyId,
      event_type: 'sent',
      entity_type: 'quote',
      entity_id: id,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      metadata: {
        quote_number: quote.id,
        recipient_email: toEmail,
        total_amount: quote.total_amount,
        currency: quote.currency,
        email_sent: emailResult.success,
        email_id: emailResult.id || null,
        email_error: emailResult.error || null,
        follow_up_created: !!followUpSequence,
      },
    });

    return NextResponse.json({
      quote: { ...quote, status: 'SENT', sent_at: now },
      sent_to: toEmail,
      email: {
        success: emailResult.success,
        id: emailResult.id || null,
        error: emailResult.error || null,
      },
      follow_up_sequence: followUpSequence
        ? { id: followUpSequence.id, items_count: followUpSequence.items?.length || 0 }
        : null,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[quotes/[id]/send:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
