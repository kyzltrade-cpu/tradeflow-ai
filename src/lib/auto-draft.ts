import { supabaseAdmin } from '@/lib/supabase';
import { generateQuoteNumber } from '@/lib/quote-generator';

export interface AutoDraftLine {
  product: string;
  matched_product_id?: string;
  matched_product_name?: string;
  quantity?: number;
  unit: string;
  unit_price: number;
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
}

/**
 * Idempotently ensures an opportunity (and, when priced line items exist,
 * a DRAFT quote) exists for a conversation. Safe to call on every suggest
 * — it never duplicates an opportunity or quote for the same conversation.
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

  const empty = (): AutoDraftResult => ({
    opportunity_id: null,
    quote_id: null,
    created_opportunity: false,
    created_quote: false,
    quote_number: null,
  });

  if (!requestSummary) return empty();

  // Existing inquiries for this conversation (for linkage)
  const { data: inquiries } = await supabaseAdmin
    .from('inquiries')
    .select('id, customer_id, contact_id')
    .eq('conversation_id', conversationId);

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
    const priced = lines.filter((l) => l.unit_price > 0);
    const first = priced[0] || lines[0];
    const inquiry = inquiries?.[0] || null;

    const insert: Record<string, unknown> = {
      company_id: companyId,
      title: `${conversation.contact_name || conversation.contact_email || 'Customer'} — ${requestSummary}`.slice(0, 200),
      stage: 'NEW',
      trading_model: 'principal',
      product_category: first?.matched_product_name || first?.product || null,
      product_name: first?.matched_product_name || first?.product || null,
      estimated_order_value: subtotal || null,
      currency: currency || 'USD',
      owner_id: actorId,
      last_activity_at: now,
      notes: sourcesSummary.join('; ') || null,
      created_at: now,
      updated_at: now,
    };
    if (inquiry) {
      insert.inquiry_id = inquiry.id;
      insert.customer_id = inquiry.customer_id || null;
      insert.contact_id = inquiry.contact_id || null;
    }

    const { data: opp, error } = await supabaseAdmin
      .from('opportunities')
      .insert(insert)
      .select()
      .single();

    if (error || !opp) {
      console.error('[auto-draft] opportunity insert error:', error?.message);
      return empty();
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
    };
  }

  // 3. Only auto-create a DRAFT quote when something is priced
  const priced = lines.filter((l) => l.unit_price > 0);
  if (priced.length === 0) {
    return {
      opportunity_id: oppId,
      quote_id: null,
      created_opportunity: createdOpportunity,
      created_quote: false,
      quote_number: null,
    };
  }

  const quoteNumber = await generateQuoteNumber(companyId);
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  let totalAmount = 0;
  for (const l of priced) totalAmount += (l.quantity || 0) * l.unit_price;
  totalAmount = Math.round(totalAmount * 100) / 100;

  const { data: quote, error: quoteError } = await supabaseAdmin
    .from('quotes')
    .insert({
      company_id: companyId,
      opportunity_id: oppId,
      quote_number: quoteNumber,
      status: 'DRAFT',
      currency: currency || 'USD',
      validity_days: 30,
      valid_until: validUntil.toISOString().slice(0, 10),
      notes: sourcesSummary.join('; ') || null,
      total_amount: totalAmount,
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
    };
  }

  const lineItemInserts = priced.map((l, index) => ({
    quote_id: quote.id,
    company_id: companyId,
    product_id: l.matched_product_id || null,
    product_name: l.matched_product_name || l.product,
    description: l.product,
    quantity: l.quantity || 0,
    unit: l.unit,
    unit_price: l.unit_price,
    total_price: Math.round(((l.quantity || 0) * l.unit_price) * 100) / 100,
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
        total_amount: totalAmount,
        auto_created: true,
      },
    });

  return {
    opportunity_id: oppId,
    quote_id: quote.id,
    created_opportunity: createdOpportunity,
    created_quote: true,
    quote_number: quoteNumber,
  };
}