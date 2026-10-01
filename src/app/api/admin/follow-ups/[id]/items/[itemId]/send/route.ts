import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { deliverFollowUp } from '@/lib/follow-up-send';

// POST /api/admin/follow-ups/[id]/items/[itemId]/send
// Sends the exact text a human reviewed and edited in the queue panel.
// The cron job cannot do this: it has no access to a human's edits.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    const companyId = auth.companyId;

    const { id: sequenceId, itemId } = await params;
    if (!sequenceId || !itemId) {
      return NextResponse.json({ error: 'id and itemId are required' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const content = typeof body.body === 'string' ? body.body.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const recipientEmail = typeof body.recipient_email === 'string' ? body.recipient_email : null;

    if (!content) {
      return NextResponse.json({ error: 'body is required' }, { status: 400 });
    }

    // Fall back to the item's own subject so a send can never go out as an
    // empty "Re:" line.
    let finalSubject = subject;
    if (!finalSubject) {
      const { data: item } = await supabaseAdmin
        .from('follow_up_items')
        .select('subject, step_number')
        .eq('id', itemId)
        .eq('sequence_id', sequenceId)
        .eq('company_id', companyId)
        .maybeSingle();
      finalSubject = item?.subject || `Follow-up: Step ${item?.step_number ?? 1}`;
    }

    const result = await deliverFollowUp({
      sequenceId,
      itemId,
      companyId,
      subject: finalSubject,
      body: content,
      recipientEmail,
    });

    await supabaseAdmin.from('audit_events').insert({
      company_id: companyId,
      event_type: result.success ? 'followup_sent' : 'send_failed',
      entity_type: 'follow_up_item',
      entity_id: itemId,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      metadata: {
        sequence_id: sequenceId,
        recipient_email: result.recipient ?? null,
        subject: finalSubject,
        email_sent: result.success,
        email_code: result.code ?? null,
        email_error: result.error ?? null,
        via: 'queue_draft',
      },
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Follow-up was NOT sent. Check the sending address and retry.',
          recipient: result.recipient ?? null,
        },
        // Nothing was addressed or sent in the not-found case, so it must not
        // look like a delivery outage.
        { status: result.notFound ? 404 : 502 }
      );
    }

    return NextResponse.json({ ok: true, sent: true, recipient: result.recipient ?? null });
  } catch (err) {
    // requireAuth signals 401 by throwing a Response; passing it through keeps
    // an expired session from being reported as a server fault.
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[follow-ups/items/send] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
