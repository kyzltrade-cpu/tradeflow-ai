import { supabaseAdmin } from '@/lib/supabase';
import { generateQuoteNumber } from '@/lib/quote-generator';

export interface AutoDraftLine {
  product: string;
  matched_product_id?: string;
  matched_product_name?: string;
  quantity?: number;
  unit: string;
  unit_price: number;
  cost_price?: number;
  margin_pct?: number;
  needs_review?: boolean;
}

export interface AutoDraftParams {
  companyId: string;
  conversationId: string;
  conversation: {
    contact_name?: string | null;
    contact_email?: string | null;
    opportunity_id?: string | null;
  };
  requestSummary: string;
  currency: string;
  lines: AutoDraftLine[];
  subtotal: number;
  sourcesSummary: string[];
  actorId: string;
  actorEmail?: string;
}

export interface AutoDraftResult {
  opportunity_id: string | null;
  quote_id: string | null;
  created_opportunity: boolean;
  created_quote: boolean;
  quote_number: string | null;
  reason?: string;
  priced_count?: number;
  excluded_count?: number;
}

interface QuoteTotals {
  amount: number;
  cost: number;
  margin: number;
  margin_pct: number;
}

const round2 = (v: number): number => Math.round(v * 100) / 100;

function isQuotable(line: AutoDraftLine): boolean {
  return (
    line.unit_price > 0 &&
    typeof line.quantity === 'number' &&
    Number.isFinite(line.quantity) &&
    line.quantity > 0 &&
    !line.needs_review
  );
}

// Pure: decide which lines may go into an auto-drafted quote and compute the
// headline totals from the catalog cost basis each price was derived from.
export function priceQuotableLines(lines: AutoDraftLine[]): {
  quotable: AutoDraftLine[];
  excluded: AutoDraftLine[];
  totals: QuoteTotals;
} {
  const quotable = lines.filter(isQuotable);
  const costBasis = (l: AutoDraftLine): number =>
    typeof l.cost_price === 'number' && l.cost_price > 0 ? l.cost_price : l.unit_price;

  let amount = 0;
  let cost = 0;
  for (const l of quotable) {
    const qty = l.quantity as number;
    amount += round2(qty * l.unit_price);
    cost += round2(qty * costBasis(l));
  }
  amount = round2(amount);
  cost = round2(cost);
  const margin = round2(amount - cost);
  const margin_pct = amount > 0 ? round2(margin / amount) : 0;

  return { quotable, excluded: lines.filter((l) => !isQuotable(l)), totals: { amount, cost, margin, margin_pct } };
}

async function resolveCompanyDefaults(companyId: string): Promise<{
  incoterm: string | null;
  payment_terms: string | null;
}> {
  const { data } = await supabaseAdmin
    .from('companies')
    .select('default_incoterm, default_payment_terms')
    .eq('id', companyId)
    .maybeSingle();
  return {
    incoterm: (data?.default_incoterm as string | null) || null,
    payment_terms: (data?.default_payment_terms as string | null) || null,
  };
}

async function resolveRecipient(
  companyId: string,
  conversation: AutoDraftParams['conversation'],
  inquiry: { customer_id: string | null; contact_id: string | null; sender_email: string | null; sender_name: string | null } | null
): Promise<{ contact_id: string | null; customer_id: string | null; email: string | null; name: string | null }> {
  const email = inquiry?.sender_email || conversation.contact_email || null;
  const name = inquiry?.sender_name || conversation.contact_name || null;

  let contactId = inquiry?.contact_id || null;
  let customerId = inquiry?.customer_id || null;

  if (!contactId && email) {
    const { data: existing } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('company_id', companyId)
      .eq('email', email)
      .is('deleted_at', null)
      .maybeSingle();

    if (existing) {
      contactId = String(existing.id);
    } else {
      const local = email.split('@')[0] || 'Customer';
      const { data: created } = await supabaseAdmin
        .from('contacts')
        .insert({
          company_id: companyId,
          full_name: name || local,
          email,
          preferred_language: 'en',
        })
        .select('id')
        .single();
      if (created) contactId = String(created.id);
    }
  }

  return { contact_id: contactId, customer_id: customerId, email, name };
}

/**
 * Idempotently ensures an opportunity (and, when fully-priced
 * non-review line items exist, a DRAFT quote) exists for a conversation.
 * Safe to call on every suggest — it never duplicates an opportunity or
 * quote for the same conversation.
 *
 * A quote is only auto-created when every persisted line item is quotable:
 * a real quantity (>0), a real price (>0), and no pending review flag
 * (matched product, list price, and margin rule present). Anything else is
 * excluded from the draft, surfaced in the Suggest panel, and never quoted
 * or sent on the AI's word.
 */
export async function ensureAutoDraft(params: AutoDraftParams): Promise<AutoDraftResult> {
  const {
    companyId,
    conversationId,
    conversation,
    requestSummary,
    currency,
    lines,
    subtotal,
    sourcesSummary,
    actorId,
    actorEmail,
  } = params;

  const now = new Date().toISOString();

  const empty = (reason?: string): AutoDraftResult => ({
    opportunity_id: null,
    quote_id: null,
    created_opportunity: false,
    created_quote: false,
    quote_number: null,
    reason,
  });

  if (!requestSummary) return empty('no_request_summary');

  const { quotable, excluded, totals } = priceQuotableLines(lines);
  const excludedCount = excluded.length;
  const pricedCount = quotable.length;

  // Existing inquiries for this conversation (for linkage + recipient data)
  const { data: inquiries } = await supabaseAdmin
    .from('inquiries')
    .select('id, customer_id, contact_id, sender_email, sender_name')
    .eq('conversation_id', conversationId);

  const recipient = await resolveRecipient(companyId, conversation, (inquiries?.[0] as AutoDraftParams['conversation'] & { customer_id: string | null; contact_id: string | null; sender_email: string | null; sender_name: string | null }) || null);
  const defaults = await resolveCompanyDefaults(companyId);

  // 1. Resolve an existing opportunity — direct link, then via inquiries
  let opportunity: Record<string, unknown> | null = null;
  if (conversation.opportunity_id) {
    const { data: directOpp } = await supabaseAdmin
      .from('opportunities')
      .select('*')
      .eq('id', conversation.opportunity_id)
      .is('deleted_at', null)
      .maybeSingle();
    if (directOpp) opportunity = directOpp;
  }
  if (!opportunity && inquiries?.length) {
    const { data: linkedOpps } = await supabaseAdmin
      .from('opportunities')
      .select('*')
      .in('inquiry_id', inquiries.map((i: { id: string }) => i.id))
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (linkedOpps?.length) opportunity = linkedOpps[0];
  }

  let createdOpportunity = false;

  if (!opportunity) {
    const first = quotable[0] || lines[0];
    const inquiry = inquiries?.[0] || null;

    const insert: Record<string, unknown> = {
      company_id: companyId,
      title: `${recipient.name || recipient.email || 'Customer'} — ${requestSummary}`.slice(0, 200),
      stage: 'NEW',
      trading_model: 'principal',
      product_category: first?.matched_product_name || first?.product || null,
      product_name: first?.matched_product_name || first?.product || null,
      estimated_order_value: totals.amount || subtotal || null,
      currency: currency || 'USD',
      owner_id: actorId,
      last_activity_at: now,
      notes: sourcesSummary.join('; ') || null,
      created_at: now,
      updated_at: now,
    };
    if (inquiry) {
      insert.inquiry_id = inquiry.id;
    }
    if (recipient.customer_id) insert.customer_id = recipient.customer_id;
    if (recipient.contact_id) insert.contact_id = recipient.contact_id;

    const { data: opp, error } = await supabaseAdmin
      .from('opportunities')
      .insert(insert)
      .select()
      .single();

    if (error || !opp) {
      console.error('[auto-draft] opportunity insert error:', error?.message);
      return empty('opportunity_insert_failed');
    }

    opportunity = opp;
    createdOpportunity = true;

    await supabaseAdmin
      .from('conversations')
      .update({ opportunity_id: opp.id, updated_at: now })
      .eq('id', conversationId);
  } else if (!conversation.opportunity_id) {
    await supabaseAdmin
      .from('conversations')
      .update({ opportunity_id: opportunity.id, updated_at: now })
      .eq('id', conversationId);
  }

  const oppId = String(opportunity?.id ?? '');

  // 2. Existing quote → idempotent, do not duplicate
  const { data: existingQuotes } = await supabaseAdmin
    .from('quotes')
    .select('id, quote_number')
    .eq('opportunity_id', oppId)
    .order('created_at', { ascending: false });

  if (existingQuotes?.length) {
    return {
      opportunity_id: oppId,
      quote_id: existingQuotes[0].id,
      created_opportunity: createdOpportunity,
      created_quote: false,
      quote_number: existingQuotes[0].quote_number || null,
      priced_count: pricedCount,
      excluded_count: excludedCount,
    };
  }

  // 3. A DRAFT quote is created only from fully-quotable lines.
  //    Review-affecting lines are left out rather than quoted broken.
  if (quotable.length === 0) {
    const reason =
      excludedCount > 0
        ? 'excluded_lines_need_review'
        : 'nothing_priced';
    await supabaseAdmin
      .from('opportunities')
      .update({ quote_status: 'incomplete', updated_at: now, last_activity_at: now })
      .eq('id', oppId);
    return {
      opportunity_id: oppId,
      quote_id: null,
      created_opportunity: createdOpportunity,
      created_quote: false,
      quote_number: null,
      reason,
      priced_count: 0,
      excluded_count: excludedCount,
    };
  }

  const quoteNumber = await generateQuoteNumber(companyId);
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  const internalNotes =
    excludedCount > 0
      ? `${excludedCount} line item(s) excluded from this draft pending review (see Suggest panel): ${excluded
          .slice(0, 5)
          .map((l) => l.product)
          .join('; ')}`
      : null;

  const { data: quote, error: quoteError } = await supabaseAdmin
    .from('quotes')
    .insert({
      company_id: companyId,
      opportunity_id: oppId,
      quote_number: quoteNumber,
      status: 'DRAFT',
      currency: currency || 'USD',
      incoterm: defaults.incoterm,
      payment_terms: defaults.payment_terms,
      validity_days: 30,
      valid_until: validUntil.toISOString().slice(0, 10),
      customer_id: recipient.customer_id,
      contact_id: recipient.contact_id,
      total_amount: totals.amount,
      total_cost: totals.cost,
      total_margin: totals.margin,
      margin_pct: totals.margin_pct,
      notes: sourcesSummary.join('; ') || null,
      internal_notes: internalNotes,
      created_by: actorId,
    })
    .select()
    .single();

  if (quoteError || !quote) {
    console.error('[auto-draft] quote insert error:', quoteError?.message);
    return {
      opportunity_id: oppId,
      quote_id: null,
      created_opportunity: createdOpportunity,
      created_quote: false,
      quote_number: null,
      reason: 'quote_insert_failed',
      priced_count: pricedCount,
      excluded_count: excludedCount,
    };
  }

  const lineItemInserts = quotable.map((l, index) => ({
    quote_id: quote.id,
    company_id: companyId,
    product_id: l.matched_product_id || null,
    product_name: l.matched_product_name || l.product,
    description: l.product,
    quantity: l.quantity,
    unit: l.unit,
    unit_price: l.unit_price,
    total_price: round2((l.quantity as number) * l.unit_price),
    specs: { request: l.product },
    sort_order: index,
  }));
  const { error: liError } = await supabaseAdmin.from('quote_line_items').insert(lineItemInserts);
  if (liError) console.error('[auto-draft] line items insert error:', liError.message);

  await supabaseAdmin
    .from('opportunities')
    .update({ quote_status: 'draft', updated_at: now, last_activity_at: now })
    .eq('id', oppId);

  await supabaseAdmin
    .from('audit_events')
    .insert({
      company_id: companyId,
      event_type: 'created',
      entity_type: 'quote',
      entity_id: quote.id,
      actor_id: actorId,
      actor_email: actorEmail || null,
      metadata: {
        quote_number: quoteNumber,
        opportunity_id: oppId,
        total_amount: totals.amount,
        total_cost: totals.cost,
        total_margin: totals.margin,
        margin_pct: totals.margin_pct,
        excluded_count: excludedCount,
        auto_created: true,
      },
    });

  return {
    opportunity_id: oppId,
    quote_id: quote.id,
    created_opportunity: createdOpportunity,
    created_quote: true,
    quote_number: quoteNumber,
    priced_count: pricedCount,
    excluded_count: excludedCount,
  };
}