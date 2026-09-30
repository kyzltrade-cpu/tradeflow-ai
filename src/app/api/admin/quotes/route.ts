import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { generateQuoteNumber } from '@/lib/quote-generator';

// POST /api/admin/quotes
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    const companyId = auth.companyId;
    const body = await req.json();
    const {
      opportunity_id,
      customer_id,
      contact_id,
      line_items,
      currency,
      incoterm,
      payment_terms,
      delivery_terms,
      validity_days,
      notes,
      internal_notes,
      selected_supplier_quote_id,
    } = body;

    if (!opportunity_id) {
      return NextResponse.json({ error: 'opportunity_id is required' }, { status: 400 });
    }

    if (!line_items || !Array.isArray(line_items) || line_items.length === 0) {
      return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 });
    }

    // Verify opportunity belongs to company
    const { data: opportunity, error: oppError } = await supabaseAdmin
      .from('opportunities')
      .select('*')
      .eq('id', opportunity_id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single();

    if (oppError || !opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    // Verify customer belongs to company if provided
    if (customer_id) {
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('id')
        .eq('id', customer_id)
        .eq('company_id', companyId)
        .single();

      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }
    }

    // Fetch company settings for defaults
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('default_currency, default_payment_terms, default_incoterm, quote_validity_days')
      .eq('id', companyId)
      .single();

    const finalCurrency = currency || opportunity.currency || company?.default_currency || 'USD';
    const finalPaymentTerms = payment_terms || company?.default_payment_terms || null;
    const finalIncoterm = incoterm || company?.default_incoterm || null;
    const finalValidityDays = validity_days || company?.quote_validity_days || 30;

    const now = new Date();
    const validUntil = new Date(now);
    validUntil.setDate(validUntil.getDate() + finalValidityDays);

    const quoteNumber = await generateQuoteNumber(companyId);

    // Calculate totals from line items
    let totalAmount = 0;
    for (const item of line_items) {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unit_price) || 0;
      totalAmount += qty * price;
    }
    totalAmount = Math.round(totalAmount * 100) / 100;

    // Create quote
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quotes')
      .insert({
        company_id: companyId,
        opportunity_id,
        quote_number: quoteNumber,
        status: 'DRAFT',
        customer_id: customer_id || null,
        contact_id: contact_id || null,
        currency: finalCurrency,
        incoterm: finalIncoterm,
        payment_terms: finalPaymentTerms,
        delivery_terms: delivery_terms || null,
        validity_days: finalValidityDays,
        valid_until: validUntil.toISOString().slice(0, 10),
        notes: notes || null,
        internal_notes: internal_notes || null,
        total_amount: totalAmount,
        selected_supplier_quote_id: selected_supplier_quote_id || null,
        created_by: auth.user.id,
      })
      .select()
      .single();

    if (quoteError) {
      console.error('[quotes:POST] Supabase error:', quoteError.message);
      return NextResponse.json({ error: quoteError.message }, { status: 500 });
    }

    // Insert line items
    const lineItemInserts = line_items.map(
      (item: Record<string, unknown>, index: number) => ({
        quote_id: quote.id,
        company_id: companyId,
        product_id: item.product_id || null,
        product_name: item.product_name || item.productName || 'Untitled',
        description: item.description || null,
        quantity: parseFloat(String(item.quantity)) || 0,
        unit: item.unit || 'pcs',
        unit_price: parseFloat(String(item.unit_price)) || 0,
        total_price:
          Math.round(
            (parseFloat(String(item.quantity)) || 0) *
              (parseFloat(String(item.unit_price)) || 0) *
              100
          ) / 100,
        specs: item.specs || null,
        notes: item.notes || null,
        sort_order: index,
      })
    );

    const { error: lineItemsError } = await supabaseAdmin
      .from('quote_line_items')
      .insert(lineItemInserts);

    if (lineItemsError) {
      console.error('[quotes:POST] Line items insert error:', lineItemsError.message);
      await supabaseAdmin.from('quotes').delete().eq('id', quote.id);
      return NextResponse.json({ error: lineItemsError.message }, { status: 500 });
    }

    // Fetch created quote with line items
    const { data: fullQuote } = await supabaseAdmin
      .from('quotes')
      .select('*, quote_line_items(*)')
      .eq('id', quote.id)
      .single();

    // Update opportunity quote_status
    await supabaseAdmin
      .from('opportunities')
      .update({
        quote_status: 'draft',
        updated_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', opportunity_id);

    // Log audit event
    await supabaseAdmin.from('audit_events').insert({
      company_id: companyId,
      event_type: 'created',
      entity_type: 'quote',
      entity_id: quote.id,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      metadata: {
        quote_number: quoteNumber,
        opportunity_id,
        total_amount: totalAmount,
        line_items_count: line_items.length,
      },
    });

    return NextResponse.json({ quote: fullQuote }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[quotes:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
