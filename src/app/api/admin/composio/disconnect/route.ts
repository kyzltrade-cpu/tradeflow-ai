import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { disconnectConnection, isComposioConfigured } from '@/lib/composio';

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
    return NextResponse.json({ error: 'Integrations are not configured yet.' }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const connectedAccountId = typeof body.connectedAccountId === 'string' ? body.connectedAccountId.trim() : '';
  if (!connectedAccountId) {
    return NextResponse.json({ error: 'Missing connected account id.' }, { status: 400 });
  }

  try {
    await disconnectConnection(auth.companyId, connectedAccountId);
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Disconnect failed.';
    return NextResponse.json(
      { error: msg },
      { status: msg === 'Connection not found for this company' ? 404 : 502 }
    );
  }
}