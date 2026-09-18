import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET /api/admin/customers/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { data: customer, error: custError } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .is('deleted_at', null)
      .single();

    if (custError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Fetch related data in parallel
    const [contactsResult, inquiriesResult, quotesResult, opportunitiesResult] = await Promise.all([
      supabaseAdmin
        .from('contacts')
        .select('*')
        .eq('customer_id', id)
        .eq('company_id', auth.companyId)
        .is('deleted_at', null)
        .order('is_primary', { ascending: false }),

      supabaseAdmin
        .from('inquiries')
        .select('*')
        .eq('customer_id', id)
        .eq('company_id', auth.companyId)
        .order('received_at', { ascending: false }),

      supabaseAdmin
        .from('quotes')
        .select('*, quote_line_items(*)')
        .eq('customer_id', id)
        .eq('company_id', auth.companyId)
        .order('created_at', { ascending: false }),

      supabaseAdmin
        .from('opportunities')
        .select('id, title, stage, estimated_order_value, currency, created_at')
        .eq('customer_id', id)
        .eq('company_id', auth.companyId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
    ]);

    return NextResponse.json({
      customer,
      contacts: contactsResult.data || [],
      inquiries: inquiriesResult.data || [],
      quotes: quotesResult.data || [],
      opportunities: opportunitiesResult.data || [],
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[customers/[id]:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/customers/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;
    const body = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const {
      legal_name,
      trading_name,
      email_domain,
      country,
      industry,
      currency,
      preferred_language,
      notes,
      tags,
    } = body;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (legal_name !== undefined) updates.legal_name = legal_name;
    if (trading_name !== undefined) updates.trading_name = trading_name;
    if (email_domain !== undefined) updates.email_domain = email_domain;
    if (country !== undefined) updates.country = country;
    if (industry !== undefined) updates.industry = industry;
    if (currency !== undefined) updates.currency = currency;
    if (preferred_language !== undefined) updates.preferred_language = preferred_language;
    if (notes !== undefined) updates.notes = notes;
    if (tags !== undefined) updates.tags = tags;

    const { data, error } = await supabaseAdmin
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[customers/[id]:PUT] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log audit event
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'updated_at') continue;
      if (existing[key] !== value) {
        changes[key] = { from: existing[key], to: value };
      }
    }

    if (Object.keys(changes).length > 0) {
      await supabaseAdmin.from('audit_events').insert({
        company_id: auth.companyId,
        event_type: 'updated',
        entity_type: 'customer',
        entity_id: id,
        actor_id: auth.user.id,
        actor_email: auth.user.email,
        changes,
      });
    }

    return NextResponse.json({ customer: data });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[customers/[id]:PUT] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/customers/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('customers')
      .select('company_id')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Soft delete
    const { error } = await supabaseAdmin
      .from('customers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[customers/[id]:DELETE] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log audit event
    await supabaseAdmin.from('audit_events').insert({
      company_id: auth.companyId,
      event_type: 'deleted',
      entity_type: 'customer',
      entity_id: id,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[customers/[id]:DELETE] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
