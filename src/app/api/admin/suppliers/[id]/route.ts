import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

async function getOwnedSupplier(req: NextRequest, id: string) {
  const auth = await requireAuth(req);
  if (!auth.companyId) return null;
  const { data } = await supabaseAdmin
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .eq('company_id', auth.companyId)
    .is('deleted_at', null)
    .single();
  return { auth, data };
}

// GET /api/admin/suppliers/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const owner = await getOwnedSupplier(req, id);
    if (!owner || !owner.data) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }
    return NextResponse.json({ supplier: owner.data });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[suppliers:GET.id] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/suppliers/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const owner = await getOwnedSupplier(req, id);
    const { auth, data: existing } = owner || {};
    if (!owner || !existing) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    const scalarFields = [
      'legal_name', 'trading_name', 'location', 'contact_name', 'contact_email',
      'contact_phone', 'contact_wechat', 'contact_whatsapp', 'moq_notes',
      'payment_terms', 'quality_notes', 'delivery_notes', 'notes',
    ] as const;
    for (const f of scalarFields) {
      if (body[f] !== undefined) updates[f] = body[f] === '' ? null : body[f];
    }

    if (body.is_approved !== undefined) updates.is_approved = Boolean(body.is_approved);
    if (body.typical_lead_time_days !== undefined) updates.typical_lead_time_days = body.typical_lead_time_days;
    if (body.performance_score !== undefined) updates.performance_score = body.performance_score;
    if (body.on_time_rate !== undefined) updates.on_time_rate = body.on_time_rate;
    if (body.quality_reject_rate !== undefined) updates.quality_reject_rate = body.quality_reject_rate;
    if (Array.isArray(body.product_capabilities)) updates.product_capabilities = body.product_capabilities;
    if (Array.isArray(body.certifications)) updates.certifications = body.certifications;
    if (Array.isArray(body.tags)) updates.tags = body.tags;

    const { data, error } = await supabaseAdmin
      .from('suppliers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[suppliers:PATCH.id] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ supplier: data });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[suppliers:PATCH.id] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/suppliers/[id] — soft delete
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const owner = await getOwnedSupplier(req, id);
    if (!owner || !owner.data) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('suppliers')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[suppliers:DELETE.id] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[suppliers:DELETE.id] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}