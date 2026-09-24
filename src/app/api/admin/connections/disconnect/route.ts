import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { supabaseAdmin } from '@/lib/supabase';
import { PROVIDERS, type OAuthProvider } from '@/lib/oauth';

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const provider = body.provider as OAuthProvider | undefined;
    if (!provider || !PROVIDERS[provider]) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('oauth_accounts')
      .delete()
      .eq('company_id', auth.companyId)
      .eq('provider', provider);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[connections:disconnect] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}