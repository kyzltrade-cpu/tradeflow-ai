import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getCompanyApps, getCompanyMailboxState, isComposioConfigured } from '@/lib/composio';
import { getEmailStatus } from '@/lib/email';
import type { CompanyMailboxState } from '@/lib/composio-apps';

// GET /api/admin/composio/status — per-company connection state for Settings.
// Never returns key material; only whether the deployment is wired.
export async function GET(req: NextRequest) {
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
  const companyId = auth.companyId;

  const email = getEmailStatus();
  const unconfigured = {
    configured: false,
    apps: [],
    mailbox: null as CompanyMailboxState | null,
    email,
  };

  if (!isComposioConfigured()) {
    return NextResponse.json(unconfigured);
  }

  try {
    const [apps, mailbox] = await Promise.all([
      getCompanyApps(companyId),
      getCompanyMailboxState(companyId).catch(() => null),
    ]);
    return NextResponse.json({ configured: true, apps, mailbox, email });
  } catch (e) {
    return NextResponse.json({
      configured: true,
      apps: [],
      mailbox: null,
      email,
      error: e instanceof Error ? e.message : 'composio-unavailable',
    });
  }
}
