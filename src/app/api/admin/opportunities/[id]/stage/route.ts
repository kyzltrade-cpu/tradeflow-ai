import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

/** Valid stage transitions for the opportunity pipeline */
const VALID_TRANSITIONS: Record<string, string[]> = {
  NEW: ['NEEDS_INFORMATION', 'QUALIFIED'],
  NEEDS_INFORMATION: ['QUALIFIED'],
  QUALIFIED: ['SOURCING'],
  SOURCING: ['QUOTE_DRAFT'],
  QUOTE_DRAFT: ['PENDING_APPROVAL'],
  PENDING_APPROVAL: ['SENT'],
  SENT: ['NEGOTIATING'],
  NEGOTIATING: ['WON', 'LOST', 'EXPIRED'],
  // Terminal states: WON, LOST, EXPIRED — no outgoing transitions
};

/**
 * Check if a stage transition is valid.
 * Terminal states (WON, LOST, EXPIRED) accept transitions from any stage.
 */
function isValidTransition(from: string, to: string): boolean {
  // Terminal states cannot be transitioned out of
  if (['WON', 'LOST', 'EXPIRED'].includes(from)) {
    return false;
  }

  // Any stage can transition to terminal states
  if (['WON', 'LOST', 'EXPIRED'].includes(to)) {
    return true;
  }

  const allowed = VALID_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

// POST /api/admin/opportunities/[id]/stage
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;
    const body = await req.json();
    const { stage, lost_reason } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (!stage) {
      return NextResponse.json({ error: 'stage is required' }, { status: 400 });
    }

    const validStages = [
      'NEW', 'NEEDS_INFORMATION', 'QUALIFIED', 'SOURCING',
      'QUOTE_DRAFT', 'PENDING_APPROVAL', 'SENT', 'NEGOTIATING',
      'WON', 'LOST', 'EXPIRED',
    ];

    if (!validStages.includes(stage)) {
      return NextResponse.json(
        { error: `Invalid stage. Must be one of: ${validStages.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch existing opportunity
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('opportunities')
      .select('*')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    const currentStage = existing.stage;

    // No-op if already in the requested stage
    if (currentStage === stage) {
      return NextResponse.json({ opportunity: existing, message: 'Already in this stage' });
    }

    // Validate transition
    if (!isValidTransition(currentStage, stage)) {
      return NextResponse.json(
        {
          error: `Invalid transition from ${currentStage} to ${stage}`,
          valid_transitions: VALID_TRANSITIONS[currentStage] || [],
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const updates: Record<string, unknown> = {
      stage,
      updated_at: now,
      last_activity_at: now,
    };

    // Set lost reason if transitioning to LOST
    if (stage === 'LOST' && lost_reason) {
      updates.lost_reason = lost_reason;
    }

    const { data, error } = await supabaseAdmin
      .from('opportunities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[opportunities/[id]/stage:POST] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log audit event for stage transition
    await supabaseAdmin.from('audit_events').insert({
      company_id: auth.companyId,
      event_type: 'stage_changed',
      entity_type: 'opportunity',
      entity_id: id,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      changes: {
        stage: { from: currentStage, to: stage },
      },
      metadata: {
        from_stage: currentStage,
        to_stage: stage,
        lost_reason: stage === 'LOST' ? lost_reason || null : null,
      },
    });

    return NextResponse.json({ opportunity: data });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[opportunities/[id]/stage:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
