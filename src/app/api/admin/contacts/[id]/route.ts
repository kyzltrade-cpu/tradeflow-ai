import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET /api/admin/contacts/[id]
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

    const { data: contact, error } = await supabaseAdmin
      .from('contacts')
      .select('*, customers(id, legal_name, trading_name)')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .is('deleted_at', null)
      .single();

    if (error || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ contact });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[contacts/[id]:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/contacts/[id]
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
      .from('contacts')
      .select('*')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const {
      customer_id,
      full_name,
      email,
      phone,
      whatsapp,
      wechat_id,
      title,
      is_primary,
      preferred_language,
      notes,
    } = body;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (customer_id !== undefined) updates.customer_id = customer_id;
    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (whatsapp !== undefined) updates.whatsapp = whatsapp;
    if (wechat_id !== undefined) updates.wechat_id = wechat_id;
    if (title !== undefined) updates.title = title;
    if (is_primary !== undefined) updates.is_primary = is_primary;
    if (preferred_language !== undefined) updates.preferred_language = preferred_language;
    if (notes !== undefined) updates.notes = notes;

    const { data, error } = await supabaseAdmin
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[contacts/[id]:PUT] Supabase error:', error.message);
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
        entity_type: 'contact',
        entity_id: id,
        actor_id: auth.user.id,
        actor_email: auth.user.email,
        changes,
      });
    }

    return NextResponse.json({ contact: data });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[contacts/[id]:PUT] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/contacts/[id]
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
      .from('contacts')
      .select('company_id')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Soft delete
    const { error } = await supabaseAdmin
      .from('contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[contacts/[id]:DELETE] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log audit event
    await supabaseAdmin.from('audit_events').insert({
      company_id: auth.companyId,
      event_type: 'deleted',
      entity_type: 'contact',
      entity_id: id,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[contacts/[id]:DELETE] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
