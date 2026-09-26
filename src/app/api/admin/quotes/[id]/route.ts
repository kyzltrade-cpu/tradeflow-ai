import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET /api/admin/quotes/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    const companyId = auth.companyId;
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quotes')
      .select('*, quote_line_items(*), quote_cost_components(*)')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const [
      versionsResult,
      approvalsResult,
      opportunityResult,
      customerResult,
      contactResult,
      auditResult,
    ] = await Promise.all([
      supabaseAdmin
        .from('quote_versions')
        .select('*')
        .eq('quote_id', id)
        .order('version_number', { ascending: false }),

      supabaseAdmin
        .from('quote_approvals')
        .select('*')
        .eq('quote_id', id)
        .order('created_at', { ascending: false }),

      quote.opportunity_id
        ? supabaseAdmin
            .from('opportunities')
            .select('*')
            .eq('id', quote.opportunity_id)
            .single()
        : Promise.resolve({ data: null }),

      quote.customer_id
        ? supabaseAdmin
            .from('customers')
            .select('*')
            .eq('id', quote.customer_id)
            .single()
        : Promise.resolve({ data: null }),

      quote.contact_id
        ? supabaseAdmin
            .from('contacts')
            .select('*')
            .eq('id', quote.contact_id)
            .single()
        : Promise.resolve({ data: null }),

      supabaseAdmin
        .from('audit_events')
        .select('*')
        .eq('entity_type', 'quote')
        .eq('entity_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    void auditResult;

    const lineItems = quote.quote_line_items ?? [];
    const costComponents = quote.quote_cost_components ?? [];
    const versions = (versionsResult.data || []).map((v: any) => ({
      ...v,
      version: v.version_number,
      summary: v.change_summary,
    }));
    const approvals = approvalsResult.data || [];

    const title = opportunityResult.data?.title ?? '';
    const titleLead = title.split(/\s*[-–—]\s*|—/)[0]?.trim() || title || null;
    const contact = contactResult.data;
    const customer = customerResult.data;
    const customerName =
      (contact && (contact.name || contact.trading_name)) ||
      (customer && (customer.trading_name || customer.legal_name)) ||
      titleLead ||
      null;

    const marginPercent =
      quote.margin_pct != null && quote.margin_pct > 0
        ? quote.margin_pct * 100
        : quote.total_amount > 0 && (quote.total_margin || 0) > 0
        ? (quote.total_margin / quote.total_amount) * 100
        : null;

    const { quote_line_items: _qli, quote_cost_components: _qcc, ...rest } = quote;

    return NextResponse.json({
      ...rest,
      line_items: lineItems,
      cost_components: costComponents,
      customer_name: customerName,
      contact_name: (contact && (contact.name || contact.trading_name)) || null,
      contact_email: contact?.email || null,
      opportunity_title: titleLead,
      subtotal: quote.total_amount,
      margin_amount: quote.total_margin,
      margin_percent: marginPercent,
      versions,
      approvals,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[quotes/[id]:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/quotes/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    const companyId = auth.companyId;
    const { id } = await params;
    const body = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('quotes')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (existing.status !== 'DRAFT' && existing.status !== 'IN_REVIEW') {
      return NextResponse.json(
        { error: `Cannot update quote in "${existing.status}" status. Only DRAFT or IN_REVIEW quotes can be edited.` },
        { status: 400 }
      );
    }

    const {
      customer_id,
      contact_id,
      currency,
      incoterm,
      payment_terms,
      delivery_terms,
      validity_days,
      valid_until,
      notes,
      internal_notes,
      terms_and_conditions,
      selected_supplier_quote_id,
      line_items,
      cost_components,
    } = body;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (customer_id !== undefined) updates.customer_id = customer_id || null;
    if (contact_id !== undefined) updates.contact_id = contact_id || null;
    if (currency !== undefined) updates.currency = currency;
    if (incoterm !== undefined) updates.incoterm = incoterm;
    if (payment_terms !== undefined) updates.payment_terms = payment_terms;
    if (delivery_terms !== undefined) updates.delivery_terms = delivery_terms;
    if (validity_days !== undefined) updates.validity_days = validity_days;
    if (valid_until !== undefined) updates.valid_until = valid_until;
    if (notes !== undefined) updates.notes = notes;
    if (internal_notes !== undefined) updates.internal_notes = internal_notes;
    if (terms_and_conditions !== undefined) updates.terms_and_conditions = terms_and_conditions;
    if (selected_supplier_quote_id !== undefined) updates.selected_supplier_quote_id = selected_supplier_quote_id || null;

    const { data: updatedQuote, error: updateError } = await supabaseAdmin
      .from('quotes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[quotes/[id]:PUT] Supabase error:', updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (line_items && Array.isArray(line_items)) {
      await supabaseAdmin.from('quote_line_items').delete().eq('quote_id', id);

      if (line_items.length > 0) {
        const inserts = line_items.map(
          (item: Record<string, unknown>, index: number) => ({
            quote_id: id,
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
        await supabaseAdmin.from('quote_line_items').insert(inserts);
      }

      let totalAmount = 0;
      for (const item of line_items) {
        totalAmount += (parseFloat(String(item.quantity)) || 0) * (parseFloat(String(item.unit_price)) || 0);
      }
      totalAmount = Math.round(totalAmount * 100) / 100;

      await supabaseAdmin
        .from('quotes')
        .update({ total_amount: totalAmount })
        .eq('id', id);

      updatedQuote.total_amount = totalAmount;
    }

    if (cost_components && Array.isArray(cost_components)) {
      await supabaseAdmin.from('quote_cost_components').delete().eq('quote_id', id);

      if (cost_components.length > 0) {
        const inserts = cost_components.map(
          (comp: Record<string, unknown>, index: number) => ({
            quote_id: id,
            company_id: companyId,
            component_name: comp.component_name || comp.componentName || 'Cost',
            amount: parseFloat(String(comp.amount)) || 0,
            currency: comp.currency || existing.currency || 'USD',
            source: comp.source || 'manual',
            source_entity_type: comp.source_entity_type || null,
            source_entity_id: comp.source_entity_id || null,
            effective_date: comp.effective_date || null,
            status: comp.status || 'estimated',
            assumption_note: comp.assumption_note || null,
            sort_order: index,
          })
        );
        await supabaseAdmin.from('quote_cost_components').insert(inserts);
      }
    }

    const { data: fullQuote } = await supabaseAdmin
      .from('quotes')
      .select('*, quote_line_items(*), quote_cost_components(*)')
      .eq('id', id)
      .single();

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'updated_at') continue;
      if (existing[key as keyof typeof existing] !== value) {
        changes[key] = { from: existing[key as keyof typeof existing], to: value };
      }
    }

    if (Object.keys(changes).length > 0 || line_items || cost_components) {
      await supabaseAdmin.from('audit_events').insert({
        company_id: companyId,
        event_type: 'updated',
        entity_type: 'quote',
        entity_id: id,
        actor_id: auth.user.id,
        actor_email: auth.user.email,
        changes: Object.keys(changes).length > 0 ? changes : undefined,
        metadata: {
          ...(line_items ? { line_items_updated: true } : {}),
          ...(cost_components ? { cost_components_updated: true } : {}),
        },
      });
    }

    return NextResponse.json({ quote: fullQuote });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[quotes/[id]:PUT] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/quotes/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    const companyId = auth.companyId;
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('quotes')
      .select('company_id, status, quote_number')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { error: `Cannot delete quote in "${existing.status}" status. Only DRAFT quotes can be deleted.` },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from('quotes').delete().eq('id', id);

    if (error) {
      console.error('[quotes/[id]:DELETE] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabaseAdmin.from('audit_events').insert({
      company_id: companyId,
      event_type: 'deleted',
      entity_type: 'quote',
      entity_id: id,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      metadata: { quote_number: existing.quote_number },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[quotes/[id]:DELETE] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
