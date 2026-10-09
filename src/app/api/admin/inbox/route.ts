import { NextRequest, NextResponse } from 'next/server';
import { describeAddressErrors, validateAddressFields } from '@/lib/address-validation';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { sendEmail } from '@/lib/email';
import {
  deriveThread,
  matchesFilter,
  type ThreadFilter,
  type ThreadMessage,
} from '@/lib/thread-state';
import { buildInboxSummary, type InboxSummary } from '@/lib/inbox-summary';

const MAX_PAGE_SIZE = 500;

const THREAD_FILTERS: ThreadFilter[] = [
  'needs_specs',
  'waiting_on_buyer',
  'ready_to_quote',
  'follow_ups',
  'needs_you',
  'owed_replies',
  'all',
];

/* `024_inbox_upgrade` adds subject/folder/read_at/flagged to conversations.
   Until that migration has run on a given database, filtering on folder or
   flagged and searching on subject are hard errors from PostgREST, which
   empties the mailbox even when the rows exist. Probe once per process and
   fall back to the subset of filters the schema actually supports. */
let mailboxColumnsChecked = false;
let mailboxColumnsReady = false;

// ---------------------------------------------------------------------------
// Read coalescing for the inbox list.
//
// The admin layout, the inbox page and two polling timers all read this same
// list, so one page load fires it several times with identical parameters --
// and each run is a full conversation read plus every message body.
// Serve a single computation to all of them, briefly.
//
// Per-instance and therefore best-effort on serverless, which is fine: the win
// comes from collapsing a burst that arrives together. Mutations rely on the
// TTL expiring rather than explicit invalidation.
// ---------------------------------------------------------------------------

const INBOX_READ_TTL_MS = 5_000;
const MAX_INBOX_CACHE_ENTRIES = 200;

const inboxReadCache = new Map<string, { at: number; body: string }>();
const inboxReadInFlight = new Map<string, Promise<string>>();

function readInboxCache(key: string): string | null {
  const hit = inboxReadCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at >= INBOX_READ_TTL_MS) {
    inboxReadCache.delete(key);
    return null;
  }
  return hit.body;
}

function writeInboxCache(key: string, body: string): void {
  if (inboxReadCache.size >= MAX_INBOX_CACHE_ENTRIES) inboxReadCache.clear();
  inboxReadCache.set(key, { at: Date.now(), body });
}

function inboxJson(body: string, cacheState: 'hit' | 'coalesced' | 'miss'): NextResponse {
  return new NextResponse(body, {
    headers: { 'content-type': 'application/json', 'x-inbox-read': cacheState },
  });
}

interface InboxRead {
  companyId: string;
  folder: string;
  state: ThreadFilter;
  q: string;
  page: number;
  pageSize: number;
}


async function hasMailboxColumns(): Promise<boolean> {
  if (mailboxColumnsChecked) return mailboxColumnsReady;
  const { error } = await supabaseAdmin
    .from('conversations')
    .select('id, subject, folder, read_at, flagged')
    .limit(1);
  mailboxColumnsChecked = true;
  mailboxColumnsReady = !error;
  if (error) {
    console.warn('[inbox] migration 024 columns unavailable, running without folder/flag/subject filters:', error.message);
  }
  return mailboxColumnsReady;
}

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

    const addressErrors = validateAddressFields({
      to: to.join(', '),
      cc: cc as string,
      bcc: bcc as string,
    });
    if (Object.keys(addressErrors).length) {
      return NextResponse.json(
        { error: `Invalid email address — ${describeAddressErrors(addressErrors)}` },
        { status: 400 }
      );
    }

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
        cc: ccList,
        bcc: bccList,
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

// GET /api/admin/inbox — the inbox is home. Every thread carries its live
// state (needs_specs / waiting_on_buyer / ready_to_quote / cold) plus the
// "needs you" and "owed reply" flags. Filters are lenses on this one list.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    const companyId = auth.companyId;
    const url = new URL(req.url);
    const folder = url.searchParams.get('folder') || 'inbox';
    const requested = url.searchParams.get('filter') || 'all';
    const state: ThreadFilter = (THREAD_FILTERS as string[]).includes(requested)
      ? (requested as ThreadFilter)
      : 'all';
    const q = (url.searchParams.get('q') || '').trim().toLowerCase();
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(url.searchParams.get('pageSize') || '100', 10) || 100)
    );

    const cacheKey = [companyId, folder, state, q, page, pageSize].join('|');

    const cached = readInboxCache(cacheKey);
    if (cached !== null) return inboxJson(cached, 'hit');

    // Someone is already computing this exact read -- wait on them.
    const inflight = inboxReadInFlight.get(cacheKey);
    if (inflight) {
      try {
        return inboxJson(await inflight, 'coalesced');
      } catch {
        // The primary read failed; fall through and recompute it ourselves.
      }
    }

    const task = (async () => {
      const payload = await computeInboxPayload({ companyId, folder, state, q, page, pageSize });
      const serialized = JSON.stringify(payload);
      writeInboxCache(cacheKey, serialized);
      return serialized;
    })();

    inboxReadInFlight.set(cacheKey, task);
    void task
      .catch(() => undefined)
      .finally(() => {
        if (inboxReadInFlight.get(cacheKey) === task) inboxReadInFlight.delete(cacheKey);
      });

    return inboxJson(await task, 'miss');
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[inbox:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

async function computeInboxPayload({
  companyId,
  folder,
  state,
  q,
  page,
  pageSize,
}: InboxRead) {
  const hasColumns = await hasMailboxColumns();

  const select = hasColumns
    ? 'id, company_id, channel, contact_name, contact_email, contact_phone, subject, folder, read_at, flagged, status, detected_language, handoff_summary, external_search_enabled, updated_at, created_at, product_summary, missing_info, opportunity_id, estimated_value, currency, next_action, next_action_due, last_message_at'
    : 'id, company_id, channel, contact_name, contact_email, contact_phone, status, detected_language, handoff_summary, external_search_enabled, updated_at, created_at, product_summary, missing_info, opportunity_id, estimated_value, currency, next_action, next_action_due, last_message_at';

  const { data: conversations, error } = await supabaseAdmin
    .from('conversations')
    .select(select)
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false })
    .limit(MAX_PAGE_SIZE);

  if (error) {
    console.error('[inbox:GET] Supabase error:', error.message);
    throw new Error(error.message);
  }

  const convs = (conversations || []) as Array<Record<string, unknown>>;
  const ids = convs.map((c) => c.id as string);

  // One query for every message in the page — avoids the per-conversation
  // N+1 the old handler did.
  const messagesByConv = new Map<string, ThreadMessage[]>();
  if (ids.length > 0) {
    const { data: msgs } = await supabaseAdmin
      .from('messages')
      .select('id, conversation_id, role, kind, content, created_at, subject, status, cc, bcc')
      .in('conversation_id', ids)
      .order('created_at', { ascending: true });
    for (const m of msgs || []) {
      const arr = messagesByConv.get(m.conversation_id) || [];
      arr.push(m as ThreadMessage);
      messagesByConv.set(m.conversation_id, arr);
    }
  }

  const draftsByConv = new Map<string, Record<string, unknown>>();
  if (ids.length > 0) {
    const { data: drafts } = await supabaseAdmin
      .from('outbound_messages')
      .select('id, conversation_id, draft_status, subject, body, to_address, created_at')
      .eq('company_id', companyId)
      .in('conversation_id', ids)
      .in('draft_status', ['draft', 'pending_approval'])
      .order('created_at', { ascending: false });
    for (const d of drafts || []) {
      if (!draftsByConv.has(d.conversation_id)) draftsByConv.set(d.conversation_id, d);
    }
  }

  const oppIds = [...new Set(convs.map((c) => c.opportunity_id as string).filter(Boolean))];
  const oppStage = new Map<string, string | null>();
  if (oppIds.length > 0) {
    const { data: opps } = await supabaseAdmin
      .from('opportunities')
      .select('id, stage')
      .in('id', oppIds);
    for (const o of opps || []) oppStage.set(o.id, o.stage);
  }

  const inFolder = (rowFolder: string): boolean => {
    if (!hasColumns) return folder !== 'archive' && folder !== 'trash';
    if (folder === 'all') return true;
    if (folder === 'archive') return rowFolder === 'archive';
    if (folder === 'trash') return rowFolder === 'trash';
    return rowFolder === 'inbox';
  };

  const allItems = convs
    .map((c) => {
      const msgs = messagesByConv.get(c.id as string) || [];
      const draft = draftsByConv.get(c.id as string) || null;
      const d = deriveThread({
        conversation: {
          status: c.status as string | null,
          missing_info: c.missing_info,
          opportunity_id: c.opportunity_id as string | null,
          next_action_due: c.next_action_due as string | null,
          last_message_at: c.last_message_at as string | null,
          created_at: c.created_at as string | null,
        },
        messages: msgs,
        hasPendingDraft: !!draft,
        opportunity: c.opportunity_id
          ? { stage: oppStage.get(c.opportunity_id as string) ?? null }
          : null,
      });

      const lastMessage = msgs.length > 0 ? msgs[msgs.length - 1] : null;
      const readAt = c.read_at ? new Date(c.read_at as string).getTime() : 0;
      const lastAt = lastMessage?.created_at ? new Date(lastMessage.created_at).getTime() : 0;
      const unread = lastMessage != null && (readAt === 0 || lastAt > readAt);

      const subject =
        (c.subject as string) ||
        ((lastMessage?.subject as string) || (lastMessage?.content as string) || '').slice(0, 120) ||
        null;

      const haystack = [
        c.contact_name,
        c.contact_email,
        c.subject,
        c.product_summary,
        lastMessage?.content,
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());
      const matchesQuery = !q || haystack.some((h) => h.includes(q));

      const row = {
        id: c.id,
        contact_name: c.contact_name || null,
        contact_email: c.contact_email || null,
        contact_phone: c.contact_phone || null,
        subject,
        folder: c.folder || 'inbox',
        read_at: c.read_at || null,
        flagged: c.flagged || false,
        channel: c.channel || 'email',
        status: c.status || 'active',
        detected_language: c.detected_language || null,
        handoff_summary: c.handoff_summary || null,
        external_search_enabled: c.external_search_enabled || false,
        updated_at: c.updated_at,
        created_at: c.created_at,
        product_summary: c.product_summary || null,
        estimated_value: c.estimated_value ?? null,
        currency: c.currency || null,
        missing_info: d.missing,
        opportunity_id: c.opportunity_id || null,
        next_action: c.next_action || null,
        next_action_due: c.next_action_due || null,
        last_message: lastMessage,
        message_count: msgs.length,
        needs_reply: d.owedReply,
        waiting_on_customer: d.waitingOnBuyer,
        unread,
        thread: {
          state: d.state,
          label: d.label,
          missingCount: d.missingCount,
          owedReply: d.owedReply,
          needsYou: d.needsYou,
          waitingOnBuyer: d.waitingOnBuyer,
          needsSpecs: d.needsSpecs,
          readyToQuote: d.readyToQuote,
          followUpDue: d.followUpDue,
          cold: d.cold,
          paused: d.paused,
          chaseCount: d.chaseCount,
          silentDays: d.silentDays,
        },
        pending_draft: draft,
      };
      return { row, d, matchesQuery };
    });

  // The summary strip describes the work queue, not the folder the list
  // happens to be showing, so it is built from every inbox-folder thread
  // before the folder and search lenses are applied.
  const summary: InboxSummary = buildInboxSummary(
    allItems.map((i) => ({
      folder: (i.row.folder as string) || 'inbox',
      created_at: (i.row.created_at as string) || null,
      estimated_value: typeof i.row.estimated_value === 'number' ? i.row.estimated_value : null,
      currency: typeof i.row.currency === 'string' ? i.row.currency : null,
      next_action_due: typeof i.row.next_action_due === 'string' ? i.row.next_action_due : null,
      hasPendingDraft: !!i.row.pending_draft,
      missing: i.row.missing_info,
      thread: i.d,
    }))
  );

  const items = allItems.filter(
    (i) => inFolder((i.row.folder as string) || 'inbox') && i.matchesQuery
  );

  // The inbox is work-in-progress only. Threads that finished collecting
  // specs (Opportunities) and threads the buyer has gone quiet on
  // (Follow-ups) leave the inbox for their own surfaces. `filter=follow_ups`
  // and `filter=ready_to_quote` ask for those other buckets directly.
  const inboxItems = items.filter((i) => !i.d.followUpDue && !i.d.readyToQuote);
  const readyItems = items.filter((i) => i.d.readyToQuote && !i.d.followUpDue);
  const followUpItems = items.filter((i) => i.d.followUpDue);

  const counts = {
    all: inboxItems.length,
    // Scoped to inboxItems so the badge matches the `needs_specs` lens
    // (in-progress threads), which excludes follow-ups and ready-to-quote.
    needs_specs: inboxItems.filter((i) => i.d.needsSpecs).length,
    waiting_on_buyer: items.filter((i) => i.d.waitingOnBuyer && !i.d.followUpDue).length,
    ready_to_quote: readyItems.length,
    follow_ups: followUpItems.length,
    needs_you: inboxItems.filter((i) => i.d.needsYou).length,
    owed_replies: inboxItems.filter((i) => i.d.owedReply).length,
    unread: items.filter((i) => i.row.unread).length,
    needs_reply: inboxItems.filter((i) => i.d.owedReply).length,
    waiting: items.filter((i) => i.d.waitingOnBuyer).length,
    total: items.length,
  };

  const filtered = (
    state === 'follow_ups'
      ? followUpItems
      : state === 'ready_to_quote'
        ? readyItems
        : inboxItems.filter((i) => matchesFilter(i.d, state))
  ).sort(
    (a, b) =>
      new Date(b.row.updated_at as string).getTime() - new Date(a.row.updated_at as string).getTime()
  );

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize).map((i) => i.row);

  return {
    conversations: paged,
    counts,
    summary,
    filter: state,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}
