import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET /api/admin/conversations?company_id=xxx
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const url = new URL(req.url);
    const companyId = auth.companyId || url.searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
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

    // Last message + count for every conversation, in one query. This used to
    // issue two queries per row -- up to 100 round-trips for a 50-row page.
    const convIds = (conversations || [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((conv: any) => conv.id as string)
      .filter(Boolean);

    const lastByConv = new Map<string, { content: string; role: string; created_at: string }>();
    const countByConv = new Map<string, number>();

    if (convIds.length > 0) {
      const { data: msgs } = await supabaseAdmin
        .from('messages')
        .select('conversation_id, content, role, created_at')
        .in('conversation_id', convIds)
        // Newest first, so the first row seen for a conversation is its latest.
        .order('created_at', { ascending: false });

      for (const m of msgs || []) {
        const convId = m.conversation_id as string;
        countByConv.set(convId, (countByConv.get(convId) || 0) + 1);
        if (!lastByConv.has(convId)) {
          lastByConv.set(convId, {
            content: m.content as string,
            role: m.role as string,
            created_at: m.created_at as string,
          });
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conversationsWithMessages = (conversations || []).map((conv: any) => ({
      ...conv,
      last_message: lastByConv.get(conv.id as string) || null,
      message_count: countByConv.get(conv.id as string) || 0,
    }));

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
