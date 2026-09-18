import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET /api/admin/customers
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const url = new URL(req.url);
    const companyId = auth.companyId;

    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(url.searchParams.get('page_size') || '25', 10), 100);
    const search = url.searchParams.get('search');
    const sort = url.searchParams.get('sort') || 'created_at';
    const order = url.searchParams.get('order') === 'asc';

    let query = supabaseAdmin
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (search) {
      query = query.or(
        `legal_name.ilike.%${search}%,trading_name.ilike.%${search}%,email_domain.ilike.%${search}%,country.ilike.%${search}%`
      );
    }

    const allowedSorts: Record<string, string> = {
      created_at: 'created_at',
      updated_at: 'updated_at',
      legal_name: 'legal_name',
      country: 'country',
    };
    const sortColumn = allowedSorts[sort] || 'created_at';
    query = query.order(sortColumn, { ascending: order });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('[customers:GET] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      customers: data || [],
      total: count || 0,
      page,
      page_size: pageSize,
      has_next_page: (count || 0) > page * pageSize,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[customers:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/customers
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const {
      legal_name,
      trading_name,
      email_domain,
      country,
      industry,
      currency,
      preferred_language,
      notes,
      tags,
    } = body;

    if (!legal_name) {
      return NextResponse.json({ error: 'legal_name is required' }, { status: 400 });
    }

    const companyId = auth.companyId;
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('customers')
      .insert({
        company_id: companyId,
        legal_name,
        trading_name: trading_name || null,
        email_domain: email_domain || null,
        country: country || null,
        industry: industry || null,
        currency: currency || 'USD',
        preferred_language: preferred_language || 'en',
        notes: notes || null,
        tags: tags || '[]',
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error('[customers:POST] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log audit event
    await supabaseAdmin.from('audit_events').insert({
      company_id: companyId,
      event_type: 'created',
      entity_type: 'customer',
      entity_id: data.id,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      metadata: { legal_name },
    });

    return NextResponse.json({ customer: data }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[customers:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
