import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// POST /api/admin/opportunities/[id]/convert
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;
    const body = await req.json();
    const { conversation_id } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (!conversation_id) {
      return NextResponse.json({ error: 'conversation_id is required' }, { status: 400 });
    }

    // Verify opportunity exists and belongs to this company
    const { data: opportunity, error: oppError } = await supabaseAdmin
      .from('opportunities')
      .select('*')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .is('deleted_at', null)
      .single();

    if (oppError || !opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    // Verify conversation exists and belongs to this company
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('id', conversation_id)
      .eq('company_id', auth.companyId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Check conversation isn't already linked to another opportunity
    if (conversation.opportunity_id && conversation.opportunity_id !== id) {
      return NextResponse.json(
        { error: 'Conversation is already linked to another opportunity' },
        { status: 409 }
      );
    }

    // If conversation already linked to this opportunity, no-op
    if (conversation.opportunity_id === id) {
      return NextResponse.json({
        opportunity,
        message: 'Conversation is already linked to this opportunity',
      });
    }

    // Pre-fill opportunity from conversation's extracted data
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    };

    // Use conversation's product_summary if opportunity has no product_name
    if (!opportunity.product_name && conversation.product_summary) {
      updates.product_name = conversation.product_summary;
    }

    // Use conversation's estimated_value if opportunity has no value
    if (!opportunity.estimated_order_value && conversation.estimated_value) {
      updates.estimated_order_value = conversation.estimated_value;
      updates.currency = conversation.currency || 'USD';
    }

    // Use conversation's missing_info to suggest stage
    if (
      opportunity.stage === 'NEW' &&
      conversation.missing_info &&
      conversation.missing_info.length > 0
    ) {
      updates.stage = 'NEEDS_INFORMATION';
    }

    // Use conversation's owner if opportunity has no owner
    if (!opportunity.owner_id && conversation.owner_id) {
      updates.owner_id = conversation.owner_id;
    }

    // Use conversation's next_action if opportunity has none
    if (!opportunity.next_action && conversation.next_action) {
      updates.next_action = conversation.next_action;
    }

    if (!opportunity.next_action_due && conversation.next_action_due) {
      updates.next_action_due = conversation.next_action_due;
    }

    // Update opportunity
    const { data: updatedOpp, error: updateError } = await supabaseAdmin
      .from('opportunities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[opportunities/[id]/convert:POST] Supabase update error:', updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Link conversation to opportunity
    const { error: linkError } = await supabaseAdmin
      .from('conversations')
      .update({ opportunity_id: id })
      .eq('id', conversation_id);

    if (linkError) {
      console.error('[opportunities/[id]/convert:POST] Link error:', linkError.message);
      // Non-fatal — the opportunity was updated
    }

    // Log audit event
    await supabaseAdmin.from('audit_events').insert({
      company_id: auth.companyId,
      event_type: 'conversation_linked',
      entity_type: 'opportunity',
      entity_id: id,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      metadata: {
        conversation_id,
        prefilled_fields: Object.keys(updates).filter((k) => !['updated_at', 'last_activity_at'].includes(k)),
      },
    });

    return NextResponse.json({
      opportunity: updatedOpp,
      conversation_linked: true,
      prefilled_from_conversation: Object.keys(updates).filter(
        (k) => !['updated_at', 'last_activity_at'].includes(k)
      ),
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[opportunities/[id]/convert:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
