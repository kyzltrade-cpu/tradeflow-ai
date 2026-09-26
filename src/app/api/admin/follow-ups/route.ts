import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET /api/admin/follow-ups
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const url = new URL(req.url);
    const companyId = auth.companyId;

    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(url.searchParams.get('page_size') || '25', 10), 100);
    const status = url.searchParams.get('status');
    const opportunity_id = url.searchParams.get('opportunity_id');
    const sort = url.searchParams.get('sort') || 'created_at';
    const order = url.searchParams.get('order') === 'asc';

    let query = supabaseAdmin
      .from('follow_up_sequences')
      .select('*, follow_up_items(*), opportunities(title, stage)', { count: 'exact' })
      .eq('company_id', companyId);

    if (status) {
      const statuses = status.split(',');
      query = query.in('status', statuses);
    }

    if (opportunity_id) {
      query = query.eq('opportunity_id', opportunity_id);
    }

    const allowedSorts: Record<string, string> = {
      created_at: 'created_at',
      updated_at: 'updated_at',
      status: 'status',
    };
    const sortColumn = allowedSorts[sort] || 'created_at';
    query = query.order(sortColumn, { ascending: order });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('[follow-ups:GET] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      sequences: data || [],
      total: count || 0,
      page,
      page_size: pageSize,
      has_next_page: (count || 0) > page * pageSize,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[follow-ups:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/follow-ups
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const { opportunity_id, quote_id, channel } = body;

    if (!opportunity_id) {
      return NextResponse.json({ error: 'opportunity_id is required' }, { status: 400 });
    }

    const companyId = auth.companyId;

    // Verify opportunity belongs to this company
    const { data: opportunity, error: oppError } = await supabaseAdmin
      .from('opportunities')
      .select('id, company_id')
      .eq('id', opportunity_id)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .single();

    if (oppError || !opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
    }

    // Check for existing active sequence on this opportunity
    const { data: existing } = await supabaseAdmin
      .from('follow_up_sequences')
      .select('id')
      .eq('opportunity_id', opportunity_id)
      .eq('status', 'active')
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'An active follow-up sequence already exists for this opportunity' },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();

    // Create the sequence
    const { data: sequence, error: seqError } = await supabaseAdmin
      .from('follow_up_sequences')
      .insert({
        company_id: companyId,
        opportunity_id,
        quote_id: quote_id || null,
        status: 'active',
        channel: channel || 'email',
        created_by: auth.user.id,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (seqError) {
      console.error('[follow-ups:POST] Supabase error:', seqError.message);
      return NextResponse.json({ error: seqError.message }, { status: 500 });
    }

    // Create default follow-up items
    const DEFAULT_STEPS = [
      { delayDays: 3, messageType: 'check_in', subjectTemplate: 'Checking in on your inquiry' },
      { delayDays: 7, messageType: 'needs_update', subjectTemplate: 'Quick question about your requirements' },
      { delayDays: 14, messageType: 'value_add', subjectTemplate: 'Additional options for your consideration' },
      { delayDays: 21, messageType: 'final', subjectTemplate: 'Last follow-up — happy to help when you are ready' },
    ];

    const items = DEFAULT_STEPS.map((step, idx) => ({
      sequence_id: sequence.id,
      company_id: companyId,
      step_number: idx + 1,
      delay_days: step.delayDays,
      scheduled_for: new Date(Date.now() + step.delayDays * 86400000).toISOString(),
      status: 'scheduled',
      message_type: step.messageType,
      subject: step.subjectTemplate,
      created_at: now,
      updated_at: now,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('follow_up_items')
      .insert(items);

    if (itemsError) {
      console.error('[follow-ups:POST] Items insert error:', itemsError.message);
      // Sequence created but items failed — still return the sequence
    }

    // Log audit event
    await supabaseAdmin.from('audit_events').insert({
      company_id: companyId,
      event_type: 'created',
      entity_type: 'follow_up_sequence',
      entity_id: sequence.id,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      metadata: { opportunity_id, channel: channel || 'email' },
    });

    return NextResponse.json({ sequence }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[follow-ups:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
