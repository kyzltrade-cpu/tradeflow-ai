import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET /api/admin/supplier-quotes?page=1&limit=20&status=&supplier_id=&opportunity_id=&rfq_id=
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const url = new URL(req.url);
    const companyId = auth.companyId;

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;
    const status = url.searchParams.get('status');
    const supplierId = url.searchParams.get('supplier_id');
    const opportunityId = url.searchParams.get('opportunity_id');
    const rfqId = url.searchParams.get('rfq_id');
    const search = url.searchParams.get('search');

    let query = supabaseAdmin
      .from('supplier_quotes')
      .select(
        `
        *,
        suppliers (id, legal_name, trading_name, location),
        supplier_rfqs (id, rfq_number, subject, status, opportunity_id),
        opportunities (id, title, stage, product_name)
      `,
        { count: 'exact' }
      )
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (status) {
      const statuses = status.split(',');
      query = query.in('status', statuses);
    }

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    if (opportunityId) {
      query = query.eq('opportunity_id', opportunityId);
    }

    if (rfqId) {
      query = query.eq('supplier_rfq_id', rfqId);
    }

    if (search) {
      query = query.or(`notes.ilike.%${search}%,source_type.ilike.%${search}%`);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('[supplier-quotes:GET] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      quotes: data,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[supplier-quotes:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/supplier-quotes
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const {
      supplier_rfq_id,
      supplier_id,
      opportunity_id,
      unit_price,
      currency,
      moq,
      quantity_breaks,
      tooling_cost,
      sample_cost,
      packaging_cost,
      production_lead_time_days,
      payment_terms,
      incoterm,
      freight_assumptions,
      quote_validity_days,
      certifications,
      warranty_terms,
      exclusions,
      notes,
      source_type,
      source_file_url,
      extracted_raw,
      confidence,
    } = body;

    if (!supplier_rfq_id) {
      return NextResponse.json({ error: 'supplier_rfq_id is required' }, { status: 400 });
    }

    if (!supplier_id) {
      return NextResponse.json({ error: 'supplier_id is required' }, { status: 400 });
    }

    const companyId = auth.companyId;

    // Verify RFQ belongs to company
    const { data: rfq, error: rfqError } = await supabaseAdmin
      .from('supplier_rfqs')
      .select('id, company_id, opportunity_id')
      .eq('id', supplier_rfq_id)
      .eq('company_id', companyId)
      .single();

    if (rfqError || !rfq) {
      return NextResponse.json({ error: 'RFQ not found' }, { status: 404 });
    }

    // Verify supplier belongs to company
    const { data: supplier, error: supplierError } = await supabaseAdmin
      .from('suppliers')
      .select('id, company_id')
      .eq('id', supplier_id)
      .eq('company_id', companyId)
      .single();

    if (supplierError || !supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const resolvedOpportunityId = opportunity_id || rfq.opportunity_id;

    const insertData: Record<string, unknown> = {
      company_id: companyId,
      supplier_rfq_id,
      supplier_id,
      opportunity_id: resolvedOpportunityId,
      unit_price: unit_price ?? null,
      currency: currency || 'USD',
      moq: moq ?? null,
      quantity_breaks: quantity_breaks || [],
      tooling_cost: tooling_cost ?? 0,
      sample_cost: sample_cost ?? 0,
      packaging_cost: packaging_cost ?? 0,
      production_lead_time_days: production_lead_time_days ?? null,
      payment_terms: payment_terms || null,
      incoterm: incoterm || null,
      freight_assumptions: freight_assumptions || null,
      quote_validity_days: quote_validity_days ?? null,
      certifications: certifications || [],
      warranty_terms: warranty_terms || null,
      exclusions: exclusions || null,
      notes: notes || null,
      source_type: source_type || 'manual',
      source_file_url: source_file_url || null,
      extracted_raw: extracted_raw || null,
      confidence: confidence ?? null,
      status: 'received',
    };

    const { data, error } = await supabaseAdmin
      .from('supplier_quotes')
      .insert(insertData)
      .select(
        `
        *,
        suppliers (id, legal_name, trading_name),
        supplier_rfqs (id, rfq_number, subject)
      `
      )
      .single();

    if (error) {
      console.error('[supplier-quotes:POST] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit
    await supabaseAdmin.from('audit_events').insert({
      company_id: companyId,
      event_type: 'created',
      entity_type: 'supplier_quote',
      entity_id: data.id,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      metadata: {
        supplier_rfq_id,
        supplier_id,
        source_type: source_type || 'manual',
        unit_price: unit_price ?? null,
      },
    });

    return NextResponse.json({ quote: data }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[supplier-quotes:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
