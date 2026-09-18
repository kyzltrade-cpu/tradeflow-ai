import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

async function verifyRfqOwnership(rfqId: string, companyId: string) {
  const { data, error } = await supabaseAdmin
    .from('supplier_rfqs')
    .select('company_id')
    .eq('id', rfqId)
    .single();

  if (error || !data) return false;
  return data.company_id === companyId;
}

// GET /api/admin/rfqs/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;

    if (!(await verifyRfqOwnership(id, auth.companyId!))) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('supplier_rfqs')
      .select(
        `
        *,
        suppliers (id, legal_name, trading_name, location, contact_name, contact_email, contact_phone, contact_whatsapp, contact_wechat),
        opportunities (id, title, stage, product_name, product_category, estimated_order_value, currency, required_delivery_date, destination, country)
      `
      )
      .eq('id', id)
      .single();

    if (error) {
      console.error('[rfqs/[id]:GET] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch associated quotes
    const { data: quotes } = await supabaseAdmin
      .from('supplier_quotes')
      .select('id, status, unit_price, currency, moq, production_lead_time_days, incoterm, is_selected, created_at')
      .eq('supplier_rfq_id', id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      rfq: data,
      quotes: quotes || [],
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[rfqs/[id]:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/rfqs/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;
    const body = await req.json();

    if (!(await verifyRfqOwnership(id, auth.companyId!))) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }

    // Check status — only DRAFT can be edited
    const { data: existing } = await supabaseAdmin
      .from('supplier_rfqs')
      .select('status')
      .eq('id', id)
      .single();

    if (existing && existing.status !== 'DRAFT') {
      return NextResponse.json(
        { error: `Cannot edit RFQ in ${existing.status} status. Only DRAFT RFQs can be edited.` },
        { status: 400 }
      );
    }

    const allowedFields = [
      'supplier_id', 'language', 'subject', 'message_body',
      'shared_fields', 'redacted_fields', 'response_deadline',
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    // If supplier_id changed, verify new supplier belongs to company
    if (updates.supplier_id) {
      const { data: supplier } = await supabaseAdmin
        .from('suppliers')
        .select('id, company_id')
        .eq('id', updates.supplier_id)
        .eq('company_id', auth.companyId)
        .single();

      if (!supplier) {
        return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('supplier_rfqs')
      .update(updates)
      .eq('id', id)
      .select(
        `
        *,
        suppliers (id, legal_name, trading_name),
        opportunities (id, title, product_name)
      `
      )
      .single();

    if (error) {
      console.error('[rfqs/[id]:PUT] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit
    const changedFields = Object.keys(updates).filter((k) => k !== 'updated_at');
    if (changedFields.length > 0) {
      await supabaseAdmin.from('audit_events').insert({
        company_id: auth.companyId,
        event_type: 'updated',
        entity_type: 'supplier_rfq',
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

    return NextResponse.json({ rfq: data });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[rfqs/[id]:PUT] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/rfqs/[id] — cancel RFQ
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;

    if (!(await verifyRfqOwnership(id, auth.companyId!))) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }

    // Check if RFQ has any quotes — prevent deletion if so
    const { count } = await supabaseAdmin
      .from('supplier_quotes')
      .select('id', { count: 'exact', head: true })
      .eq('supplier_rfq_id', id);

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete RFQ that has associated quotes. Cancel it instead.' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('supplier_rfqs')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('[rfqs/[id]:DELETE] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit
    await supabaseAdmin.from('audit_events').insert({
      company_id: auth.companyId,
      event_type: 'cancelled',
      entity_type: 'supplier_rfq',
      entity_id: id,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[rfqs/[id]:DELETE] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
