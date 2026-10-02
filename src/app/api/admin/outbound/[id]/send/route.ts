import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getDraft, sendDraft } from '@/lib/outbound';

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/admin/outbound/[id]/send — one-tap approve of a gated draft.
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    const { id } = await params;

    const draft = await getDraft(id);
    if (!draft || draft.company_id !== auth.companyId) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }
    if (draft.draft_status === 'sent') {
      return NextResponse.json({ error: 'This draft has already been sent' }, { status: 409 });
    }

    const result = await sendDraft(draft, auth.user.id);

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error || 'Send failed',
          code: result.code,
          pending: result.pending ?? false,
          draft_id: result.draftId,
        },
        { status: result.pending ? 202 : 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      draft_id: result.draftId,
      message_id: result.messageId,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[outbound:send] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
