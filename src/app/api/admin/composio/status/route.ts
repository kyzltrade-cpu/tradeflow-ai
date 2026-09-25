import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getCompanyApps, isComposioConfigured } from '@/lib/composio';

export async function GET(req: NextRequest) {
  if (!isComposioConfigured()) {
    return NextResponse.json({ configured: false, apps: [] });
  }

  let auth;
  try {
    auth = await requireAuth(req);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ configured: true, apps: [], error: 'storage-unavailable' });
  }
  if (!auth?.companyId) {
    return NextResponse.json({ configured: true, apps: [], error: 'storage-unavailable' });
  }

  try {
    const apps = await getCompanyApps(auth.companyId);
    return NextResponse.json({ configured: true, apps });
  } catch (e) {
    return NextResponse.json({
      configured: true,
      apps: [],
      error: e instanceof Error ? e.message : 'composio-unavailable',
    });
  }
}