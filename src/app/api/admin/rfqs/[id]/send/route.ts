import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { sendEmail } from '@/lib/email';

// POST /api/admin/rfqs/[id]/send
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

    // ── Fetch RFQ with supplier + opportunity details ────────────────
    const { data: rfq, error: rfqError } = await supabaseAdmin
      .from('supplier_rfqs')
      .select(
        `
        *,
        suppliers (id, legal_name, trading_name, contact_email, contact_name),
        opportunities (id, title, product_name)
      `
      )
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (rfqError || !rfq) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }

    if (rfq.status !== 'DRAFT') {
      return NextResponse.json(
        { error: `Cannot send RFQ in ${rfq.status} status. Only DRAFT RFQs can be sent.` },
        { status: 400 }
      );
    }

    if (!rfq.suppliers?.contact_email) {
      return NextResponse.json(
        { error: 'Supplier has no email address configured' },
        { status: 400 }
      );
    }

    if (!rfq.subject || !rfq.message_body) {
      return NextResponse.json(
        { error: 'RFQ must have a subject and message body before sending' },
        { status: 400 }
      );
    }

    // ── Fetch company info ───────────────────────────────────────────
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('name, email_sender_name, email_domain')
      .eq('id', companyId)
      .single();

    const companyName = company?.name || 'Backtide';
    const supplierName = rfq.suppliers.trading_name || rfq.suppliers.legal_name || 'Supplier';
    const opportunityTitle = rfq.opportunities?.title || '';

    // ── Build email HTML ─────────────────────────────────────────────
    const deadline = rfq.response_deadline
      ? new Date(rfq.response_deadline).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Not specified';

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                ${companyName}
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Request for Quotation
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; color: #374151; font-size: 14px; line-height: 1.6;">
                Dear ${supplierName},
              </p>
              <p style="margin: 0 0 16px; color: #374151; font-size: 14px; line-height: 1.6;">
                We would like to request a quotation for the following. Please review the details below and submit your best pricing.
              </p>

              ${opportunityTitle ? `
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <p style="margin: 0 0 4px; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Opportunity</p>
                <p style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">${opportunityTitle}</p>
              </div>` : ''}

              <!-- RFQ Details -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; font-size: 13px; width: 140px;">RFQ Number</td>
                    <td style="padding: 6px 0; color: #111827; font-size: 13px; font-weight: 600;">${rfq.rfq_number || id.slice(0, 8)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Response Deadline</td>
                    <td style="padding: 6px 0; color: #111827; font-size: 13px; font-weight: 600;">${deadline}</td>
                  </tr>
                </table>
              </div>

              <!-- Message Body -->
              <div style="color: #374151; font-size: 14px; line-height: 1.7; margin-bottom: 24px;">
                ${rfq.message_body.replace(/\n/g, '<br>')}
              </div>

              <!-- CTA -->
              <div style="text-align: center; margin-top: 32px;">
                <p style="margin: 0 0 12px; color: #6b7280; font-size: 13px;">
                  Please reply to this email with your quotation, or contact us if you have any questions.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 4px; color: #6b7280; font-size: 13px;">
                ${companyName}
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                This RFQ was sent via Backtide
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // ── Send email via Resend ────────────────────────────────────────
    const emailResult = await sendEmail({
      to: rfq.suppliers.contact_email,
      subject: rfq.subject,
      html: emailHtml,
      from: company?.email_sender_name
        ? `${company.email_sender_name} <onboarding@resend.dev>`
        : undefined,
      replyTo: company?.email_domain ? `noreply@${company.email_domain}` : undefined,
    });

    const now = new Date().toISOString();

    // ── Update RFQ status to SENT ────────────────────────────────────
    const { data: updatedRfq, error: updateError } = await supabaseAdmin
      .from('supplier_rfqs')
      .update({
        status: 'SENT',
        sent_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[rfqs/[id]/send:POST] Supabase error:', updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // ── Log audit event ──────────────────────────────────────────────
    await supabaseAdmin.from('audit_events').insert({
      company_id: companyId,
      event_type: 'sent',
      entity_type: 'supplier_rfq',
      entity_id: id,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      metadata: {
        rfq_number: rfq.rfq_number,
        sent_to: rfq.suppliers.contact_email,
        supplier_name: supplierName,
        email_sent: emailResult.success,
        email_id: emailResult.id || null,
        email_error: emailResult.error || null,
      },
    });

    return NextResponse.json({
      rfq: updatedRfq,
      email: {
        success: emailResult.success,
        id: emailResult.id || null,
        error: emailResult.error || null,
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[rfqs/[id]/send:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
