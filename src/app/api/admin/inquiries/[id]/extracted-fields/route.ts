import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// PATCH /api/admin/inquiries/[id]/extracted-fields
// Body: { field_id: string, value?: string }
// Edits (or confirms) a single extracted field. Any field the user
// explicitly edits is promoted to CONFIRMED so downstream AI (re-extraction,
// quote drafting) treats it as ground truth and never overwrites it.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;
    const body = await req.json();
    const { field_id, value } = body || {};

    if (!id) {
      return NextResponse.json({ error: 'Inquiry id is required' }, { status: 400 });
    }
    if (!field_id) {
      return NextResponse.json({ error: 'field_id is required' }, { status: 400 });
    }

    const { data: inquiry, error: inquiryError } = await supabaseAdmin
      .from('inquiries')
      .select('id, company_id')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .single();

    if (inquiryError || !inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('extracted_fields')
      .select('*')
      .eq('id', field_id)
      .eq('inquiry_id', id)
      .eq('company_id', auth.companyId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Extracted field not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      status: 'CONFIRMED',
      human_confirmation_required: false,
      confidence: 1,
      source_location: 'user_edited',
      updated_at: now,
    };

    if (value !== undefined) {
      if (typeof value !== 'string') {
        return NextResponse.json({ error: 'value must be a string' }, { status: 400 });
      }
      updates.field_value = value;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('extracted_fields')
      .update(updates)
      .eq('id', field_id)
      .select()
      .single();

    if (updateError) {
      console.error('[extracted-fields:PATCH] Supabase error:', updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const changes: Record<string, { from: unknown; to: unknown }> = {
      status: { from: existing.status, to: 'CONFIRMED' },
    };
    if (value !== undefined && existing.field_value !== value) {
      changes.field_value = { from: existing.field_value, to: value };
    }

    await supabaseAdmin.from('audit_events').insert({
      company_id: auth.companyId,
      event_type: 'updated',
      entity_type: 'extracted_field',
      entity_id: field_id,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      changes,
      metadata: { field_name: existing.field_name, inquiry_id: id },
    });

    return NextResponse.json({ field: updated });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[extracted-fields:PATCH] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}