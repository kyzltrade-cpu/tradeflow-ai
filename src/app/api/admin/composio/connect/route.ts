import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getAppCatalog, isComposioConfigured, startConnection } from '@/lib/composio';

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
  const toolkit = typeof body.toolkit === 'string' ? body.toolkit.trim() : '';
  if (!toolkit) {
    return NextResponse.json({ error: 'Missing toolkit.' }, { status: 400 });
  }

  let catalog;
  try {
    catalog = await getAppCatalog();
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'composio-unavailable' }, { status: 502 });
  }
  if (!catalog.has(toolkit)) {
    return NextResponse.json({ error: 'Unknown toolkit.' }, { status: 400 });
  }

  try {
    const url = await startConnection(auth.companyId, toolkit);
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Connect failed.' }, { status: 502 });
  }
}