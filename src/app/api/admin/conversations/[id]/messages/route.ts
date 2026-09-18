import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET /api/admin/conversations/[id]/messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'conversation id required' }, { status: 400 });
    }

    // Verify the conversation belongs to the user's company
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('company_id')
      .eq('id', id)
      .single();

    if (!conv || conv.company_id !== auth.companyId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[messages:GET] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ messages: data });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[messages:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/conversations/[id]/messages
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;
    const body = await req.json();
    const { role, content } = body;

    if (!id || !role || !content) {
      return NextResponse.json({ error: 'conversation_id, role, and content required' }, { status: 400 });
    }

    // Verify the conversation belongs to the user's company
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('company_id')
      .eq('id', id)
      .single();

    if (!conv || conv.company_id !== auth.companyId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: id,
        role,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error('[messages:POST] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update conversation updated_at
    await supabaseAdmin
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({ message: data });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[messages:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
