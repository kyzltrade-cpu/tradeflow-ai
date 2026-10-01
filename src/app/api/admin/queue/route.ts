import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import {
  deriveQueueGroups,
  type ConversationInput,
  type QuoteInput,
  type FollowUpInput,
  type QueueItem,
  type QueueItemDetail,
} from '@/lib/queue-status';
import { evaluateSendGate, type LineItemInput, type ApprovalSnapshotInput } from '@/lib/quote-gate';
import { deriveBigDeals, type OpportunityInput } from '@/lib/big-deals';

const MAX_ROWS = 200;
const INBOUND_ROLES = ['user', 'customer'];

type ContactRow = { id: string; full_name: string | null; email: string | null; title: string | null };
/** Contacts fetched by email for conversations also carry the customer pointer. */
type ConvContactRow = ContactRow & { customer_id: string | null };
type CustomerRow = {
  id: string;
  trading_name: string | null;
  legal_name: string | null;
  industry: string | null;
  country: string | null;
  /** Company-level address; the send route falls back to it. */
  email?: string | null;
};
type OppContextRow = {
  id: string;
  title: string | null;
  stage: string | null;
  priority: string | null;
  currency: string | null;
  estimated_order_value: number | null;
  next_action: string | null;
  next_action_due: string | null;
};
/** Opportunity plus the identity pointers every queue row type resolves through. */
type OppWide = OppContextRow & { contact_id: string | null; customer_id: string | null };
type QuoteDetailRow = {
  id: string;
  status: string | null;
  currency: string | null;
  total_amount: number | null;
  margin_pct: number | null;
  contact_id: string | null;
  customer_id: string | null;
  opportunity_id: string | null;
  valid_until: string | null;
};

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
        .select('id, contact_name, contact_email, subject, status, folder, read_at, updated_at, created_at, opportunity_id, estimated_value, currency, product_summary, missing_info, next_action, next_action_due, detected_language')
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
        .select('id, subject, scheduled_for, sequence_id')
        .eq('company_id', companyId)
        .eq('status', 'scheduled')
        .lte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(MAX_ROWS),
      supabaseAdmin
        .from('opportunities')
        .select(
          'id, title, stage, priority, currency, estimated_order_value, next_action, next_action_due, contact_id, customer_id, last_activity_at, updated_at'
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
    const oppContextById = new Map<string, OppWide>(
      (opportunitiesAll as OppWide[]).map((o) => [o.id, o]),
    );
    const quoteOppIds = [
      ...new Set(quotes.map((q: { opportunity_id: string | null }) => q.opportunity_id).filter(Boolean)),
    ] as string[];
    const contactIds = [
      ...new Set([
        ...quotes.map((q: { contact_id: string | null }) => q.contact_id),
        ...quoteOppIds.map((id) => oppContextById.get(id)?.contact_id ?? null),
        ...(opportunitiesAll as Array<{ contact_id: string | null }>).map((o) => o.contact_id),
      ].filter(Boolean)),
    ] as string[];
    const custIds = [
      ...new Set([
        ...quotes.map((q: { customer_id: string | null }) => q.customer_id),
        ...quoteOppIds.map((id) => oppContextById.get(id)?.customer_id ?? null),
        ...(opportunitiesAll as Array<{ customer_id: string | null }>).map((o) => o.customer_id),
      ].filter(Boolean)),
    ] as string[];
    const oppIds = [...new Set(quotes.map((q: { opportunity_id: string | null }) => q.opportunity_id).filter(Boolean))];
    const approvedIds = quotes
      .filter((q: { status: string }) => q.status === 'APPROVED')
      .map((q: { id: string }) => q.id);
    // Approval context is needed for every quote in the queue, not just the
    // already-approved ones — a draft is precisely what a human is judging.
    const quoteIdsForLines = [...new Set(quotes.map((q: { id: string }) => q.id))];

    const convEmails = [
      ...new Set(
        conversations
          .map((c: { contact_email: string | null }) => (c.contact_email || '').trim().toLowerCase())
          .filter(Boolean),
      ),
    ];

    const [contactsRes, customersRes, oppsRes, lastMsgsRes, approvalsRes, lineItemsRes, convContactsRes] =
      await Promise.all([
        contactIds.length
          ? supabaseAdmin.from('contacts').select('id, full_name, email, title').in('id', contactIds)
          : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; email: string | null; title: string | null }>, error: null }),
        custIds.length
          ? supabaseAdmin.from('customers').select('id, trading_name, legal_name, industry, country, email').in('id', custIds)
          : Promise.resolve({ data: [] as Array<{ id: string; trading_name: string | null; legal_name: string | null; industry: string | null; country: string | null }>, error: null }),
        oppIds.length
          ? supabaseAdmin
              .from('opportunities')
              .select('id, title, stage, priority, currency, estimated_order_value, next_action, next_action_due, contact_id, customer_id')
              .in('id', oppIds)
          : Promise.resolve({ data: [] as OppWide[], error: null }),
        convIds.length
          ? supabaseAdmin
              .from('messages')
              .select('id, conversation_id, role, created_at, content, subject')
              .in('conversation_id', convIds)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] as Array<{ conversation_id: string; role: string; created_at: string; content: string | null; subject: string | null }>, error: null }),
        approvedIds.length
          ? supabaseAdmin
              .from('quote_approvals')
              .select('quote_id, status, invalidated, quote_version')
              .in('quote_id', approvedIds)
          : Promise.resolve({ data: [] as Array<{ quote_id: string; status: string; invalidated: boolean | null; quote_version: number | null }>, error: null }),
        quoteIdsForLines.length
          ? supabaseAdmin
              .from('quote_line_items')
              .select('quote_id, product_name, description, quantity, unit, unit_price, total_price, specs, notes, sort_order, cost_price, margin_pct, match_status, evidence_type')
              .in('quote_id', quoteIdsForLines)
              .order('sort_order', { ascending: true })
          : Promise.resolve({ data: [] as Array<LineItemInput & { quote_id: string }>, error: null }),
        convEmails.length
          ? supabaseAdmin
              .from('contacts')
              .select('id, full_name, email, title, customer_id')
              .eq('company_id', companyId)
              .in('email', convEmails)
          : Promise.resolve({ data: [] as ConvContactRow[], error: null }),
      ]);

    const contactById = new Map(
      ((contactsRes.data || []) as ContactRow[]).map((c) => [c.id, c]),
    );
    const contactByEmail = new Map(
      ((convContactsRes.data || []) as ConvContactRow[]).map((c) => [
        (c.email || '').trim().toLowerCase(),
        c,
      ]),
    );
    const custById = new Map(
      ((customersRes.data || []) as CustomerRow[]).map((c) => [c.id, c]),
    );
    const oppById = new Map(
      ((oppsRes.data || []) as OppWide[]).map((o) => [o.id, o]),
    );
    const linesByQuote = new Map<string, LineItemInput[]>();
    const lineDetailByQuote = new Map<
      string,
      Array<{
        product_name: string | null;
        description: string | null;
        quantity: number | null;
        unit: string | null;
        unit_price: number | null;
        total_price: number | null;
        margin_pct: number | null;
        match_status: string | null;
      }>
    >();
    for (const li of lineItemsRes.data || []) {
      const list = linesByQuote.get(li.quote_id) ?? [];
      list.push(li);
      linesByQuote.set(li.quote_id, list);
      const detail = lineDetailByQuote.get(li.quote_id) ?? [];
      detail.push({
        product_name: li.product_name ?? null,
        description: li.description ?? null,
        quantity: li.quantity ?? null,
        unit: li.unit ?? null,
        unit_price: li.unit_price ?? null,
        total_price: li.total_price ?? null,
        margin_pct: li.margin_pct ?? null,
        match_status: li.match_status ?? null,
      });
      lineDetailByQuote.set(li.quote_id, detail);
    }
    const approvalByQuote = new Map<string, Array<{ status: string; invalidated: boolean | null; quote_version: number | null }>>();
    for (const a of approvalsRes.data || []) {
      const list = approvalByQuote.get(a.quote_id) ?? [];
      list.push(a);
      approvalByQuote.set(a.quote_id, list);
    }
    // Latest message per conversation (single batched query instead of N+1).
    const lastByConv = new Map<
      string,
      { role: string; created_at: string; content: string | null; subject: string | null }
    >();
    for (const m of lastMsgsRes.data || []) {
      const existing = lastByConv.get(m.conversation_id);
      if (!existing || new Date(m.created_at) > new Date(existing.created_at)) {
        lastByConv.set(m.conversation_id, {
          role: m.role,
          created_at: m.created_at,
          content: m.content ?? null,
          subject: m.subject ?? null,
        });
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

    // ── Phase C: follow-up identity ──────────────────────────────────────
    // follow_up_items carry no customer reference at all — only a sequence.
    // Walk sequence → opportunity → contact/customer so these rows stop
    // rendering as a blank dash.
    const seqIds = [
      ...new Set(
        followUps.map((f: { sequence_id: string | null }) => f.sequence_id).filter(Boolean),
      ),
    ] as string[];

    const seqById = new Map<string, string>();
    if (seqIds.length > 0) {
      const { data: seqs } = await supabaseAdmin
        .from('follow_up_sequences')
        .select('id, opportunity_id')
        .eq('company_id', companyId)
        .in('id', seqIds);
      for (const s of (seqs || []) as Array<{ id: string; opportunity_id: string | null }>) {
        if (s.opportunity_id) seqById.set(s.id, s.opportunity_id);
      }
    }

    const fuOppIds = [...new Set([...seqById.values()])];
    const fuOppById = new Map<
      string,
      { id: string; title: string | null; contact_id: string | null; customer_id: string | null }
    >();
    if (fuOppIds.length > 0) {
      const { data: fuOpps } = await supabaseAdmin
        .from('opportunities')
        .select('id, title, contact_id, customer_id')
        .eq('company_id', companyId)
        .in('id', fuOppIds)
        .is('deleted_at', null);
      for (const o of (fuOpps || []) as Array<{
        id: string;
        title: string | null;
        contact_id: string | null;
        customer_id: string | null;
      }>) {
        fuOppById.set(o.id, o);
      }
    }

    const fuContactById = new Map<string, { id: string; full_name: string | null; email: string | null }>();
    const fuCustomerById = new Map<
      string,
      { id: string; trading_name: string | null; legal_name: string | null }
    >();
    const fuContactIds = [
      ...new Set([...fuOppById.values()].map((o) => o.contact_id).filter(Boolean)),
    ] as string[];
    const fuCustomerIds = [
      ...new Set([...fuOppById.values()].map((o) => o.customer_id).filter(Boolean)),
    ] as string[];
    const [fuContactsRes, fuCustomersRes] = await Promise.all([
      fuContactIds.length > 0
        ? supabaseAdmin.from('contacts').select('id, full_name, email').in('id', fuContactIds)
        : Promise.resolve({ data: [], error: null }),
      fuCustomerIds.length > 0
        ? supabaseAdmin
            .from('customers')
            .select('id, trading_name, legal_name')
            .in('id', fuCustomerIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    for (const c of (fuContactsRes.data || []) as Array<{
      id: string;
      full_name: string | null;
      email: string | null;
    }>) {
      fuContactById.set(c.id, c);
    }
    for (const c of (fuCustomersRes.data || []) as Array<{
      id: string;
      trading_name: string | null;
      legal_name: string | null;
    }>) {
      fuCustomerById.set(c.id, c);
    }

    // ── Due follow-up inputs ─────────────────────────────────────────────
    const followInputs: FollowUpInput[] = followUps.map(
      (f: { id: string; subject: string | null; scheduled_for: string | null; sequence_id: string | null }) => {
        const oppId = f.sequence_id ? seqById.get(f.sequence_id) : undefined;
        const opp = oppId ? fuOppById.get(oppId) : null;
        const contact = opp?.contact_id ? fuContactById.get(opp.contact_id) : null;
        const customer = opp?.customer_id ? fuCustomerById.get(opp.customer_id) : null;
        const customerName =
          contact?.full_name ||
          contact?.email ||
          customer?.trading_name ||
          customer?.legal_name ||
          null;
        return {
          id: f.id,
          sequenceId: f.sequence_id,
          subject: f.subject || null,
          opportunity: titleLead(opp?.title),
          customer: customerName,
          scheduledFor: f.scheduled_for || null,
        };
      },
    );

    const groups = deriveQueueGroups({
      conversations: convInputs,
      quotes: quoteInputs,
      followUps: followInputs,
    });

    // ── Approval context ─────────────────────────────────────────────────
    // Everything a human needs to judge a row without leaving the queue or
    // opening Excel: the quoted lines and their totals, who the client is,
    // where the deal sits, and what the customer actually asked for. All
    // deterministic reads — no model is called to render this panel.
    const quoteById = new Map((quotes as QuoteDetailRow[]).map((q) => [q.id, q]));
    const convById = new Map(
      (
        conversations as Array<{
          id: string;
          contact_email: string | null;
          opportunity_id: string | null;
          estimated_value: number | null;
          currency: string | null;
          product_summary: string | null;
          missing_info: string[] | null;
          next_action: string | null;
          next_action_due: string | null;
        }>
      ).map((c) => [c.id, c]),
    );
    const fuById = new Map(
      (followUps as Array<{ id: string; sequence_id: string | null; subject: string | null }>).map(
        (f) => [f.id, f],
      ),
    );

    const clip = (raw: string | null | undefined, max: number): string | null => {
      if (!raw) return null;
      const flat = raw.replace(/\s+/g, ' ').trim();
      if (!flat) return null;
      return flat.length > max ? `${flat.slice(0, max - 1)}\u2026` : flat;
    };

    const buildDetail = (item: QueueItem): QueueItemDetail | null => {
      const oppOf = (oppId: string | null | undefined) =>
        (oppId ? oppById.get(oppId) ?? null : null) ?? (oppId ? oppContextById.get(oppId) ?? null : null);

      // Reply rows: resolve client facts through conversation → opportunity.
      if (item.id.startsWith('conv-')) {
        const convId = item.id.slice('conv-'.length);
        const conv = convById.get(convId);
        const opp = oppOf(conv?.opportunity_id);
        const last = lastByConv.get(convId);
        // Only the company-wide opportunity index carries the contact/customer
        // pointers, so resolve identity from there.
        const convOpp = conv?.opportunity_id ? oppContextById.get(conv.opportunity_id) : undefined;
        const email = (conv?.contact_email || '').trim().toLowerCase();
        const emailContact = email ? contactByEmail.get(email) : undefined;
        const contact = emailContact ?? (convOpp?.contact_id ? contactById.get(convOpp.contact_id) : undefined);
        const customerId = emailContact?.customer_id ?? convOpp?.customer_id ?? null;
        const customer = customerId ? custById.get(customerId) : undefined;
        return {
          whatTheyWant:
            clip(last?.content, 400) ??
            clip(conv?.product_summary, 300) ??
            clip(last?.subject, 200) ??
            clip(item.subject, 200),
          stage: opp?.stage ?? null,
          priority: opp?.priority ?? null,
          company: customer?.trading_name ?? customer?.legal_name ?? null,
          industry: customer?.industry ?? null,
          country: customer?.country ?? null,
          contactTitle: contact?.title ?? null,
          value: opp?.estimated_order_value ?? conv?.estimated_value ?? null,
          currency: opp?.currency ?? conv?.currency ?? null,
          missingInfo: conv?.missing_info ?? null,
          nextAction: opp?.next_action ?? conv?.next_action ?? null,
          nextActionDue: opp?.next_action_due ?? conv?.next_action_due ?? null,
          lastMessageAt: last?.created_at ?? null,
          lastMessageRole: last?.role ?? null,
        };
      }

      if (item.id.startsWith('quote-')) {
        const q = quoteById.get(item.id.slice('quote-'.length));
        if (!q) return null;
        const opp = oppOf(q.opportunity_id);
        const contact = q.contact_id ? contactById.get(q.contact_id) : null;
        const customer = q.customer_id ? custById.get(q.customer_id) : null;
        return {
          quoteStatus: q.status ?? null,
          stage: opp?.stage ?? null,
          priority: q.margin_pct != null ? null : opp?.priority ?? null,
          company: customer?.trading_name ?? customer?.legal_name ?? null,
          industry: customer?.industry ?? null,
          country: customer?.country ?? null,
          contactTitle: contact?.title ?? null,
          value: q.total_amount ?? opp?.estimated_order_value ?? null,
          currency: q.currency ?? opp?.currency ?? null,
          marginPct: q.margin_pct ?? null,
          missingInfo: null,
          lineItems: (lineDetailByQuote.get(q.id) ?? []).map((li) => ({
            product: li.product_name ?? '—',
            description: li.description ?? null,
            quantity: li.quantity ?? null,
            unit: li.unit ?? null,
            unitPrice: li.unit_price ?? null,
            total: li.total_price ?? null,
            marginPct: li.margin_pct ?? null,
            matchStatus: li.match_status ?? null,
          })),
          nextAction: opp?.next_action ?? null,
          nextActionDue: opp?.next_action_due ?? null,
        };
      }

      if (item.id.startsWith('fu-')) {
        const f = fuById.get(item.id.slice('fu-'.length));
        const oppId = f?.sequence_id ? seqById.get(f.sequence_id) : undefined;
        const opp = oppOf(oppId);
        const fuOpp = oppId ? fuOppById.get(oppId) : undefined;
        const contactId = opp?.contact_id ?? fuOpp?.contact_id ?? null;
        const customerId = opp?.customer_id ?? fuOpp?.customer_id ?? null;
        const contact = contactId ? contactById.get(contactId) ?? null : null;
        const customer = customerId ? custById.get(customerId) ?? null : null;
        return {
          whatTheyWant: clip(f?.subject, 200) ?? clip(item.subject, 200),
          stage: opp?.stage ?? null,
          priority: opp?.priority ?? null,
          company: customer?.trading_name ?? customer?.legal_name ?? null,
          industry: customer?.industry ?? null,
          country: customer?.country ?? null,
          contactTitle: contact?.title ?? null,
          // Same preference order as the send route: the person first, then
          // the company address. If this is empty the send will be refused
          // with an actionable message, so surface it here instead.
          recipientEmail: contact?.email || customer?.email || null,
          value: opp?.estimated_order_value ?? null,
          currency: opp?.currency ?? null,
          nextAction: opp?.next_action ?? null,
          nextActionDue: opp?.next_action_due ?? null,
        };
      }

      return null;
    };

    const groupsWithDetail = groups.map((g) => ({
      ...g,
      items: g.items.map((item) => ({ ...item, detail: buildDetail(item) })),
    }));

    // ── Big deals: the company's biggest open opportunities ─────────────
    const bigDeals = deriveBigDeals((opportunitiesAll as OpportunityInput[]));

    const totals = groupsWithDetail.reduce<Record<string, number>>((acc, g) => {
      acc[g.key] = g.count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      groups: groupsWithDetail,
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