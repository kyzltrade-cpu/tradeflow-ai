import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET /api/admin/conversations?company_id=xxx
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const url = new URL(req.url);
    const companyId = url.searchParams.get('company_id') || auth.companyId;

    if (companyId !== auth.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get conversations with last message
    const { data: conversations, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get last message for each conversation
    const conversationsWithMessages = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (conversations || []).map(async (conv: any) => {
        const { data: lastMessage } = await supabaseAdmin
          .from('messages')
          .select('content, role, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const { count: messageCount } = await supabaseAdmin
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id);

        return {
          ...conv,
          last_message: lastMessage || null,
          message_count: messageCount || 0,
        };
      })
    );

    return NextResponse.json({ conversations: conversationsWithMessages });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[conversations:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/conversations
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
    }

    const validStatuses = ['active', 'human', 'bookmarked', 'ai_paused'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Verify ownership
    const { data: conversation, error: fetchError } = await supabaseAdmin
      .from('conversations')
      .select('company_id')
      .eq('id', id)
      .single();

    if (fetchError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (conversation.company_id !== auth.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('conversations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[conversations:PATCH] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
