import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET /api/admin/inbox — email-first inbox for the firm
// Sorted: conversations where the last ball is in our court first ("Waiting on you"),
// then by most recently updated.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    const companyId = auth.companyId;
    const url = new URL(req.url);
    const filter = url.searchParams.get('filter') || 'all';

    const { data: conversations, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('company_id', companyId)
      .order('updated_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('[inbox:GET] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = await Promise.all(
      (conversations || []).map(async (conv: {
        id: string;
        contact_name: string | null;
        contact_email: string | null;
        contact_phone: string | null;
        channel: string;
        status: string;
        detected_language: string | null;
        handoff_summary: string | null;
        external_search_enabled: boolean;
        updated_at: string;
        created_at: string;
      }) => {
        const { data: last } = await supabaseAdmin
          .from('messages')
          .select('content, role, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count } = await supabaseAdmin
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id);

        const lastMessage = last || null;
        const needsReply =
          !!lastMessage && (lastMessage.role === 'user' || lastMessage.role === 'customer');
        const waitingOnCustomer = !!lastMessage && !needsReply;

        return {
          id: conv.id,
          contact_name: conv.contact_name || null,
          contact_email: conv.contact_email || null,
          contact_phone: conv.contact_phone || null,
          channel: conv.channel || 'email',
          status: conv.status || 'active',
          detected_language: conv.detected_language || null,
          handoff_summary: conv.handoff_summary || null,
          external_search_enabled: conv.external_search_enabled || false,
          updated_at: conv.updated_at,
          created_at: conv.created_at,
          last_message: lastMessage,
          message_count: count || 0,
          needs_reply: needsReply,
          waiting_on_customer: waitingOnCustomer,
        };
      })
    );

    let filtered = rows;
    if (filter === 'needs_reply') filtered = rows.filter((r) => r.needs_reply);
    else if (filter === 'waiting') filtered = rows.filter((r) => r.waiting_on_customer);
    else if (filter === 'bookmarked') filtered = rows.filter((r) => r.status === 'bookmarked');
    else if (filter === 'human') filtered = rows.filter((r) => r.status === 'human');
    else if (filter === 'ai') filtered = rows.filter((r) => !['human', 'bookmarked'].includes(r.status));

    const sorted = filtered.sort((a, b) => {
      if (a.needs_reply !== b.needs_reply) return a.needs_reply ? -1 : 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    const counts = {
      needs_reply: rows.filter((r) => r.needs_reply).length,
      waiting: rows.filter((r) => r.waiting_on_customer).length,
      bookmarked: rows.filter((r) => r.status === 'bookmarked').length,
      human: rows.filter((r) => r.status === 'human').length,
      ai: rows.filter((r) => !['human', 'bookmarked'].includes(r.status)).length,
      total: rows.length,
    };

    return NextResponse.json({ conversations: sorted, counts });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[inbox:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}