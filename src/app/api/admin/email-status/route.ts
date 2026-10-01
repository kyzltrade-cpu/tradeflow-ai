import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { resolveSender } from '@/lib/email';

// GET /api/admin/email-status
//
// Tells the UI whether a send can actually go out, and why not if it can't.
//
// Every send route in this app fails with a clear message when no sender is
// configured, but that only helps after someone clicks Send and finds out.
// This exists so a Send button can be disabled up front with the reason
// attached, instead of being a control that always fails.
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }

    const resolved = await resolveSender({ companyId: auth.companyId });

    return NextResponse.json({
      configured: Boolean(resolved.from),
      from: resolved.from ?? null,
      source: resolved.source,
      // Where to go fix it, so the message can be actionable rather than just
      // reporting a problem.
      fix:
        resolved.source === 'none'
          ? 'Connect a mailbox in Settings, or ask an admin to set EMAIL_FROM_ADDRESS on the deployment.'
          : null,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[email-status] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
