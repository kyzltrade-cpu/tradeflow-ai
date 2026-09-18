import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

const FB_API_VERSION = 'v19.0';
const FB_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;

interface MetaErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
  };
}

async function fbFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) {
    const err = json as MetaErrorResponse;
    throw new Error(
      `Meta API error (${res.status}): ${err.error?.message || JSON.stringify(json)}`
    );
  }
  return json as T;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface Phone_number {
  id: string;
  display_phone_number: string;
  quality_rating: string;
  verified_name: string;
  code_verification_status: string;
}

// POST — handle WhatsApp Embedded Signup code exchange
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const { code, waba_id, phone_number_id } = body;

    if (!code) {
      return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 });
    }
    if (!waba_id) {
      return NextResponse.json({ error: 'Missing waba_id parameter' }, { status: 400 });
    }
    if (!phone_number_id) {
      return NextResponse.json({ error: 'Missing phone_number_id parameter' }, { status: 400 });
    }

    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      return NextResponse.json(
        { error: 'Meta app credentials not configured on the server' },
        { status: 500 }
      );
    }

    // 1. Exchange code for short-lived user access token
    const tokenUrl =
      `${FB_BASE}/oauth/access_token?` +
      `client_id=${appId}` +
      `&client_secret=${appSecret}` +
      `&redirect_uri=` +
      `&code=${code}`;

    const tokenData = await fbFetch<TokenResponse>(tokenUrl);
    const shortLivedToken = tokenData.access_token;

    // 2. Extend to long-lived token (~60 days)
    const extendUrl =
      `${FB_BASE}/oauth/access_token?` +
      `grant_type=fb_exchange_token` +
      `&client_id=${appId}` +
      `&client_secret=${appSecret}` +
      `&fb_exchange_token=${shortLivedToken}`;

    const longLivedData = await fbFetch<TokenResponse>(extendUrl);
    const longLivedToken = longLivedData.access_token;

    // 3. Subscribe the WABA to our app
    const subscribeUrl =
      `${FB_BASE}/${waba_id}/subscribed_apps?` +
      `access_token=${longLivedToken}`;

    await fetch(subscribeUrl, { method: 'POST' });

    // 4. Get phone number details
    const phoneUrl =
      `${FB_BASE}/${phone_number_id}?access_token=${longLivedToken}`;

    const phoneData = await fbFetch<Phone_number>(phoneUrl);

    // 5. Save to database
    const companyId = auth.companyId;
    const { error: updateError } = await supabaseAdmin
      .from('companies')
      .update({
        whatsapp_access_token: longLivedToken,
        whatsapp_phone_number_id: phone_number_id,
        whatsapp_waba_id: waba_id,
        whatsapp_number: phoneData.display_phone_number,
        updated_at: new Date().toISOString(),
      })
      .eq('id', companyId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      phone_number: phoneData.display_phone_number,
      quality_rating: phoneData.quality_rating,
      verified_name: phoneData.verified_name,
      waba_id,
      phone_number_id,
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[embedded-signup] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
