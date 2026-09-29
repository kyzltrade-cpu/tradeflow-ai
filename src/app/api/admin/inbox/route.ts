import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { sendEmail } from '@/lib/email';

const MAX_PAGE_SIZE = 200;

// POST /api/admin/inbox — compose a new outbound thread
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    const body = await req.json();
    const {
      contact_name,
      contact_email,
      subject,
      body: text,
      recipients,
      cc,
      bcc,
    } = body || {};

    const cleanList = (v: unknown): string[] => {
      const raw = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : [];
      return raw.map((s) => String(s).trim()).filter(Boolean);
    };

    const to = cleanList(recipients).length ? cleanList(recipients) : cleanList(contact_email);
    const ccList = cleanList(cc);
    const bccList = cleanList(bcc);

    if (to.length === 0 || !subject || !text?.trim()) {
      return NextResponse.json(
        { error: 'contact_email, subject, and body are required' },
        { status: 400 }
      );
    }

    // The thread is keyed on the primary recipient so a reply later lands in
    // the same conversation.
    const primary = to[0];

    const now = new Date().toISOString();
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .insert({
        company_id: auth.companyId,
        channel: 'email',
        contact_name: contact_name || primary,
        contact_email: primary,
        subject,
        status: 'active',
        folder: 'inbox',
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single();

    if (convError || !conversation) {
      console.error('[inbox:POST] create conversation error:', convError?.message);
      return NextResponse.json(
        { error: convError?.message || 'Failed to create conversation' },
        { status: 500 }
      );
    }

    // Subscribe thread so AI replies loop for this contact.
    await supabaseAdmin
      .from('company_settings')
      .select('company_id')
      .eq('company_id', auth.companyId)
      .maybeSingle()
      .catch(() => null);

    const { data: message, error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        role: 'human',
        kind: 'sent',
        status: 'sent',
        subject,
        content: text.trim(),
        sender_email: null,
        recipient_email: to.join(', '),
        created_at: now,
      })
      .select('*')
      .single();

    if (msgError) {
      console.error('[inbox:POST] create message error:', msgError.message);
    }

    const emailResult = await sendEmail({
      to,
      cc: ccList.length ? ccList : undefined,
      bcc: bccList.length ? bccList : undefined,
      subject,
      html: text.trim().replace(/\n/g, '<br/>'),
      companyId: auth.companyId,
    }).catch((err) => ({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }));

    return NextResponse.json({ conversation, message: message || null, email: emailResult }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[inbox:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/admin/inbox — full mailbox for the firm.
// Supports folders (inbox/archive/trash/all), pre-set filters, server-side
// search, and pagination. Rows carry a server-computed unread/needs-reply state.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    const companyId = auth.companyId;
    const url = new URL(req.url);
    const folder = url.searchParams.get('folder') || 'inbox';
    const filter = url.searchParams.get('filter') || 'all';
    const q = (url.searchParams.get('q') || '').trim();
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(url.searchParams.get('pageSize') || '50', 10) || 50)
    );

    let query = supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('company_id', companyId);

    if (folder === 'all') {
      // nothing extra — include everything
    } else if (folder === 'archive') {
      query = query.eq('folder', 'archive');
    } else if (folder === 'trash') {
      query = query.eq('folder', 'trash');
    } else {
      query = query.eq('folder', 'inbox');
    }

    if (filter === 'flagged') {
      query = query.eq('flagged', true);
    } else if (filter === 'human') {
      query = query.eq('status', 'human');
    } else if (filter === 'ai') {
      query = query.or('status.is.null,status.eq.active,status.eq.ai_paused');
    } else if (filter === 'bookmarked') {
      query = query.eq('status', 'bookmarked');
    }

    if (q) {
      query = query.or(`contact_name.ilike.%${q}%,contact_email.ilike.%${q}%,subject.ilike.%${q}%`);
    }

    const { data: conversations, error, count } = await query
      .order('updated_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)
      .select('*', { count: 'exact', head: false });

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
        subject: string | null;
        folder: string | null;
        read_at: string | null;
        flagged: boolean;
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
          .select('id, content, role, created_at, kind, status, subject')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count: messageCount } = await supabaseAdmin
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', conv.id);

        const lastMessage = last || null;
        const inboundRoles = ['user', 'customer'];
        const needsReply =
          !!lastMessage && inboundRoles.includes(lastMessage.role);
        const waitingOnCustomer = !!lastMessage && !needsReply;
        const readAt = conv.read_at ? new Date(conv.read_at).getTime() : 0;
        const lastAt = lastMessage ? new Date(lastMessage.created_at).getTime() : 0;
        const unread = lastMessage != null && (readAt === 0 || lastAt > readAt);

        const subject =
          conv.subject ||
          (lastMessage?.subject || lastMessage?.content || '').slice(0, 120) ||
          null;

        return {
          id: conv.id,
          contact_name: conv.contact_name || null,
          contact_email: conv.contact_email || null,
          contact_phone: conv.contact_phone || null,
          subject,
          folder: conv.folder || 'inbox',
          read_at: conv.read_at || null,
          flagged: conv.flagged || false,
          channel: conv.channel || 'email',
          status: conv.status || 'active',
          detected_language: conv.detected_language || null,
          handoff_summary: conv.handoff_summary || null,
          external_search_enabled: conv.external_search_enabled || false,
          updated_at: conv.updated_at,
          created_at: conv.created_at,
          last_message: lastMessage,
          message_count: messageCount || 0,
          needs_reply: needsReply,
          waiting_on_customer: waitingOnCustomer,
          unread,
        };
      })
    );

    const sorted = rows.sort((a, b) => {
      if (a.needs_reply !== b.needs_reply) return a.needs_reply ? -1 : 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    // Counts: computed across the FULL mailbox (all folders), so the sidebar
    // tabs stay accurate regardless of the current folder.
    const { data: allConvs } = await supabaseAdmin
      .from('conversations')
      .select('id, folder, status, flagged, read_at')
      .eq('company_id', companyId);

    const allRows = await Promise.all(
      (allConvs || []).map(async (c: { id: string; folder: string; status: string; flagged: boolean; read_at: string | null }) => {
        const { data: last } = await supabaseAdmin
          .from('messages')
          .select('role, created_at')
          .eq('conversation_id', c.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const readAt = c.read_at ? new Date(c.read_at).getTime() : 0;
        const lastAt = last ? new Date(last.created_at).getTime() : 0;
        const unread = last != null && (readAt === 0 || lastAt > readAt);
        const inboundRoles = ['user', 'customer'];
        const needsReply = !!last && inboundRoles.includes(last.role);
        return { ...c, unread, needsReply };
      })
    );

    const inboxRows = allRows.filter((r) => r.folder === 'inbox' || r.folder === null || r.folder === undefined);
    const counts = {
      inbox: allRows.filter((r) => r.folder === 'inbox' || r.folder === null || r.folder === undefined).length,
      unread: inboxRows.filter((r) => r.unread).length,
      needs_reply: inboxRows.filter((r) => r.needsReply).length,
      waiting: inboxRows.filter((r) => !r.needsReply).length,
      bookmarked: inboxRows.filter((r) => r.status === 'bookmarked').length,
      flagged: allRows.filter((r) => r.flagged).length,
      human: inboxRows.filter((r) => r.status === 'human').length,
      ai: inboxRows.filter((r) => r.status === 'active' || r.status === 'ai_paused' || r.status === null).length,
      archive: allRows.filter((r) => r.folder === 'archive').length,
      trash: allRows.filter((r) => r.folder === 'trash').length,
      total: allRows.length,
    };

    return NextResponse.json({
      conversations: sorted,
      counts,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[inbox:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}