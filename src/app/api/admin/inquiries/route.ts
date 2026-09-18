import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET /api/admin/inquiries
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const url = new URL(req.url);

    // Pagination
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10)));
    const offset = (page - 1) * pageSize;

    // Filters
    const status = url.searchParams.get('status');
    const channel = url.searchParams.get('channel');
    const priority = url.searchParams.get('priority');
    const search = url.searchParams.get('search');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const sort = url.searchParams.get('sort') || 'created_at';
    const order = url.searchParams.get('order') || 'desc';

    let query = supabaseAdmin
      .from('inquiries')
      .select('*', { count: 'exact' })
      .eq('company_id', auth.companyId);

    // Apply filters
    if (status) {
      const statuses = status.split(',');
      query = query.in('processing_status', statuses);
    }
    if (channel) {
      const channels = channel.split(',');
      query = query.in('source_channel', channels);
    }
    if (priority) {
      const priorities = priority.split(',');
      query = query.in('priority', priorities);
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }
    if (search) {
      query = query.or(`sender_name.ilike.%${search}%,sender_email.ilike.%${search}%,subject.ilike.%${search}%,original_message.ilike.%${search}%`);
    }

    // Sorting
    const allowedSorts = ['created_at', 'received_at', 'priority', 'processing_status', 'sender_name'];
    const sortField = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order === 'asc' ? true : false;
    query = query.order(sortField, { ascending: sortOrder });

    // Pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[inquiries:GET] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      inquiries: data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[inquiries:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/inquiries — create manual inquiry
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();

    const {
      sender_name,
      sender_email,
      sender_phone,
      subject,
      original_message,
      priority,
      detected_language,
      assigned_owner,
      notes,
    } = body;

    if (!original_message) {
      return NextResponse.json({ error: 'original_message is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('inquiries')
      .insert({
        company_id: auth.companyId,
        source_channel: 'manual',
        sender_name: sender_name || null,
        sender_email: sender_email || null,
        sender_phone: sender_phone || null,
        subject: subject || null,
        original_message,
        priority: priority || 'normal',
        detected_language: detected_language || null,
        assigned_owner: assigned_owner || null,
        processing_status: 'RECEIVED',
      })
      .select()
      .single();

    if (error) {
      console.error('[inquiries:POST] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ inquiry: data });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[inquiries:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
