import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { isComposioConfigured, startConnection } from '@/lib/composio';
import { isKnownToolkit, isMailboxToolkit } from '@/lib/composio-apps';

// POST /api/admin/composio/connect — start Composio hosted OAuth for one
// toolkit, scoped to the caller's company. The connected account that comes
// back is owned by that company, so mail only ever lands in their inbox.
export async function POST(req: NextRequest) {
  let auth;
  try {
    auth = await requireAuth(req);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!auth?.companyId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!isComposioConfigured()) {
    return NextResponse.json(
      {
        error: 'Mailbox connections are not available on this deployment yet.',
        code: 'COMPOSIO_NOT_CONFIGURED',
      },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const toolkit = typeof body.toolkit === 'string' ? body.toolkit.trim() : '';
  if (!toolkit) {
    return NextResponse.json({ error: 'Missing toolkit.' }, { status: 400 });
  }
  if (!isKnownToolkit(toolkit)) {
    return NextResponse.json({ error: 'Unknown toolkit.' }, { status: 400 });
  }

  try {
    const result = await startConnection(auth.companyId, toolkit);
    return NextResponse.json({
      url: result.url,
      connectionId: result.connectionId,
      status: result.status,
      mailbox: isMailboxToolkit(toolkit),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Connect failed.';
    const noKey = /COMPOSIO_API_KEY/.test(message);
    return NextResponse.json(
      { error: noKey ? 'Mailbox connections are not available on this deployment yet.' : message, code: noKey ? 'COMPOSIO_NOT_CONFIGURED' : 'COMPOSIO_CONNECT_FAILED' },
      { status: noKey ? 503 : 502 }
    );
  }
}
