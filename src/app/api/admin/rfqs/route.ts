import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET /api/admin/rfqs?page=1&limit=20&status=&opportunity_id=&supplier_id=
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const url = new URL(req.url);
    const companyId = auth.companyId;

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;
    const status = url.searchParams.get('status');
    const opportunityId = url.searchParams.get('opportunity_id');
    const supplierId = url.searchParams.get('supplier_id');
    const search = url.searchParams.get('search');

    let query = supabaseAdmin
      .from('supplier_rfqs')
      .select(
        `
        *,
        suppliers!inner (id, legal_name, trading_name, location),
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

    if (opportunityId) {
      query = query.eq('opportunity_id', opportunityId);
    }

    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    if (search) {
      query = query.or(`subject.ilike.%${search}%,rfq_number.ilike.%${search}%`);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('[rfqs:GET] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      rfqs: data,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[rfqs:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/rfqs
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const {
      opportunity_id,
      supplier_id,
      language,
      subject,
      message_body,
      shared_fields,
      redacted_fields,
      response_deadline,
    } = body;

    if (!opportunity_id) {
      return NextResponse.json({ error: 'opportunity_id is required' }, { status: 400 });
    }

    if (!supplier_id) {
      return NextResponse.json({ error: 'supplier_id is required' }, { status: 400 });
    }

    const companyId = auth.companyId;

    // Verify opportunity belongs to company
    const { data: opportunity, error: oppError } = await supabaseAdmin
      .from('opportunities')
      .select('id, company_id, title, product_name, product_category, estimated_order_value, currency, required_delivery_date, destination')
      .eq('id', opportunity_id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single();

    if (oppError || !opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    // Verify supplier belongs to company
    const { data: supplier, error: supplierError } = await supabaseAdmin
      .from('suppliers')
      .select('id, company_id, legal_name, trading_name')
      .eq('id', supplier_id)
      .eq('company_id', companyId)
      .single();

    if (supplierError || !supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Generate RFQ number
    const now = new Date();
    const rfqNumber = `RFQ-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

    const { data, error } = await supabaseAdmin
      .from('supplier_rfqs')
      .insert({
        company_id: companyId,
        opportunity_id,
        supplier_id,
        rfq_number: rfqNumber,
        status: 'DRAFT',
        language: language || 'en',
        subject: subject || `RFQ: ${opportunity.product_name || opportunity.title}`,
        message_body: message_body || null,
        shared_fields: shared_fields || [],
        redacted_fields: redacted_fields || [],
        response_deadline: response_deadline || null,
      })
      .select(
        `
        *,
        suppliers (id, legal_name, trading_name),
        opportunities (id, title, product_name)
      `
      )
      .single();

    if (error) {
      console.error('[rfqs:POST] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Audit event
    await supabaseAdmin.from('audit_events').insert({
      company_id: companyId,
      event_type: 'created',
      entity_type: 'supplier_rfq',
      entity_id: data.id,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      metadata: {
        rfq_number: rfqNumber,
        supplier_name: supplier.trading_name || supplier.legal_name,
        opportunity_title: opportunity.title,
      },
    });

    return NextResponse.json({ rfq: data }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[rfqs:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
