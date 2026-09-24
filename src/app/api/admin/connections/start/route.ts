import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import {
  PROVIDERS,
  buildAuthorizeUrl,
  buildRedirectUri,
  createState,
  isProviderConfigured,
  type OAuthProvider,
} from '@/lib/oauth';

export async function GET(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get('provider') as OAuthProvider | null;
  if (!provider || !PROVIDERS[provider]) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }
  if (!isProviderConfigured(provider)) {
    return NextResponse.json({ error: 'provider-not-configured' }, { status: 503 });
  }

  let auth;
  try {
    auth = await requireAuth(req);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'storage-unavailable' }, { status: 503 });
  }
  if (!auth?.companyId) {
    return NextResponse.json({ error: 'No company associated with this account' }, { status: 403 });
  }

  const state = createState({ companyId: auth.companyId, provider });
  const redirectUri = buildRedirectUri(req);
  return NextResponse.redirect(buildAuthorizeUrl(provider, redirectUri, state));
}