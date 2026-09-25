import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/admin/inbox/[id] — full workspace: conversation + messages + related inquiries/opportunities
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    const { id } = await params;

    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('id, role, content, tokens_used, created_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    const { data: inquiries } = await supabaseAdmin
      .from('inquiries')
      .select('id, subject, original_message, processing_status, detected_language, received_at')
      .eq('conversation_id', id)
      .order('received_at', { ascending: false })
      .limit(20);

    let opportunities: unknown[] = [];
    if (inquiries?.length) {
      const inquiryIds = inquiries.map((i: { id: string }) => i.id);
      const { data: opps } = await supabaseAdmin
        .from('opportunities')
        .select('*')
        .in('inquiry_id', inquiryIds)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(10);
      opportunities = opps || [];
    }

    // Also surface an opportunity directly linked to the conversation (e.g. auto-created
    // from a suggestion for a conversation that has no linked inquiry).
    if (conversation.opportunity_id) {
      const { data: directOpp } = await supabaseAdmin
        .from('opportunities')
        .select('*')
        .eq('id', conversation.opportunity_id)
        .is('deleted_at', null)
        .maybeSingle();
      if (directOpp) {
        const known = (opportunities as { id: string }[]).some((o) => o.id === directOpp.id);
        if (!known) opportunities = [directOpp, ...opportunities];
      }
    }

    let quotes: unknown[] = [];
    let approvals: unknown[] = [];
    if (opportunities.length) {
      const oppIds = (opportunities as { id: string }[]).map((o) => o.id);
      const { data: quoteRows } = await supabaseAdmin
        .from('quotes')
        .select('*')
        .in('opportunity_id', oppIds)
        .order('updated_at', { ascending: false })
        .limit(10);
      quotes = quoteRows || [];
      if (quotes.length) {
        const quoteIds = (quotes as { id: string }[]).map((q) => q.id);
        const { data: approvalRows } = await supabaseAdmin
          .from('quote_approvals')
          .select('*')
          .in('quote_id', quoteIds)
          .order('created_at', { ascending: false });
        approvals = approvalRows || [];
      }
    }

    return NextResponse.json({
      conversation,
      messages: messages || [],
      inquiries: inquiries || [],
      opportunities,
      quotes,
      approvals,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[inbox:GET.id] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/inbox/[id] — update conversation settings:
// external_search_enabled (per-customer auto-reply web search), status, contact_name
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    const { id } = await params;

    const { data: existing } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (typeof body.external_search_enabled === 'boolean') {
      updates.external_search_enabled = body.external_search_enabled;
    }
    if (body.status !== undefined) {
      const statuses = ['active', 'human', 'bookmarked', 'ai_paused'];
      if (!statuses.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = body.status;
    }
    if (body.contact_name !== undefined) updates.contact_name = body.contact_name || null;

    const { data, error } = await supabaseAdmin
      .from('conversations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[inbox:PATCH.id] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conversation: data });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[inbox:PATCH.id] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}