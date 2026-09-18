import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET — list knowledge base documents
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const companyId = req.nextUrl.searchParams.get('company_id') || auth.companyId;

    if (companyId !== auth.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('knowledge_base')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[knowledge:GET] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[knowledge:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST — upload a knowledge base document
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const { company_id, name, type, content, file_size } = body;

    if (!name || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (company_id && company_id !== auth.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('knowledge_base')
      .insert({ company_id: auth.companyId, name, filename: name, type: type || 'text', content, file_size: file_size || content.length })
      .select()
      .single();

    if (error) {
      console.error('[knowledge:POST] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[knowledge:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE — remove a document
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('knowledge_base')
      .select('company_id')
      .eq('id', id)
      .single();

    if (existing && existing.company_id !== auth.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabaseAdmin.from('knowledge_base').delete().eq('id', id);
    if (error) {
      console.error('[knowledge:DELETE] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[knowledge:DELETE] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
