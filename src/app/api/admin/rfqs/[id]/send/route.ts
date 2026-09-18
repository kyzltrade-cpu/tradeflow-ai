import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// POST /api/admin/rfqs/[id]/send
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;

    // Fetch RFQ with supplier details
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
      .eq('company_id', auth.companyId)
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

    // Verify the RFQ has content
    if (!rfq.subject || !rfq.message_body) {
      return NextResponse.json(
        { error: 'RFQ must have a subject and message body before sending' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Update status to SENT
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

    // Create workflow job for email sending
    await supabaseAdmin.from('workflow_jobs').insert({
      company_id: auth.companyId,
      job_type: 'send_rfq_email',
      entity_type: 'supplier_rfq',
      entity_id: id,
      status: 'pending',
      payload: {
        rfq_id: id,
        rfq_number: rfq.rfq_number,
        to_email: rfq.suppliers.contact_email,
        to_name: rfq.suppliers.contact_name,
        subject: rfq.subject,
        message_body: rfq.message_body,
        supplier_name: rfq.suppliers.trading_name || rfq.suppliers.legal_name,
        opportunity_title: rfq.opportunities?.title,
        response_deadline: rfq.response_deadline,
      },
      idempotency_key: `rfq-send-${id}`,
    });

    // Audit
    await supabaseAdmin.from('audit_events').insert({
      company_id: auth.companyId,
      event_type: 'sent',
      entity_type: 'supplier_rfq',
      entity_id: id,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      metadata: {
        rfq_number: rfq.rfq_number,
        sent_to: rfq.suppliers.contact_email,
      },
    });

    return NextResponse.json({ rfq: updatedRfq });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[rfqs/[id]/send:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
