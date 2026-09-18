import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET /api/admin/contacts
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const url = new URL(req.url);
    const companyId = auth.companyId;

    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(url.searchParams.get('page_size') || '25', 10), 100);
    const customer_id = url.searchParams.get('customer_id');
    const search = url.searchParams.get('search');
    const sort = url.searchParams.get('sort') || 'created_at';
    const order = url.searchParams.get('order') === 'asc';

    let query = supabaseAdmin
      .from('contacts')
      .select('*, customers(id, legal_name, trading_name)', { count: 'exact' })
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    const allowedSorts: Record<string, string> = {
      created_at: 'created_at',
      updated_at: 'updated_at',
      full_name: 'full_name',
    };
    const sortColumn = allowedSorts[sort] || 'created_at';
    query = query.order(sortColumn, { ascending: order });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('[contacts:GET] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      contacts: data || [],
      total: count || 0,
      page,
      page_size: pageSize,
      has_next_page: (count || 0) > page * pageSize,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[contacts:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/contacts
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const {
      customer_id,
      full_name,
      email,
      phone,
      whatsapp,
      wechat_id,
      title,
      is_primary,
      preferred_language,
      notes,
    } = body;

    if (!full_name) {
      return NextResponse.json({ error: 'full_name is required' }, { status: 400 });
    }

    const companyId = auth.companyId;

    // If linking to a customer, verify ownership
    if (customer_id) {
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('id, company_id')
        .eq('id', customer_id)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .single();

      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }
    }

    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('contacts')
      .insert({
        company_id: companyId,
        customer_id: customer_id || null,
        full_name,
        email: email || null,
        phone: phone || null,
        whatsapp: whatsapp || null,
        wechat_id: wechat_id || null,
        title: title || null,
        is_primary: is_primary || false,
        preferred_language: preferred_language || 'en',
        notes: notes || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error('[contacts:POST] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log audit event
    await supabaseAdmin.from('audit_events').insert({
      company_id: companyId,
      event_type: 'created',
      entity_type: 'contact',
      entity_id: data.id,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      metadata: { full_name, customer_id: customer_id || null },
    });

    return NextResponse.json({ contact: data }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[contacts:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
