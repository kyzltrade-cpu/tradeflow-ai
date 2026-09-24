import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { PROVIDERS, isProviderConfigured, type OAuthProvider } from '@/lib/oauth';

export async function GET(req: NextRequest) {
  const configured = Object.fromEntries(
    (Object.keys(PROVIDERS) as OAuthProvider[]).map((p) => [p, isProviderConfigured(p)])
  ) as Record<OAuthProvider, boolean>;

  let auth;
  try {
    auth = await requireAuth(req);
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ configured, dbOk: false, error: 'storage-unavailable' });
  }

  if (!auth) {
    return NextResponse.json({ configured, dbOk: false, error: 'storage-unavailable' });
  }

  const { data, error } = await supabaseAdmin
    .from('oauth_accounts')
    .select('provider, account_email, account_name, scopes')
    .eq('company_id', auth.companyId);

  if (error) {
    return NextResponse.json({ configured, dbOk: false, error: 'storage-unavailable' });
  }

  type AccountRow = { provider: string; account_email: string; account_name: string | null; scopes: string[] | null };
  return NextResponse.json({
    configured,
    dbOk: true,
    accounts: (data as AccountRow[] | null || []).map((a) => ({
      provider: a.provider,
      email: a.account_email,
      name: a.account_name,
      scopes: a.scopes,
    })),
  });
}