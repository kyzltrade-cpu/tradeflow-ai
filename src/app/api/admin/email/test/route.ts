import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { sendEmail, EMAIL_ERROR_CODES, isEmailConfigured, getEmailStatus } from '@/lib/email';
import { getCompanyMailbox } from '@/lib/composio';

// POST /api/admin/email/test — send one test email using the deployment's
// Resend key. No API key is accepted from the browser: the key lives only in
// the server environment, so Settings can never leak or rotate it.
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
  const companyId = auth.companyId;

  const body = await req.json().catch(() => ({}));
  const to = typeof body.to === 'string' ? body.to.trim() : '';
  const subject =
    typeof body.subject === 'string' && body.subject.trim()
      ? body.subject.trim().slice(0, 150)
      : 'SailWise test email';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  // Report the deployment gate before touching the Resend API.
  if (!isEmailConfigured()) {
    return NextResponse.json(
      {
        success: false,
        code: EMAIL_ERROR_CODES.NOT_CONFIGURED,
        error: 'Outbound email is not configured on this deployment yet.',
        status: getEmailStatus(),
      },
      { status: 503 }
    );
  }

  // If the customer connected a mailbox, the test should prove that sender works.
  let from: string | undefined;
  try {
    const mailbox = await getCompanyMailbox(companyId);
    if (mailbox?.address) from = mailbox.address;
  } catch {
    // Non-fatal: fall back to the configured company/platform sender.
  }

  const result = await sendEmail({
    to,
    from,
    companyId,
    subject,
    html: `<p>Your outbound email is working.</p><p>Sent from ${escapeHtml(
      from || 'your configured sender'
    )}.</p>`,
    text: `Your outbound email is working. Sent from ${from || 'your configured sender'}.`,
  });

  if (!result.success) {
    const status = result.code === EMAIL_ERROR_CODES.SEND_FAILED ? 502 : 400;
    return NextResponse.json(
      {
        success: false,
        code: result.code,
        error: result.error,
        from: result.from,
        status: getEmailStatus(),
      },
      { status }
    );
  }

  return NextResponse.json({
    success: true,
    id: result.id,
    from: result.from,
    to,
    status: getEmailStatus(),
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
