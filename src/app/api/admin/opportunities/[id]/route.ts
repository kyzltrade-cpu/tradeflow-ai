import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET /api/admin/opportunities/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Fetch opportunity
    const { data: opportunity, error: oppError } = await supabaseAdmin
      .from('opportunities')
      .select('*')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .is('deleted_at', null)
      .single();

    if (oppError || !opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    // Fetch related data in parallel
    const [
      inquiryResult,
      extractedFieldsResult,
      customerResult,
      supplierRfqsResult,
      supplierQuotesResult,
      quotesResult,
      followUpResult,
      auditResult,
    ] = await Promise.all([
      // Inquiry data
      opportunity.inquiry_id
        ? supabaseAdmin
            .from('inquiries')
            .select('*')
            .eq('id', opportunity.inquiry_id)
            .single()
        : Promise.resolve({ data: null }),

      // Extracted fields (via inquiry)
      opportunity.inquiry_id
        ? supabaseAdmin
            .from('extracted_fields')
            .select('*')
            .eq('inquiry_id', opportunity.inquiry_id)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),

      // Customer
      opportunity.customer_id
        ? supabaseAdmin
            .from('customers')
            .select('*')
            .eq('id', opportunity.customer_id)
            .single()
        : Promise.resolve({ data: null }),

      // Supplier RFQs
      supabaseAdmin
        .from('supplier_rfqs')
        .select('*, suppliers(id, legal_name, trading_name, location)')
        .eq('opportunity_id', id)
        .order('created_at', { ascending: false }),

      // Supplier quotes
      supabaseAdmin
        .from('supplier_quotes')
        .select('*, suppliers(id, legal_name, trading_name)')
        .eq('opportunity_id', id)
        .order('created_at', { ascending: false }),

      // Customer-facing quotes
      supabaseAdmin
        .from('quotes')
        .select('*, quote_line_items(*), quote_cost_components(*)')
        .eq('opportunity_id', id)
        .order('created_at', { ascending: false }),

      // Follow-up sequences and items
      supabaseAdmin
        .from('follow_up_sequences')
        .select('*, follow_up_items(*)')
        .eq('opportunity_id', id)
        .order('created_at', { ascending: false }),

      // Audit history
      supabaseAdmin
        .from('audit_events')
        .select('*')
        .eq('entity_type', 'opportunity')
        .eq('entity_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    // Build cost build-up from the latest quote's cost components
    let costBuildUp = null;
    if (quotesResult.data && quotesResult.data.length > 0) {
      const latestQuote = quotesResult.data[0];
      costBuildUp = {
        quote_id: latestQuote.id,
        quote_number: latestQuote.quote_number,
        total_amount: latestQuote.total_amount,
        total_cost: latestQuote.total_cost,
        total_margin: latestQuote.total_margin,
        margin_pct: latestQuote.margin_pct,
        line_items: latestQuote.quote_line_items || [],
        cost_components: latestQuote.quote_cost_components || [],
      };
    }

    return NextResponse.json({
      opportunity,
      inquiry: inquiryResult.data,
      extracted_fields: extractedFieldsResult.data || [],
      customer: customerResult.data,
      supplier_rfqs: supplierRfqsResult.data || [],
      supplier_quotes: supplierQuotesResult.data || [],
      quotes: quotesResult.data || [],
      cost_build_up: costBuildUp,
      follow_ups: followUpResult.data || [],
      audit_history: auditResult.data || [],
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[opportunities/[id]:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/opportunities/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;
    const body = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('opportunities')
      .select('*')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    const {
      title,
      stage,
      trading_model,
      product_category,
      product_name,
      estimated_order_value,
      currency,
      expected_margin_pct,
      country,
      destination,
      required_delivery_date,
      owner_id,
      priority,
      next_action,
      next_action_due,
      lost_reason,
      notes,
      quote_status,
    } = body;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Only include fields that are present in the body
    if (title !== undefined) updates.title = title;
    if (stage !== undefined) updates.stage = stage;
    if (trading_model !== undefined) updates.trading_model = trading_model;
    if (product_category !== undefined) updates.product_category = product_category;
    if (product_name !== undefined) updates.product_name = product_name;
    if (estimated_order_value !== undefined) updates.estimated_order_value = estimated_order_value;
    if (currency !== undefined) updates.currency = currency;
    if (expected_margin_pct !== undefined) updates.expected_margin_pct = expected_margin_pct;
    if (country !== undefined) updates.country = country;
    if (destination !== undefined) updates.destination = destination;
    if (required_delivery_date !== undefined) updates.required_delivery_date = required_delivery_date;
    if (owner_id !== undefined) updates.owner_id = owner_id;
    if (priority !== undefined) updates.priority = priority;
    if (next_action !== undefined) updates.next_action = next_action;
    if (next_action_due !== undefined) updates.next_action_due = next_action_due;
    if (lost_reason !== undefined) updates.lost_reason = lost_reason;
    if (notes !== undefined) updates.notes = notes;
    if (quote_status !== undefined) updates.quote_status = quote_status;

    // Detect stage change for audit log
    const stageChanged = stage !== undefined && stage !== existing.stage;

    if (stageChanged) {
      updates.last_activity_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('opportunities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[opportunities/[id]:PUT] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log audit event
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'updated_at' || key === 'last_activity_at') continue;
      if (existing[key] !== value) {
        changes[key] = { from: existing[key], to: value };
      }
    }

    if (Object.keys(changes).length > 0) {
      await supabaseAdmin.from('audit_events').insert({
        company_id: auth.companyId,
        event_type: stageChanged ? 'stage_changed' : 'updated',
        entity_type: 'opportunity',
        entity_id: id,
        actor_id: auth.user.id,
        actor_email: auth.user.email,
        changes,
        metadata: stageChanged
          ? { from_stage: existing.stage, to_stage: stage }
          : undefined,
      });
    }

    return NextResponse.json({ opportunity: data });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[opportunities/[id]:PUT] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/opportunities/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('opportunities')
      .select('company_id')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    // Soft delete
    const { error } = await supabaseAdmin
      .from('opportunities')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[opportunities/[id]:DELETE] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log audit event
    await supabaseAdmin.from('audit_events').insert({
      company_id: auth.companyId,
      event_type: 'deleted',
      entity_type: 'opportunity',
      entity_id: id,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[opportunities/[id]:DELETE] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
