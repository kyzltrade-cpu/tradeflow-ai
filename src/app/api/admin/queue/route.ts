import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import {
  deriveQueueGroups,
  type ConversationInput,
  type QuoteInput,
  type FollowUpInput,
} from '@/lib/queue-status';
import { evaluateSendGate, type LineItemInput, type ApprovalSnapshotInput } from '@/lib/quote-gate';
import { deriveBigDeals, type OpportunityInput } from '@/lib/big-deals';

const MAX_ROWS = 200;
const INBOUND_ROLES = ['user', 'customer'];

// GET /api/admin/queue — the authenticated home. Gathers each company's
// working state and derives the fixed Queue groups.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    const companyId = auth.companyId;

    // ── Phase A: base rows ──────────────────────────────────────────────
    const [convsRes, quotesRes, followRes, oppsAllRes] = await Promise.all([
      supabaseAdmin
        .from('conversations')
        .select('id, contact_name, contact_email, subject, status, folder, read_at, updated_at, created_at')
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false })
        .limit(MAX_ROWS),
      supabaseAdmin
        .from('quotes')
        .select(
          'id, quote_number, status, currency, total_amount, margin_pct, contact_id, customer_id, opportunity_id, current_version, approval_version, approval_snapshot, valid_until, sent_at, customer_replied_at, accepted_at, rejected_at, updated_at'
        )
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false })
        .limit(MAX_ROWS),
      supabaseAdmin
        .from('follow_up_items')
        .select('id, subject, scheduled_for')
        .eq('company_id', companyId)
        .eq('status', 'scheduled')
        .lte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(MAX_ROWS),
      supabaseAdmin
        .from('opportunities')
        .select(
          'id, title, stage, priority, currency, estimated_order_value, next_action, next_action_due, last_activity_at, updated_at'
        )
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(MAX_ROWS),
    ]);

    const conversations = convsRes.data || [];
    const quotes = quotesRes.data || [];
    const followUps = followRes.data || [];
    const opportunitiesAll = oppsAllRes.data || [];

    if (convsRes.error || quotesRes.error || followRes.error || oppsAllRes.error) {
      const failed = [convsRes, quotesRes, followRes, oppsAllRes].find((r) => r.error);
      console.error('[queue:GET] Supabase error:', failed?.error?.message);
      return NextResponse.json({ error: failed?.error?.message }, { status: 500 });
    }

    // ── Phase B: enrichment batches ─────────────────────────────────────
    const convIds = conversations.map((c: { id: string }) => c.id);
    const contactIds = [...new Set(quotes.map((q: { contact_id: string | null }) => q.contact_id).filter(Boolean))];
    const custIds = [...new Set(quotes.map((q: { customer_id: string | null }) => q.customer_id).filter(Boolean))];
    const oppIds = [...new Set(quotes.map((q: { opportunity_id: string | null }) => q.opportunity_id).filter(Boolean))];
    const approvedIds = quotes
      .filter((q: { status: string }) => q.status === 'APPROVED')
      .map((q: { id: string }) => q.id);

    const [contactsRes, customersRes, oppsRes, lastMsgsRes, approvalsRes, lineItemsRes] =
      await Promise.all([
        contactIds.length
          ? supabaseAdmin.from('contacts').select('id, full_name, email').in('id', contactIds)
          : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; email: string | null }>, error: null }),
        custIds.length
          ? supabaseAdmin.from('customers').select('id, trading_name, legal_name').in('id', custIds)
          : Promise.resolve({ data: [] as Array<{ id: string; trading_name: string | null; legal_name: string | null }>, error: null }),
        oppIds.length
          ? supabaseAdmin.from('opportunities').select('id, title').in('id', oppIds)
          : Promise.resolve({ data: [] as Array<{ id: string; title: string | null }>, error: null }),
        convIds.length
          ? supabaseAdmin
              .from('messages')
              .select('id, conversation_id, role, created_at')
              .in('conversation_id', convIds)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] as Array<{ conversation_id: string; role: string; created_at: string }>, error: null }),
        approvedIds.length
          ? supabaseAdmin
              .from('quote_approvals')
              .select('quote_id, status, invalidated, quote_version')
              .in('quote_id', approvedIds)
          : Promise.resolve({ data: [] as Array<{ quote_id: string; status: string; invalidated: boolean | null; quote_version: number | null }>, error: null }),
        approvedIds.length
          ? supabaseAdmin
              .from('quote_line_items')
              .select('quote_id, product_name, quantity, unit_price, total_price, match_status, evidence_type')
              .in('quote_id', approvedIds)
          : Promise.resolve({ data: [] as Array<LineItemInput & { quote_id: string }>, error: null }),
      ]);

    const contactById = new Map(
      ((contactsRes.data || []) as Array<{ id: string; full_name: string | null; email: string | null }>).map((c) => [c.id, c]),
    );
    const custById = new Map(
      ((customersRes.data || []) as Array<{ id: string; trading_name: string | null; legal_name: string | null }>).map((c) => [c.id, c]),
    );
    const oppById = new Map(
      ((oppsRes.data || []) as Array<{ id: string; title: string | null }>).map((o) => [o.id, o]),
    );
    const linesByQuote = new Map<string, LineItemInput[]>();
    for (const li of lineItemsRes.data || []) {
      const list = linesByQuote.get(li.quote_id) ?? [];
      list.push(li);
      linesByQuote.set(li.quote_id, list);
    }
    const approvalByQuote = new Map<string, Array<{ status: string; invalidated: boolean | null; quote_version: number | null }>>();
    for (const a of approvalsRes.data || []) {
      const list = approvalByQuote.get(a.quote_id) ?? [];
      list.push(a);
      approvalByQuote.set(a.quote_id, list);
    }
    // Latest message per conversation (single batched query instead of N+1).
    const lastByConv = new Map<string, { role: string; created_at: string }>();
    for (const m of lastMsgsRes.data || []) {
      const existing = lastByConv.get(m.conversation_id);
      if (!existing || new Date(m.created_at) > new Date(existing.created_at)) {
        lastByConv.set(m.conversation_id, { role: m.role, created_at: m.created_at });
      }
    }

    const titleLead = (title: string | null | undefined): string | null => {
      if (!title || !title.trim()) return null;
      const cut = title.split(/\s*[-–—]\s*|—/)[0]?.trim();
      return cut || title.trim();
    };

    // ── Conversation inputs ─────────────────────────────────────────────
    const convInputs: ConversationInput[] = conversations.map(
      (c: { id: string; contact_name: string | null; contact_email: string | null; subject: string | null; read_at: string | null; updated_at: string | null; created_at: string | null }) => {
      const last = lastByConv.get(c.id);
      const needsReply = !!last && INBOUND_ROLES.includes(last.role);
      const readAt = c.read_at ? new Date(c.read_at).getTime() : 0;
      const lastAt = last ? new Date(last.created_at).getTime() : 0;
      return {
        id: c.id,
        customer: c.contact_name || c.contact_email || null,
        subject: c.subject || null,
        needs_reply: needsReply,
        waiting_on: !!last && !needsReply,
        last_activity_at: c.updated_at || last?.created_at || null,
        unread: last != null && (readAt === 0 || lastAt > readAt),
      };
    });

    // ── Quote inputs (with enriched name + gate status for APPROVED) ─────
    const quoteInputs: QuoteInput[] = quotes.map(
    (q: {
      id: string;
      quote_number: string | null;
      status: string | null;
      currency: string | null;
      total_amount: number | null;
      margin_pct: number | null;
      contact_id: string | null;
      customer_id: string | null;
      opportunity_id: string | null;
      current_version: number | null;
      approval_version: number | null;
      approval_snapshot: ApprovalSnapshotInput | null;
      valid_until: string | null;
      sent_at: string | null;
      customer_replied_at: string | null;
      accepted_at: string | null;
      rejected_at: string | null;
      updated_at: string | null;
    }) => {
      const contact = q.contact_id ? contactById.get(q.contact_id) : null;
      const customer = q.customer_id ? custById.get(q.customer_id) : null;
      const opp = q.opportunity_id ? oppById.get(q.opportunity_id) : null;
      const customerName =
        (contact && (contact.full_name || contact.email)) ||
        (customer && (customer.trading_name || customer.legal_name)) ||
        titleLead(opp?.title) ||
        null;
      const recipientEmail = (contact?.email as string) || null;

      let hasGateIssues = false;
      if (q.status === 'APPROVED') {
        const approvals = approvalByQuote.get(q.id) || [];
        const validApproval = approvals.find(
          (a) => a.status === 'approved' && a.invalidated !== true
        );
        let approvalVersion = q.approval_version;
        let approvalSnapshot = q.approval_snapshot;
        // Legacy approval recorded before versioning existed: best-effort
        // treat it as covering the current version so pre-migration approved
        // quotes aren't force-flagged, but only when no newer version exists.
        if (approvalVersion == null && validApproval) {
          approvalVersion = q.current_version ?? 1;
          approvalSnapshot = {
            total_amount: q.total_amount,
            margin_pct: q.margin_pct,
            recipient_email: recipientEmail,
          };
        }
        const gate = evaluateSendGate({
          id: q.id,
          quote_number: q.quote_number,
          status: 'APPROVED',
          currency: q.currency,
          total_amount: q.total_amount,
          total_margin: null,
          margin_pct: q.margin_pct,
          valid_until: q.valid_until,
          contact_id: q.contact_id,
          customer_id: q.customer_id,
          recipient_email: recipientEmail,
          current_version: q.current_version ?? 1,
          approval_version: approvalVersion,
          approval_snapshot: approvalSnapshot,
          line_items: linesByQuote.get(q.id) || [],
        });
        hasGateIssues = !gate.ok;
      }

      return {
        id: q.id,
        quote_number: q.quote_number,
        customer_name: customerName,
        contact_name: contact?.full_name ?? null,
        contact_email: contact?.email ?? null,
        status: q.status,
        currency: q.currency,
        total_amount: q.total_amount,
        current_version: q.current_version ?? 1,
        approval_version: q.approval_version,
        sent_at: q.sent_at,
        customer_replied_at: q.customer_replied_at,
        accepted_at: q.accepted_at,
        rejected_at: q.rejected_at,
        has_gate_issues: hasGateIssues,
        updated_at: q.updated_at,
      };
    });

    // ── Due follow-up inputs ─────────────────────────────────────────────
    const followInputs: FollowUpInput[] = followUps.map((f: { id: string; subject: string | null; scheduled_for: string | null }) => ({
      id: f.id,
      subject: f.subject || null,
      opportunity: null,
      scheduledFor: f.scheduled_for || null,
    }));

    const groups = deriveQueueGroups({
      conversations: convInputs,
      quotes: quoteInputs,
      followUps: followInputs,
    });

    // ── Big deals: the company's biggest open opportunities ─────────────
    const bigDeals = deriveBigDeals((opportunitiesAll as OpportunityInput[]));

    const totals = groups.reduce<Record<string, number>>((acc, g) => {
      acc[g.key] = g.count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      groups,
      totals,
      bigDeals,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[queue:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}