import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// PUT /api/admin/follow-ups/[id]/items/[itemId]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id, itemId } = await params;
    const body = await req.json();
    const { status, scheduled_for } = body;

    if (!id || !itemId) {
      return NextResponse.json({ error: 'id and itemId are required' }, { status: 400 });
    }

    // Verify sequence belongs to this company
    const { data: sequence, error: seqError } = await supabaseAdmin
      .from('follow_up_sequences')
      .select('id, company_id')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .single();

    if (seqError || !sequence) {
      return NextResponse.json({ error: 'Follow-up sequence not found' }, { status: 404 });
    }

    // Verify item belongs to this sequence
    const { data: item, error: itemError } = await supabaseAdmin
      .from('follow_up_items')
      .select('*')
      .eq('id', itemId)
      .eq('sequence_id', id)
      .eq('company_id', auth.companyId)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Follow-up item not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { updated_at: now };

    if (status) {
      if (!['scheduled', 'skipped', 'cancelled', 'sent'].includes(status)) {
        return NextResponse.json(
          { error: 'status must be one of: scheduled, skipped, cancelled, sent' },
          { status: 400 }
        );
      }
      updates.status = status;

      if (status === 'skipped') {
        updates.cancelled_reason = body.reason || 'Skipped by user';
      }
    }

    if (scheduled_for) {
      if (item.status !== 'scheduled') {
        return NextResponse.json(
          { error: 'Can only reschedule items with status scheduled' },
          { status: 400 }
        );
      }
      updates.scheduled_for = scheduled_for;
    }

    const { data, error } = await supabaseAdmin
      .from('follow_up_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.error('[follow-ups/[id]/items/[itemId]:PUT] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: data });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[follow-ups/[id]/items/[itemId]:PUT] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
