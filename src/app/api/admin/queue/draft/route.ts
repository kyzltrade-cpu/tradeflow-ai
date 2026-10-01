import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { buildTemplateDraft, type DraftContext } from '@/lib/queue-draft-template';

const NIM_BASE_URL = process.env.NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NIM_API_KEY = process.env.NIM_API_KEY!;
const NIM_MODEL = process.env.NIM_MODEL || 'meta/llama-3.1-8b-instruct';

/**
 * MOCK_AI=true forces the deterministic template and never calls the model.
 * Off by default; regardless of the flag, a model failure or timeout still
 * falls back to the template so the panel is never empty.
 */
const MOCK_AI = process.env.MOCK_AI === 'true';

const DRAFT_TABLE = 'queue_drafts';
const MAX_BODY = 8000;

/**
 * The `queue_drafts` table ships in migration 026, which may not be applied
 * yet (the exec_sql RPC this project used to apply migrations is gone). Treat a
 * missing table as "no server-side draft store" and let the client fall back
 * to browser-local persistence, rather than 500ing the whole panel.
 */
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /does not exist|schema cache/i.test(error.message || '')
  );
}

function clip(value: string | null | undefined, max: number): string | null {
  if (!value) return null;
  const s = value.trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

type Context = DraftContext;

/** Mirrors the six facts the panel shows, so the prompt and the UI agree. */
async function loadContext(companyId: string, itemKey: string): Promise<Context | null> {
  const [kind, rawId] = splitItemKey(itemKey);
  if (!kind || !rawId) return null;

  const oppIds = new Set<string>();
  let base: Record<string, unknown> = {};
  let conversationId: string | null = null;
  let contactId: string | null = null;
  let customerId: string | null = null;
  let contactEmail: string | null = null;

  if (kind === 'reply') {
    const { data } = await supabaseAdmin
      .from('conversations')
      .select(
        'id, subject, contact_email, opportunity_id, product_summary, missing_info, next_action, estimated_value, currency'
      )
      .eq('id', rawId)
      .eq('company_id', companyId)
      .maybeSingle();
    if (!data) return null;
    base = data as Record<string, unknown>;
    conversationId = (data.id as string) ?? null;
    contactEmail = (data.contact_email as string) ?? null;
    if (data.opportunity_id) oppIds.add(data.opportunity_id as string);
  } else if (kind === 'quote') {
    const { data } = await supabaseAdmin
      .from('quotes')
      .select('id, status, opportunity_id, contact_id, customer_id, total_amount, currency')
      .eq('id', rawId)
      .eq('company_id', companyId)
      .maybeSingle();
    if (!data) return null;
    base = data as Record<string, unknown>;
    contactId = (data.contact_id as string) ?? null;
    customerId = (data.customer_id as string) ?? null;
    if (data.opportunity_id) oppIds.add(data.opportunity_id as string);
  } else {
    const { data } = await supabaseAdmin
      .from('follow_up_items')
      .select('id, subject, sequence_id, status, message_body, message_type, scheduled_for')
      .eq('id', rawId)
      .eq('company_id', companyId)
      .maybeSingle();
    if (!data) return null;
    base = data as Record<string, unknown>;
  }

  let opp: Record<string, unknown> | null = null;
  if (kind === 'followup' && base.sequence_id) {
    const { data: seq } = await supabaseAdmin
      .from('follow_up_sequences')
      .select('id, opportunity_id, quote_id')
      .eq('id', base.sequence_id as string)
      .eq('company_id', companyId)
      .maybeSingle();
    if (seq?.opportunity_id) oppIds.add(seq.opportunity_id as string);
  }

  if (oppIds.size > 0) {
    const { data: o } = await supabaseAdmin
      .from('opportunities')
      .select('id, stage, next_action, estimated_order_value, currency, contact_id, customer_id')
      .in('id', Array.from(oppIds))
      .eq('company_id', companyId)
      .limit(1)
      .maybeSingle();
    opp = (o as Record<string, unknown>) ?? null;
    contactId = contactId ?? ((opp?.contact_id as string) ?? null);
    customerId = customerId ?? ((opp?.customer_id as string) ?? null);
  }

  // Conversations usually carry no opportunity link, so fall back to matching
  // the contact by email — the same resolution the queue panel uses.
  if (!customerId && contactEmail) {
    const { data: c } = await supabaseAdmin
      .from('contacts')
      .select('id, full_name, title, customer_id')
      .eq('company_id', companyId)
      .ilike('email', contactEmail)
      .limit(1)
      .maybeSingle();
    if (c) {
      contactId = contactId ?? (c.id as string);
      customerId = customerId ?? ((c.customer_id as string) ?? null);
    }
  }

  let contact: Record<string, unknown> | null = null;
  if (contactId) {
    const { data } = await supabaseAdmin
      .from('contacts')
      .select('id, full_name, email, title')
      .eq('id', contactId)
      .eq('company_id', companyId)
      .maybeSingle();
    contact = (data as Record<string, unknown>) ?? null;
  }

  let customer: Record<string, unknown> | null = null;
  if (customerId) {
    const { data } = await supabaseAdmin
      .from('customers')
      .select('id, trading_name, legal_name, industry, country')
      .eq('id', customerId)
      .eq('company_id', companyId)
      .maybeSingle();
    customer = (data as Record<string, unknown>) ?? null;
  }

  let request: string | null = null;
  let sender: string | null = (contact?.full_name as string) ?? null;
  if (conversationId) {
    const { data: last } = await supabaseAdmin
      .from('messages')
      .select('role, content, subject, created_at')
      .eq('conversation_id', conversationId)
      .in('role', ['user', 'customer'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    request = clip((last?.content as string) ?? null, 700);
    if (last?.subject) request = request ?? clip(last.subject as string, 200);
  }
  request = request ?? clip((base.product_summary as string) ?? null, 400);
  request = request ?? clip((base.subject as string) ?? null, 300);
  if (!sender) sender = clip((base.subject as string) ?? null, 80);

  // follow_up_items carries its own copy in message_body, and the step it is
  // scheduled for. Neither exists on the other row types.
  const scheduled = (base.scheduled_for as string) ?? null;
  const nextStepFallback =
    clip((base.message_body as string) ?? null, 160) ??
    (scheduled ? `Send on ${scheduled.slice(0, 10)}` : null);

  const lines: string[] = [];
  let total: string | null = null;
  if (kind === 'quote') {
    const currency = (base.currency as string) ?? (opp?.currency as string) ?? 'USD';
    const amount = (base.total_amount as number | null) ?? (opp?.estimated_order_value as number | null) ?? null;
    total = amount != null ? `${currency} ${amount.toLocaleString('en-US')}` : null;

    const { data: li } = await supabaseAdmin
      .from('quote_line_items')
      .select('product_name, quantity, unit, unit_price, total_price')
      .eq('quote_id', rawId)
      .order('sort_order', { ascending: true });
    for (const row of li ?? []) {
      const r = row as Record<string, unknown>;
      const qty = r.quantity != null ? `${r.quantity}${r.unit ? ` ${r.unit}` : ''}` : '—';
      const amt = r.total_price != null ? `${currency} ${Number(r.total_price).toLocaleString('en-US')}` : '—';
      lines.push(`- ${r.product_name ?? 'Item'} x ${qty} = ${amt}`);
    }
  } else if (base.estimated_value != null) {
    const currency = (base.currency as string) ?? 'USD';
    total = `${currency} ${Number(base.estimated_value).toLocaleString('en-US')}`;
  }

  const missing = Array.isArray(base.missing_info) ? (base.missing_info as string[]) : [];

  return {
    kind,
    sender,
    subject: clip((base.subject as string) ?? null, 200),
    company: ((customer?.trading_name as string) ?? (customer?.legal_name as string) ?? null) || null,
    industry: (customer?.industry as string) ?? null,
    country: (customer?.country as string) ?? null,
    stage: (opp?.stage as string) ?? null,
    nextStep:
      clip((opp?.next_action as string) ?? null, 160) ?? nextStepFallback,
    request,
    total,
    lines,
    missing,
  };
}

function splitItemKey(key: string): ['reply' | 'quote' | 'followup' | null, string | null] {
  if (key.startsWith('conv-')) return ['reply', key.slice('conv-'.length) || null];
  if (key.startsWith('quote-')) return ['quote', key.slice('quote-'.length) || null];
  if (key.startsWith('fu-')) return ['followup', key.slice('fu-'.length) || null];
  return [null, null];
}

function buildPrompt(ctx: Context): string {
  const facts: string[] = [];
  const add = (label: string, value: string | null) => {
    if (value) facts.push(`${label}: ${value}`);
  };
  add('Client', ctx.sender);
  add('Company', ctx.company);
  add('Industry', ctx.industry);
  add('Country', ctx.country);
  add('Stage', ctx.stage ? ctx.stage.replace(/_/g, ' ').toLowerCase() : null);
  add('Next step', ctx.nextStep);
  if (ctx.total) add('Value', ctx.total);

  const brief =
    ctx.kind === 'quote'
      ? 'This is a DRAFT QUOTE that is waiting for a human to approve it. Write the covering email that goes out with it.'
      : ctx.kind === 'followup'
        ? 'This is a scheduled FOLLOW-UP waiting for a human to approve it. Write the follow-up email.'
        : 'This is an INBOUND CUSTOMER MESSAGE waiting for a human to approve a reply. Write that reply.';

  return [
    'You are a trade export sales assistant writing on behalf of Sailwise, a sourcing and quotation platform.',
    'Write ONE short, professional email. Plain text only — no subject line, no signature block, no markdown, no bullet lists of meta commentary.',
    brief,
    '',
    'Deal facts:',
    facts.length > 0 ? facts.map((f) => `- ${f}`).join('\n') : '- (limited detail available)',
    '',
    ctx.request ? `What the customer said:\n"""${ctx.request}"""` : 'The customer did not give detail in writing.',
    '',
    ctx.lines.length > 0 ? `Quoted items:\n${ctx.lines.join('\n')}\nTotal: ${ctx.total ?? 'unknown'}` : '',
    '',
    ctx.missing.length > 0
      ? `Specs the AI could not confirm: ${ctx.missing.join(', ')}. Ask for these specifically — do not guess them.`
      : '',
    '',
    'Rules: 4-7 sentences. Lead with the point. Reference the specific items or the question they raised. If specs are still missing, ask for them specifically. Never invent specs, prices, certifications, lead times, or company details that are not in the facts above. If something is unknown, ask rather than assume. Do not mention Sailwise pricing or subscription plans. Sign off as "Best regards,\\nSailwise Team".',
  ]
    .filter((l) => l !== '')
    .join('\n');
}

async function generateDraft(ctx: Context): Promise<{ body: string; model: string }> {
  if (!NIM_API_KEY) throw new Error('NIM_API_KEY is not configured');

  // This model answers in 7-30s depending on load, so allow headroom above the
  // 25s the extraction endpoint uses and retry once before giving up — a
  // timeout here means the approver sees an empty box on a row they need.
  const TIMEOUT_MS = 45000;
  let lastStatus = 0;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(`${NIM_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${NIM_API_KEY}` },
        body: JSON.stringify({
          model: NIM_MODEL,
          messages: [{ role: 'user', content: buildPrompt(ctx) }],
          max_tokens: 500,
          temperature: 0.3,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      lastStatus = response.status;
      if (!response.ok) {
        console.error('[queue/draft] model error:', response.status);
        if (response.status < 500) break; // bad request: retrying will not help
        continue;
      }

      const json = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const body = (json.choices?.[0]?.message?.content || '').trim();
      if (!body) throw new Error('Draft generation returned empty content');
      return { body, model: NIM_MODEL };
    } catch (err) {
      const isTimeout = err instanceof Error && /timeout|abort/i.test(err.name + err.message);
      console.error(`[queue/draft] attempt ${attempt + 1} failed:`, err instanceof Error ? `${err.name}: ${err.message}` : err);
      if (!isTimeout) break;
    }
  }

  if (lastStatus === 429) throw new Error('The AI is rate-limited right now. Try again shortly.');
  throw new Error('The AI took too long to respond. Try again.');
}

export async function GET(req: NextRequest) {
  const { companyId } = await requireAuth(req);
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 403 });

  const itemKey = req.nextUrl.searchParams.get('itemId') || '';
  const [kind] = splitItemKey(itemKey);
  if (!kind) return NextResponse.json({ error: 'Invalid itemId' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from(DRAFT_TABLE)
    .select('body, edited, source, model, updated_at')
    .eq('company_id', companyId)
    .eq('queue_item_key', itemKey)
    .maybeSingle();

  if (isMissingTable(error)) return NextResponse.json({ draft: null, persisted: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    draft: data
      ? {
          body: data.body as string,
          edited: data.edited as boolean,
          source: (data.source as 'ai' | 'template' | 'human' | null) ?? 'ai',
          model: data.model as string | null,
        }
      : null,
    persisted: true,
  });
}

export async function POST(req: NextRequest) {
  const { companyId } = await requireAuth(req);
  if (!companyId) return NextResponse.json({ error: 'No company' }, { status: 403 });

  let payload: { itemId?: string; body?: string; regenerate?: boolean };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const itemKey = payload.itemId || '';
  const [kind] = splitItemKey(itemKey);
  if (!kind) return NextResponse.json({ error: 'Invalid itemId' }, { status: 400 });

  // A human edit: persist and return without calling the model.
  if (typeof payload.body === 'string') {
    const body = payload.body.slice(0, MAX_BODY);
    const { error } = await supabaseAdmin.from(DRAFT_TABLE).upsert(
      {
        company_id: companyId,
        queue_item_key: itemKey,
        item_kind: kind,
        body,
        source: 'human',
        edited: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id,queue_item_key' }
    );
    if (isMissingTable(error)) return NextResponse.json({ ok: true, persisted: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, persisted: true });
  }

  // Otherwise generate. Reuse a stored draft unless asked to regenerate, so
  // re-opening a row never spends a model call.
  if (!payload.regenerate) {
    const { data } = await supabaseAdmin
      .from(DRAFT_TABLE)
      .select('body, model, edited, source')
      .eq('company_id', companyId)
      .eq('queue_item_key', itemKey)
      .maybeSingle();
    if (data?.body) {
      return NextResponse.json({
        draft: {
          body: data.body as string,
          edited: data.edited as boolean,
          source: (data.source as 'ai' | 'template' | 'human' | null) ?? 'ai',
          model: data.model as string | null,
        },
        persisted: true,
        reused: true,
      });
    }
  }

  const ctx = await loadContext(companyId, itemKey);
  if (!ctx) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  let body: string;
  let source: 'ai' | 'template';
  let model: string | null;
  let warning: string | null = null;

  if (MOCK_AI) {
    body = buildTemplateDraft(ctx);
    source = 'template';
    model = null;
  } else {
    try {
      const generated = await generateDraft(ctx);
      body = generated.body;
      source = 'ai';
      model = generated.model;
    } catch (err) {
      // Never hand a reviewer an empty box: fall back to the deterministic
      // draft and say so, rather than silently shipping a worse email.
      console.error('[queue/draft] falling back to template:', err instanceof Error ? err.message : err);
      body = buildTemplateDraft(ctx);
      source = 'template';
      model = null;
      warning = err instanceof Error ? err.message : 'The AI did not respond';
    }
  }

  const { error } = await supabaseAdmin.from(DRAFT_TABLE).upsert(
    {
      company_id: companyId,
      queue_item_key: itemKey,
      item_kind: kind,
      body,
      source,
      model,
      edited: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'company_id,queue_item_key' }
  );
  const persisted = !isMissingTable(error);

  return NextResponse.json({
    draft: { body, edited: false, source, model },
    persisted,
    warning,
  });
}
