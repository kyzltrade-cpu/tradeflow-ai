import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';

// POST /api/admin/email/test — send a test email via Resend
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }

    const { api_key, from_email, from_name, to_email } = await req.json();

    if (!api_key || !from_email || !from_name || !to_email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${from_name} <${from_email}>`,
        to: [to_email],
        subject: 'Sailwise — Test Email',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px;">
            <h2 style="color: #1a1a1a;">Sailwise Email Integration</h2>
            <p style="color: #666;">Your email integration is working correctly. You will receive quotes, follow-ups, and invoices at this address.</p>
            <p style="color: #666;">— The Sailwise Team</p>
          </div>
        `,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[email/test] Resend error:', data);
      return NextResponse.json(
        { error: data.message ?? data.error ?? 'Failed to send test email' },
        { status: res.status }
      );
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[email/test] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
