import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET /api/admin/documents
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const url = new URL(req.url);
    const companyId = auth.companyId;

    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(url.searchParams.get('page_size') || '25', 10), 100);
    const doc_type = url.searchParams.get('doc_type');
    const search = url.searchParams.get('search');
    const sort = url.searchParams.get('sort') || 'created_at';
    const order = url.searchParams.get('order') === 'asc';

    let query = supabaseAdmin
      .from('documents')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId);

    if (doc_type) {
      const types = doc_type.split(',');
      query = query.in('doc_type', types);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,doc_type.ilike.%${search}%`);
    }

    const allowedSorts: Record<string, string> = {
      created_at: 'created_at',
      updated_at: 'updated_at',
      name: 'name',
      doc_type: 'doc_type',
    };
    const sortColumn = allowedSorts[sort] || 'created_at';
    query = query.order(sortColumn, { ascending: order });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('[documents:GET] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      documents: data || [],
      total: count || 0,
      page,
      page_size: pageSize,
      has_next_page: (count || 0) > page * pageSize,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[documents:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/documents
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const { name, doc_type, file_url, storage_path, content, file_type, file_size, source_references } = body;

    if (!name || !doc_type) {
      return NextResponse.json({ error: 'name and doc_type are required' }, { status: 400 });
    }

    const companyId = auth.companyId;
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('documents')
      .insert({
        company_id: companyId,
        name,
        doc_type,
        file_url: file_url || null,
        storage_path: storage_path || null,
        content: content || null,
        file_type: file_type || null,
        file_size: file_size || null,
        extraction_status: content ? 'completed' : 'pending',
        source_references: source_references || '[]',
        created_by: auth.user.id,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error('[documents:POST] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log audit event
    await supabaseAdmin.from('audit_events').insert({
      company_id: companyId,
      event_type: 'created',
      entity_type: 'document',
      entity_id: data.id,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      metadata: { name, doc_type },
    });

    return NextResponse.json({ document: data }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[documents:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
