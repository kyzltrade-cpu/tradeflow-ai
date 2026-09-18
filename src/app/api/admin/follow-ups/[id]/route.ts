import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET /api/admin/follow-ups/[id]
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

    const { data: sequence, error } = await supabaseAdmin
      .from('follow_up_sequences')
      .select('*, follow_up_items(*)')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .single();

    if (error || !sequence) {
      return NextResponse.json({ error: 'Follow-up sequence not found' }, { status: 404 });
    }

    // Sort items by step_number
    if (sequence.follow_up_items) {
      sequence.follow_up_items.sort(
        (a: { step_number: number }, b: { step_number: number }) => a.step_number - b.step_number
      );
    }

    return NextResponse.json({ sequence });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[follow-ups/[id]:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/follow-ups/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (!status || !['active', 'paused', 'cancelled', 'completed'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be one of: active, paused, cancelled, completed' },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('follow_up_sequences')
      .select('*')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Follow-up sequence not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { status, updated_at: now };

    if (status === 'paused') {
      updates.paused_by = auth.user.id;
      updates.paused_at = now;
    } else if (status === 'cancelled' || status === 'completed') {
      updates.completed_at = now;
    }

    // If resuming, clear pause fields
    if (status === 'active' && existing.status === 'paused') {
      updates.paused_by = null;
      updates.paused_at = null;
    }

    const { data, error } = await supabaseAdmin
      .from('follow_up_sequences')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[follow-ups/[id]:PUT] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If cancelled, also cancel all scheduled items
    if (status === 'cancelled') {
      await supabaseAdmin
        .from('follow_up_items')
        .update({ status: 'cancelled', cancelled_reason: 'Sequence cancelled', updated_at: now })
        .eq('sequence_id', id)
        .eq('status', 'scheduled');
    }

    // Log audit event
    await supabaseAdmin.from('audit_events').insert({
      company_id: auth.companyId,
      event_type: 'status_changed',
      entity_type: 'follow_up_sequence',
      entity_id: id,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      changes: { status: { from: existing.status, to: status } },
    });

    return NextResponse.json({ sequence: data });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[follow-ups/[id]:PUT] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
