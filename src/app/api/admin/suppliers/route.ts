import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET /api/admin/suppliers?page=1&limit=20&search=&approved=true
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const url = new URL(req.url);
    const companyId = auth.companyId || url.searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;
    const search = url.searchParams.get('search') || '';
    const approved = url.searchParams.get('approved');

    let query = supabaseAdmin
      .from('suppliers')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('legal_name');

    if (search) {
      query = query.or(`legal_name.ilike.%${search}%,trading_name.ilike.%${search}%,location.ilike.%${search}%,contact_name.ilike.%${search}%`);
    }

    if (approved === 'true') {
      query = query.eq('is_approved', true);
    } else if (approved === 'false') {
      query = query.eq('is_approved', false);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('[suppliers:GET] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      suppliers: data,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[suppliers:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/suppliers
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const {
      company_id,
      legal_name,
      trading_name,
      contact_name,
      contact_email,
      contact_phone,
      contact_whatsapp,
      contact_wechat,
      location,
      product_capabilities,
      certifications,
      payment_terms,
      moq_notes,
      typical_lead_time_days,
      notes,
    } = body;

    if (!legal_name) {
      return NextResponse.json({ error: 'legal_name required' }, { status: 400 });
    }

    const companyId = company_id || auth.companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    if (auth.companyId && companyId !== auth.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('suppliers')
      .insert({
        company_id: companyId,
        legal_name,
        trading_name: trading_name || null,
        contact_name: contact_name || null,
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
        contact_whatsapp: contact_whatsapp || null,
        contact_wechat: contact_wechat || null,
        location: location || null,
        product_capabilities: product_capabilities || [],
        certifications: certifications || [],
        payment_terms: payment_terms || null,
        moq_notes: moq_notes || null,
        typical_lead_time_days: typical_lead_time_days || null,
        notes: notes || null,
        is_approved: false,
      })
      .select()
      .single();

    if (error) {
      console.error('[suppliers:POST] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ supplier: data });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[suppliers:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
