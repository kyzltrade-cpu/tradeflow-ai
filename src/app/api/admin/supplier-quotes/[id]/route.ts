import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

async function verifyQuoteOwnership(quoteId: string, companyId: string) {
  const { data, error } = await supabaseAdmin
    .from('supplier_quotes')
    .select('company_id')
    .eq('id', quoteId)
    .single();

  if (error || !data) return false;
  return data.company_id === companyId;
}

// GET /api/admin/supplier-quotes/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;

    if (!(await verifyQuoteOwnership(id, auth.companyId!))) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('supplier_quotes')
      .select(
        `
        *,
        suppliers (id, legal_name, trading_name, location, contact_name, contact_email, contact_phone, performance_score, on_time_rate, quality_reject_rate),
        supplier_rfqs (id, rfq_number, subject, message_body, shared_fields, redacted_fields, response_deadline, sent_at),
        opportunities (id, title, stage, product_name, product_category, estimated_order_value, currency, required_delivery_date, destination)
      `
      )
      .eq('id', id)
      .single();

    if (error) {
      console.error('[supplier-quotes/[id]:GET] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ quote: data });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[supplier-quotes/[id]:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/supplier-quotes/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;
    const body = await req.json();

    if (!(await verifyQuoteOwnership(id, auth.companyId!))) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const allowedFields = [
      'unit_price', 'currency', 'moq', 'quantity_breaks',
      'tooling_cost', 'sample_cost', 'packaging_cost',
      'production_lead_time_days', 'payment_terms', 'incoterm',
      'freight_assumptions', 'quote_validity_days', 'certifications',
      'warranty_terms', 'exclusions', 'notes', 'source_type',
      'source_file_url', 'extracted_raw', 'confidence',
      'is_selected', 'status',
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('supplier_quotes')
      .update(updates)
      .eq('id', id)
      .select(
        `
        *,
        suppliers (id, legal_name, trading_name),
        supplier_rfqs (id, rfq_number, subject)
      `
      )
      .single();

    if (error) {
      console.error('[supplier-quotes/[id]:PUT] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit
    const changedFields = Object.keys(updates).filter((k) => k !== 'updated_at');
    if (changedFields.length > 0) {
      await supabaseAdmin.from('audit_events').insert({
        company_id: auth.companyId,
        event_type: 'updated',
        entity_type: 'supplier_quote',
        entity_id: id,
        actor_id: auth.user.id,
        actor_email: auth.user.email,
        changes: changedFields.reduce(
          (acc, key) => {
            acc[key] = { to: updates[key] };
            return acc;
          },
          {} as Record<string, unknown>
        ),
      });
    }

    return NextResponse.json({ quote: data });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[supplier-quotes/[id]:PUT] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/supplier-quotes/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;

    if (!(await verifyQuoteOwnership(id, auth.companyId!))) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Check if this quote is selected for any customer-facing quote
    const { count } = await supabaseAdmin
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .eq('selected_supplier_quote_id', id);

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete a quote that is selected for a customer-facing quote. Deselect it first.' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('supplier_quotes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[supplier-quotes/[id]:DELETE] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit
    await supabaseAdmin.from('audit_events').insert({
      company_id: auth.companyId,
      event_type: 'deleted',
      entity_type: 'supplier_quote',
      entity_id: id,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[supplier-quotes/[id]:DELETE] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
