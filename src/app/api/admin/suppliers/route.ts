import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET /api/admin/suppliers — list the firm's trusted suppliers
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    const companyId = auth.companyId;
    const url = new URL(req.url);
    const search = url.searchParams.get('search');
    const approvedOnly = url.searchParams.get('approved') === 'true';

    let query = supabaseAdmin
      .from('suppliers')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (approvedOnly) {
      query = query.eq('is_approved', true);
    }

    if (search) {
      query = query.or(
        `legal_name.ilike.%${search}%,trading_name.ilike.%${search}%,location.ilike.%${search}%`
      );
    }

    query = query.order('is_approved', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('[suppliers:GET] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ suppliers: data || [] });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[suppliers:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/suppliers — add a trusted supplier
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    const companyId = auth.companyId;
    const body = await req.json();

    const legalName = (body.legal_name || body.trading_name || '').trim();
    if (!legalName) {
      return NextResponse.json({ error: 'legal_name is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('suppliers')
      .insert({
        company_id: companyId,
        legal_name: legalName,
        trading_name: body.trading_name || null,
        location: body.location || null,
        product_capabilities: Array.isArray(body.product_capabilities) ? body.product_capabilities : [],
        contact_name: body.contact_name || null,
        contact_email: body.contact_email || null,
        contact_phone: body.contact_phone || null,
        contact_wechat: body.contact_wechat || null,
        contact_whatsapp: body.contact_whatsapp || null,
        moq_notes: body.moq_notes || null,
        typical_lead_time_days: body.typical_lead_time_days ?? null,
        payment_terms: body.payment_terms || null,
        certifications: Array.isArray(body.certifications) ? body.certifications : [],
        is_approved: body.is_approved ?? false,
        tags: Array.isArray(body.tags) ? body.tags : [],
        notes: body.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[suppliers:POST] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ supplier: data }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[suppliers:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}