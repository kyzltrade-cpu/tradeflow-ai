import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// POST /api/admin/quotes/[id]/approve
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    const companyId = auth.companyId;
    const { id } = await params;
    const body = await req.json();
    const { action, comments } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (!action || !['request', 'approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "request", "approve", or "reject"' },
        { status: 400 }
      );
    }

    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quotes')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Fetch company settings to check approval threshold
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('approval_threshold')
      .eq('id', companyId)
      .single();

    const now = new Date().toISOString();

    if (action === 'request') {
      // Request approval — transition to IN_REVIEW
      if (quote.status !== 'DRAFT') {
        return NextResponse.json(
          { error: `Cannot request approval for quote in "${quote.status}" status.` },
          { status: 400 }
        );
      }

      const needsApproval =
        company?.approval_threshold &&
        quote.total_amount >= company.approval_threshold;

      if (!needsApproval) {
        // Below threshold — auto-approve
        const { error: updateError } = await supabaseAdmin
          .from('quotes')
          .update({
            status: 'APPROVED',
            approved_by: auth.user.id,
            approved_at: now,
            updated_at: now,
          })
          .eq('id', id);

        if (updateError) {
          console.error('[quotes/[id]/approve:POST] Supabase error:', updateError.message);
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // Create approval record
        await supabaseAdmin.from('quote_approvals').insert({
          quote_id: id,
          company_id: companyId,
          approver_id: auth.user.id,
          status: 'approved',
          comments: comments || 'Auto-approved — below threshold',
          decided_at: now,
        });

        // Log audit event
        await supabaseAdmin.from('audit_events').insert({
          company_id: companyId,
          event_type: 'approved',
          entity_type: 'quote',
          entity_id: id,
          actor_id: auth.user.id,
          actor_email: auth.user.email,
          metadata: {
            auto_approved: true,
            total_amount: quote.total_amount,
            threshold: company?.approval_threshold,
          },
        });

        return NextResponse.json({
          quote: { ...quote, status: 'APPROVED', approved_by: auth.user.id, approved_at: now },
          auto_approved: true,
        });
      }

      // Above threshold — require manual approval
      const { error: updateError } = await supabaseAdmin
        .from('quotes')
        .update({ status: 'IN_REVIEW', updated_at: now })
        .eq('id', id);

      if (updateError) {
        console.error('[quotes/[id]/approve:POST] Supabase error:', updateError.message);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Create pending approval record
      await supabaseAdmin.from('quote_approvals').insert({
        quote_id: id,
        company_id: companyId,
        approver_id: auth.user.id,
        status: 'pending',
        comments: comments || null,
      });

      // Log audit event
      await supabaseAdmin.from('audit_events').insert({
        company_id: companyId,
        event_type: 'approval_requested',
        entity_type: 'quote',
        entity_id: id,
        actor_id: auth.user.id,
        actor_email: auth.user.email,
        metadata: {
          total_amount: quote.total_amount,
          threshold: company?.approval_threshold,
        },
      });

      return NextResponse.json({
        quote: { ...quote, status: 'IN_REVIEW' },
        auto_approved: false,
      });
    }

    if (action === 'approve') {
      // Approve — must be IN_REVIEW
      if (quote.status !== 'IN_REVIEW') {
        return NextResponse.json(
          { error: `Cannot approve quote in "${quote.status}" status. Quote must be IN_REVIEW.` },
          { status: 400 }
        );
      }

      const { error: updateError } = await supabaseAdmin
        .from('quotes')
        .update({
          status: 'APPROVED',
          approved_by: auth.user.id,
          approved_at: now,
          updated_at: now,
        })
        .eq('id', id);

      if (updateError) {
        console.error('[quotes/[id]/approve:POST] Supabase error:', updateError.message);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Update pending approval record
      await supabaseAdmin
        .from('quote_approvals')
        .update({
          status: 'approved',
          comments: comments || null,
          decided_at: now,
        })
        .eq('quote_id', id)
        .eq('status', 'pending');

      // Log audit event
      await supabaseAdmin.from('audit_events').insert({
        company_id: companyId,
        event_type: 'approved',
        entity_type: 'quote',
        entity_id: id,
        actor_id: auth.user.id,
        actor_email: auth.user.email,
        metadata: { comments: comments || null },
      });

      return NextResponse.json({
        quote: { ...quote, status: 'APPROVED', approved_by: auth.user.id, approved_at: now },
      });
    }

    if (action === 'reject') {
      // Reject — must be IN_REVIEW
      if (quote.status !== 'IN_REVIEW') {
        return NextResponse.json(
          { error: `Cannot reject quote in "${quote.status}" status. Quote must be IN_REVIEW.` },
          { status: 400 }
        );
      }

      const { error: updateError } = await supabaseAdmin
        .from('quotes')
        .update({ status: 'REJECTED', updated_at: now })
        .eq('id', id);

      if (updateError) {
        console.error('[quotes/[id]/approve:POST] Supabase error:', updateError.message);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Update pending approval record
      await supabaseAdmin
        .from('quote_approvals')
        .update({
          status: 'rejected',
          comments: comments || null,
          decided_at: now,
        })
        .eq('quote_id', id)
        .eq('status', 'pending');

      // Log audit event
      await supabaseAdmin.from('audit_events').insert({
        company_id: companyId,
        event_type: 'rejected',
        entity_type: 'quote',
        entity_id: id,
        actor_id: auth.user.id,
        actor_email: auth.user.email,
        metadata: { comments: comments || null },
      });

      return NextResponse.json({
        quote: { ...quote, status: 'REJECTED' },
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[quotes/[id]/approve:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
