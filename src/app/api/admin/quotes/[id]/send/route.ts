import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { createDefaultSequence } from '@/lib/follow-up-engine';

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

    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quotes')
      .select('*, quote_line_items(*)')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Validate quote status
    if (quote.status !== 'APPROVED' && quote.status !== 'DRAFT') {
      return NextResponse.json(
        { error: `Cannot send quote in "${quote.status}" status. Quote must be APPROVED or DRAFT.` },
        { status: 400 }
      );
    }

    // Validate quote has line items
    if (!quote.quote_line_items || quote.quote_line_items.length === 0) {
      return NextResponse.json(
        { error: 'Quote has no line items. Add items before sending.' },
        { status: 400 }
      );
    }

    // Validate currency is set
    if (!quote.currency) {
      return NextResponse.json(
        { error: 'Quote currency is not set.' },
        { status: 400 }
      );
    }

    // Validate validity date
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

    // Fetch company info for email
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('name, email_domain, email_sender_name')
      .eq('id', companyId)
      .single();

    // Fetch customer/contact email
    let toEmail = recipient_email || null;

    if (!toEmail && quote.contact_id) {
      const { data: contact } = await supabaseAdmin
        .from('contacts')
        .select('email')
        .eq('id', quote.contact_id)
        .single();
      toEmail = contact?.email || null;
    }

    if (!toEmail && quote.customer_id) {
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('email')
        .eq('id', quote.customer_id)
        .single();
      toEmail = customer?.email || null;
    }

    // Fetch opportunity for follow-up context
    const { data: opportunity } = quote.opportunity_id
      ? await supabaseAdmin
          .from('opportunities')
          .select('id')
          .eq('id', quote.opportunity_id)
          .single()
      : { data: null };

    const now = new Date().toISOString();

    // Update quote status to SENT
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

    // Create follow-up sequence automatically if opportunity exists
    let followUpSequence = null;
    if (opportunity) {
      try {
        followUpSequence = await createDefaultSequence({
          companyId,
          opportunityId: opportunity.id,
          quoteId: id,
          channel: 'email',
          createdBy: auth.user.id,
        });
      } catch (fuErr) {
        console.error('[quotes/[id]/send:POST] Follow-up creation failed:', fuErr);
        // Non-fatal — continue without follow-up
      }
    }

    // Update opportunity stage
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

    // Log audit event
    await supabaseAdmin.from('audit_events').insert({
      company_id: companyId,
      event_type: 'sent',
      entity_type: 'quote',
      entity_id: id,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      metadata: {
        quote_number: quote.quote_number,
        recipient_email: toEmail,
        total_amount: quote.total_amount,
        currency: quote.currency,
        follow_up_created: !!followUpSequence,
      },
    });

    return NextResponse.json({
      quote: { ...quote, status: 'SENT', sent_at: now },
      sent_to: toEmail,
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
