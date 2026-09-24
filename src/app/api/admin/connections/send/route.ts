import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase';
import {
  PROVIDERS,
  decryptSecret,
  encryptSecret,
  refreshAccessToken,
  sendViaMailbox,
  type OAuthProvider,
} from '@/lib/oauth';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const provider = body.provider as OAuthProvider | undefined;
    const to = String(body.to || '').trim();
    const subject = String(body.subject || 'Test email from Backtide').trim();
    const text = String(body.text || 'This is a test email sent from your connected inbox.').trim();

    if (!provider || !PROVIDERS[provider]) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }
    if (!to) {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
    }

    const { data: account, error: findError } = await supabaseAdmin
      .from('oauth_accounts')
      .select('*')
      .eq('company_id', auth.companyId)
      .eq('provider', provider)
      .single();

    if (findError || !account) {
      return NextResponse.json({ error: 'Not connected' }, { status: 404 });
    }

    let accessToken = decryptSecret(account.access_token_encrypted);
    const refreshToken = account.refresh_token_encrypted ? decryptSecret(account.refresh_token_encrypted) : null;
    const expiresAt = new Date(account.token_expires_at).getTime();
    const now = Date.now();

    if (refreshToken && now >= expiresAt - 60_000) {
      const fresh = await refreshAccessToken(provider, refreshToken);
      accessToken = fresh.access_token;
      const nextExpiry = new Date(now + fresh.expires_in * 1000).toISOString();
      await supabaseAdmin
        .from('oauth_accounts')
        .update({
          access_token_encrypted: encryptSecret(accessToken),
          token_expires_at: nextExpiry,
          updated_at: new Date().toISOString(),
        })
        .eq('id', account.id);
    }

    const html = text.replace(/\n/g, '<br/>');
    await sendViaMailbox(provider, accessToken, { email: account.account_email, name: account.account_name }, to, subject, html);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[connections:send] Unexpected error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
  }
}