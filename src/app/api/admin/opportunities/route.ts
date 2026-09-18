import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET /api/admin/opportunities
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const url = new URL(req.url);
    const companyId = auth.companyId;

    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(url.searchParams.get('page_size') || '25', 10), 100);
    const stage = url.searchParams.get('stage');
    const owner_id = url.searchParams.get('owner_id');
    const priority = url.searchParams.get('priority');
    const sort = url.searchParams.get('sort') || 'updated_at';
    const order = url.searchParams.get('order') === 'asc' ? true : false;
    const search = url.searchParams.get('search');
    const min_value = url.searchParams.get('min_value');
    const max_value = url.searchParams.get('max_value');

    let query = supabaseAdmin
      .from('opportunities')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (stage) {
      const stages = stage.split(',');
      query = query.in('stage', stages);
    }

    if (owner_id) {
      query = query.eq('owner_id', owner_id);
    }

    if (priority) {
      const priorities = priority.split(',');
      query = query.in('priority', priorities);
    }

    if (min_value) {
      query = query.gte('estimated_order_value', parseFloat(min_value));
    }

    if (max_value) {
      query = query.lte('estimated_order_value', parseFloat(max_value));
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,product_name.ilike.%${search}%,product_category.ilike.%${search}%`);
    }

    const allowedSorts: Record<string, string> = {
      created_at: 'created_at',
      updated_at: 'updated_at',
      estimated_order_value: 'estimated_order_value',
      stage: 'stage',
      priority: 'priority',
      title: 'title',
    };
    const sortColumn = allowedSorts[sort] || 'updated_at';
    query = query.order(sortColumn, { ascending: order });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('[opportunities:GET] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      opportunities: data || [],
      total: count || 0,
      page,
      page_size: pageSize,
      has_next_page: (count || 0) > page * pageSize,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[opportunities:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/opportunities
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const {
      inquiry_id,
      customer_id,
      contact_id,
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
      notes,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const companyId = auth.companyId;

    // If linking to an inquiry, verify ownership and that it belongs to the company
    if (inquiry_id) {
      const { data: inquiry, error: inquiryError } = await supabaseAdmin
        .from('inquiries')
        .select('id, company_id')
        .eq('id', inquiry_id)
        .single();

      if (inquiryError || !inquiry) {
        return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
      }
      if (inquiry.company_id !== companyId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // If linking to a customer, verify ownership
    if (customer_id) {
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('id, company_id')
        .eq('id', customer_id)
        .single();

      if (!customer || customer.company_id !== companyId) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }
    }

    const now = new Date().toISOString();

    const insertData: Record<string, unknown> = {
      company_id: companyId,
      title,
      stage: stage || 'NEW',
      trading_model: trading_model || 'principal',
      product_category: product_category || null,
      product_name: product_name || null,
      estimated_order_value: estimated_order_value || null,
      currency: currency || 'USD',
      expected_margin_pct: expected_margin_pct || null,
      country: country || null,
      destination: destination || null,
      required_delivery_date: required_delivery_date || null,
      owner_id: owner_id || auth.user.id,
      priority: priority || 'normal',
      next_action: next_action || null,
      next_action_due: next_action_due || null,
      last_activity_at: now,
      notes: notes || null,
      created_at: now,
      updated_at: now,
    };

    if (inquiry_id) insertData.inquiry_id = inquiry_id;
    if (customer_id) insertData.customer_id = customer_id;
    if (contact_id) insertData.contact_id = contact_id;

    const { data, error } = await supabaseAdmin
      .from('opportunities')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[opportunities:POST] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Link inquiry to opportunity if provided
    if (inquiry_id) {
      await supabaseAdmin
        .from('inquiries')
        .update({ opportunity_id: data.id })
        .eq('id', inquiry_id);
    }

    // Log audit event
    await supabaseAdmin.from('audit_events').insert({
      company_id: companyId,
      event_type: 'created',
      entity_type: 'opportunity',
      entity_id: data.id,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      metadata: {
        title,
        stage: data.stage,
        inquiry_id: inquiry_id || null,
      },
    });

    return NextResponse.json({ opportunity: data }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[opportunities:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
