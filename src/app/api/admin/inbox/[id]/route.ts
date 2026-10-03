import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { sendEmail } from '@/lib/email';
import { deriveThread, type ThreadMessage } from '@/lib/thread-state';

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
      .select('id, role, content, tokens_used, created_at, kind, status, subject, sender_email, recipient_email, attachments')
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

    // ── Customer identity ───────────────────────────────────────────────
    // Resolve the same way the quote detail does: the linked opportunity's
    // contact → customer → opportunity title. A thread used to fall back to a
    // generic "Customer"/"?" even when the quote and stage knew the name.
    const oppRows = opportunities as Array<{
      id: string;
      contact_id: string | null;
      customer_id: string | null;
      title: string | null;
    }>;
    const oppContactIds = [...new Set(oppRows.map((o) => o.contact_id).filter(Boolean))] as string[];
    const oppCustomerIds = [...new Set(oppRows.map((o) => o.customer_id).filter(Boolean))] as string[];
    const fallbackContactId =
      quotes.length > 0 ? ((quotes[0] as { contact_id?: string | null }).contact_id ?? null) : null;
    const fallbackCustomerId =
      quotes.length > 0 ? ((quotes[0] as { customer_id?: string | null }).customer_id ?? null) : null;
    const contactIds = [...new Set([...oppContactIds, ...(fallbackContactId ? [fallbackContactId] : [])])];
    const customerIds = [...new Set([...oppCustomerIds, ...(fallbackCustomerId ? [fallbackCustomerId] : [])])];

    const [identityContacts, identityCustomers] = await Promise.all([
      contactIds.length
        ? supabaseAdmin.from('contacts').select('id, full_name, email').in('id', contactIds)
        : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; email: string | null }>, error: null }),
      customerIds.length
        ? supabaseAdmin.from('customers').select('id, trading_name, legal_name, country, industry').in('id', customerIds)
        : Promise.resolve({
            data: [] as Array<{
              id: string;
              trading_name: string | null;
              legal_name: string | null;
              country: string | null;
              industry: string | null;
            }>,
            error: null,
          }),
    ]);

    const contactById = new Map(
      ((identityContacts.data || []) as Array<{ id: string; full_name: string | null; email: string | null }>).map((c) => [
        c.id,
        c,
      ]),
    );
    const customerById = new Map(
      (
        (identityCustomers.data || []) as Array<{
          id: string;
          trading_name: string | null;
          legal_name: string | null;
          country: string | null;
          industry: string | null;
        }>
      ).map((c) => [c.id, c] as const),
    );

    const titleLead = (title: string | null | undefined): string | null => {
      if (!title || !title.trim()) return null;
      const cut = title.split(/\s*[-–—]\s*|—/)[0]?.trim();
      return cut || title.trim();
    };

    const primaryOpp = oppRows[0] || null;
    const identityContact =
      (primaryOpp?.contact_id ? contactById.get(primaryOpp.contact_id) : null) ||
      (fallbackContactId ? contactById.get(fallbackContactId) : null) ||
      null;
    const identityCustomer =
      (primaryOpp?.customer_id ? customerById.get(primaryOpp.customer_id) : null) ||
      (fallbackCustomerId ? customerById.get(fallbackCustomerId) : null) ||
      null;

    const contactName =
      identityContact?.full_name ||
      identityCustomer?.trading_name ||
      identityCustomer?.legal_name ||
      (conversation.contact_name as string | null) ||
      titleLead(primaryOpp?.title) ||
      null;
    const contactEmail =
      identityContact?.email || (conversation.contact_email as string | null) || null;
    const customerName = identityCustomer?.trading_name || identityCustomer?.legal_name || null;
    const customerCountry = identityCustomer?.country || null;
    const customerIndustry = identityCustomer?.industry || null;

    // ── Buyer history ───────────────────────────────────────────────────
    // Is this a returning buyer? How much have they ordered? How do they pay?
    // Everything is best-effort: a missing table/column just yields nulls and
    // the card degrades to "new buyer".
    let pastThreads = 0;
    if (contactEmail) {
      const { count } = await supabaseAdmin
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', auth.companyId)
        .eq('contact_email', contactEmail)
        .neq('id', id);
      pastThreads = count ?? 0;
    }

    // The thread may not surface any opportunity/quote yet, so widen the buyer
    // scope by matching the sender email against the contacts table. This is
    // what makes history show for a returning buyer on a brand-new thread.
    const allContactIds = [...contactIds];
    const allCustomerIds = [...customerIds];
    if (contactEmail) {
      const { data: byEmail } = await supabaseAdmin
        .from('contacts')
        .select('id, customer_id')
        .eq('company_id', auth.companyId)
        .ilike('email', contactEmail)
        .limit(5);
      for (const c of (byEmail || []) as Array<{ id: string; customer_id: string | null }>) {
        if (c.id && !allContactIds.includes(c.id)) allContactIds.push(c.id);
        if (c.customer_id && !allCustomerIds.includes(c.customer_id)) allCustomerIds.push(c.customer_id);
      }
    }

    const scope = allCustomerIds.length
      ? { column: 'customer_id', ids: allCustomerIds }
      : allContactIds.length
        ? { column: 'contact_id', ids: allContactIds }
        : null;

    let pastOrderTotal: number | null = null;
    let pastOrderCurrency: string | null = null;
    let paymentTerms: string | null = null;
    if (scope) {
      const [wonRes, quoteRes] = await Promise.all([
        supabaseAdmin
          .from('opportunities')
          .select('estimated_order_value, currency')
          .eq('company_id', auth.companyId)
          .eq('stage', 'WON')
          .is('deleted_at', null)
          .in(scope.column, scope.ids),
        supabaseAdmin
          .from('quotes')
          .select('payment_terms, currency, created_at')
          .eq('company_id', auth.companyId)
          .in(scope.column, scope.ids)
          .order('created_at', { ascending: false })
          .limit(25),
      ]);
      const won = (wonRes.data || []) as Array<{
        estimated_order_value: number | null;
        currency: string | null;
      }>;
      if (won.length) {
        pastOrderTotal = won.reduce((sum, o) => sum + (Number(o.estimated_order_value) || 0), 0);
        pastOrderCurrency = won.find((o) => o.currency)?.currency ?? null;
      }
      const quoteRows = (quoteRes.data || []) as Array<{
        payment_terms: string | null;
        currency: string | null;
      }>;
      paymentTerms =
        quoteRows
          .map((q) => q.payment_terms)
          .find((v): v is string => !!v && v.trim().length > 0) ?? null;
      if (!pastOrderCurrency) {
        pastOrderCurrency = quoteRows.find((q) => q.currency)?.currency ?? null;
      }
    }

    // ── Reply-debt state + the open chase draft (if any) ────────────────
    const { data: openDrafts } = await supabaseAdmin
      .from('outbound_messages')
      .select('id, conversation_id, draft_status, subject, body, to_address, created_at')
      .eq('company_id', auth.companyId)
      .eq('conversation_id', id)
      .in('draft_status', ['draft', 'pending_approval'])
      .order('created_at', { ascending: false })
      .limit(1);
    const pendingDraft = (openDrafts?.[0] as Record<string, unknown> | undefined) ?? null;

    const derivation = deriveThread({
      conversation: {
        status: conversation.status as string | null,
        missing_info: conversation.missing_info,
        opportunity_id: conversation.opportunity_id as string | null,
        next_action_due: conversation.next_action_due as string | null,
        last_message_at: conversation.last_message_at as string | null,
        created_at: conversation.created_at as string | null,
      },
      messages: (messages || []) as ThreadMessage[],
      hasPendingDraft: !!pendingDraft,
      opportunity: (opportunities as Array<{ stage?: string | null }>)[0] ?? null,
    });

    return NextResponse.json({
      conversation,
      messages: messages || [],
      inquiries: inquiries || [],
      opportunities,
      quotes,
      approvals,
      contact: {
        name: contactName,
        email: contactEmail,
        customer_name: customerName,
      },
      buyer: {
        company: customerName,
        country: customerCountry,
        industry: customerIndustry,
        past_threads: pastThreads,
        past_order_total: pastOrderTotal,
        past_order_currency: pastOrderCurrency,
        payment_terms: paymentTerms,
      },
      thread: {
        ...derivation,
        nextActionDue: (conversation.next_action_due as string | null) ?? null,
      },
      pending_draft: pendingDraft,
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
    if (body.subject !== undefined) updates.subject = body.subject || null;
    if (typeof body.flagged === 'boolean') updates.flagged = body.flagged;
    if (body.folder !== undefined) {
      const folders = ['inbox', 'archive', 'trash'];
      if (!folders.includes(body.folder)) {
        return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
      }
      updates.folder = body.folder;
    }
    if (body.read === true) {
      updates.read_at = new Date().toISOString();
    } else if (body.read === false) {
      updates.read_at = null;
    }

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

// POST /api/admin/inbox/[id] — send an outbound message on a thread (reply/forward).
// Attempts delivery via email; on failure stores the outgoing message with
// status 'failed' and returns a structured email result so the UI can warn.
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    const { id } = await params;

    const { data: conversation } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .single();

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const body = await req.json();
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const recipientEmail = conversation.contact_email || body.recipient_email || null;
    const kind = body.kind === 'forward' ? 'forward' : 'reply';

    const cleanList = (v: unknown): string[] => {
      const raw = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[,;]/) : [];
      return raw.map((s) => String(s).trim()).filter(Boolean);
    };
    const ccList = cleanList(body.cc);
    const bccList = cleanList(body.bcc);

    // Replies carry a proper "Re:" subject line so the thread reads correctly
    // in the buyer's mail client. Forwards keep whatever the operator typed.
    const rawSubject =
      (typeof body.subject === 'string' && body.subject.trim()) ||
      conversation.subject ||
      '';
    let subject: string | null = rawSubject || null;
    if (kind === 'reply' && subject && !/^re:\s/i.test(subject)) {
      subject = `Re: ${subject}`;
    }
    if (kind === 'reply' && !subject) {
      subject = 'Re: your inquiry';
    }

    if (!content) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }
    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'No contact email on this conversation; add one to send outbound' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    let emailResult: { success: boolean; [key: string]: unknown } = { success: false, code: 'SKIPPED' };
    if (kind === 'reply') {
      const attempt = await sendEmail({
        to: recipientEmail,
        cc: ccList.length ? ccList : undefined,
        bcc: bccList.length ? bccList : undefined,
        subject: subject || 'Re: your inquiry',
        html: content.replace(/\n/g, '<br/>'),
        companyId: auth.companyId,
      }).catch((err) => ({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }));
      emailResult = attempt as { success: boolean; [key: string]: unknown };
    }

    const emailSent = emailResult.success === true;
    const { data: message, error: msgError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: id,
        role: 'human',
        kind,
        status: emailSent ? 'sent' : 'failed',
        subject: subject || null,
        content,
        sender_email: null,
        recipient_email: recipientEmail,
        created_at: now,
      })
      .select('*')
      .single();

    if (msgError) {
      console.error('[inbox:POST.id] message insert error:', msgError.message);
    }

    await supabaseAdmin
      .from('conversations')
      .update({
        updated_at: now,
        folder: 'inbox',
        ...(body.status ? { status: body.status } : {}),
      })
      .eq('id', id);

    return NextResponse.json({
      message: message || null,
      email: emailResult,
      email_delivered: emailSent,
      warning: !emailSent ? 'Message stored but could not be delivered by email.' : null,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[inbox:POST.id] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}