import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getDraft, discardDraft } from '@/lib/outbound';

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/admin/outbound/[id]/discard — drop a gated draft without sending.
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

    await discardDraft(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[outbound:discard] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
