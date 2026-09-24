import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

async function verifySupplierOwnership(supplierId: string, companyId: string) {
  const { data, error } = await supabaseAdmin
    .from('suppliers')
    .select('company_id')
    .eq('id', supplierId)
    .single();

  if (error || !data) return false;
  return data.company_id === companyId;
}

// GET /api/admin/suppliers/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;

    if (!(await verifySupplierOwnership(id, auth.companyId!))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const [supplierResult, documentsResult, quotesResult, rfqsResult] = await Promise.all([
      supabaseAdmin
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single(),
      supabaseAdmin
        .from('supplier_documents')
        .select('*')
        .eq('supplier_id', id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('supplier_quotes')
        .select('id, status, quoted_price, currency, lead_time_days, created_at')
        .eq('supplier_id', id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('supplier_rfqs')
        .select('id, status, subject, sent_at, created_at')
        .eq('supplier_id', id)
        .order('created_at', { ascending: false }),
    ]);

    if (supplierResult.error) {
      console.error('[suppliers/[id]:GET] Supabase error:', supplierResult.error.message);
      return NextResponse.json({ error: supplierResult.error.message }, { status: 500 });
    }

    const performance = {
      total_quotes: quotesResult.data?.length ?? 0,
      accepted_quotes: quotesResult.data?.filter((q: { status: string }) => q.status === 'accepted').length ?? 0,
      total_rfqs: rfqsResult.data?.length ?? 0,
      response_rate: rfqsResult.data && rfqsResult.data.length > 0
        ? Math.round(
            ((quotesResult.data?.length ?? 0) / rfqsResult.data.length) * 100
          )
        : 0,
    };

    return NextResponse.json({
      supplier: supplierResult.data,
      documents: documentsResult.data ?? [],
      quotes: quotesResult.data ?? [],
      rfqs: rfqsResult.data ?? [],
      performance,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[suppliers/[id]:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/suppliers/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;
    const body = await req.json();

    if (!(await verifySupplierOwnership(id, auth.companyId!))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const allowedFields = [
      'legal_name', 'trading_name', 'contact_name', 'contact_email', 'contact_phone',
      'contact_whatsapp', 'contact_wechat', 'location', 'product_capabilities', 'certifications',
      'payment_terms', 'moq_notes', 'typical_lead_time_days', 'notes', 'is_approved',
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
      .from('suppliers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[suppliers/[id]:PUT] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ supplier: data });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[suppliers/[id]:PUT] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/suppliers/[id]  (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;

    if (!(await verifySupplierOwnership(id, auth.companyId!))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('suppliers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[suppliers/[id]:DELETE] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[suppliers/[id]:DELETE] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
