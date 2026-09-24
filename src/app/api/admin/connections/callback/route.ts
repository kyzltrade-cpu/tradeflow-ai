import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  PROVIDERS,
  buildRedirectUri,
  decryptSecret,
  encryptSecret,
  exchangeCode,
  fetchAccountInfo,
  verifyState,
  type OAuthProvider,
} from '@/lib/oauth';

function backToSettings(result: 'ok' | 'error', provider: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return NextResponse.redirect(`${base.replace(/\/$/, '')}/admin/settings?${result}=${provider}`);
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const code = params.get('code');
  const state = params.get('state');

  if (params.get('error')) {
    return backToSettings('error', (params.get('state') || '').slice(0, 8));
  }
  if (!code || !state) {
    return backToSettings('error', 'unknown');
  }

  const verified = verifyState(state);
  if (!verified) {
    return backToSettings('error', 'unknown');
  }

  let tokens;
  try {
    tokens = await exchangeCode(verified.provider, code, buildRedirectUri(req));
  } catch (err) {
    console.error('[oauth:callback] token exchange failed:', err);
    return backToSettings('error', verified.provider);
  }

  let accountInfo;
  try {
    accountInfo = await fetchAccountInfo(verified.provider, tokens.access_token, tokens.id_token);
  } catch (err) {
    console.error('[oauth:callback] account info failed:', err);
    return backToSettings('error', verified.provider);
  }

  const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

  const { error } = await supabaseAdmin.from('oauth_accounts').upsert(
    {
      company_id: verified.companyId,
      provider: verified.provider,
      account_email: accountInfo.email,
      account_name: accountInfo.name,
      access_token_encrypted: encryptSecret(tokens.access_token),
      refresh_token_encrypted: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null,
      token_expires_at: expiresAt,
      scopes: (tokens.id_token ? PROVIDERS[verified.provider].scope : '').split(' '),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'company_id,provider' }
  );

  if (error) {
    console.error('[oauth:callback] db write failed:', error);
    return backToSettings('error', verified.provider);
  }

  return backToSettings('ok', verified.provider);
}