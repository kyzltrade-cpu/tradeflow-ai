import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET — get company settings
export async function GET(req: NextRequest) {
  try {
    const companyId = req.nextUrl.searchParams.get('company_id');

    // If company_id is provided, try to load directly (used by client after onboarding)
    if (companyId) {
      const { data, error } = await supabaseAdmin
        .from('company_settings')
        .select('*')
        .eq('company_id', companyId)
        .single();

      if (error && error.code !== 'PGRST116') {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const { data: company } = await supabaseAdmin
        .from('companies')
        .select('id, name, whatsapp_number, whatsapp_phone_number_id, whatsapp_verify_token, whatsapp_waba_id, wechat_corp_id, wechat_agent_id, wechat_work_secret, wechat_work_token, wechat_work_encoding_aes_key, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end')
        .eq('id', companyId)
        .single();

      return NextResponse.json({ settings: data, company });
    }

    // Otherwise require auth
    const auth = await requireAuth(req);

    const { data, error } = await supabaseAdmin
      .from('company_settings')
      .select('*')
      .eq('company_id', auth.companyId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('id, name, whatsapp_number, whatsapp_phone_number_id, whatsapp_verify_token, whatsapp_waba_id, wechat_corp_id, wechat_agent_id, wechat_work_secret, wechat_work_token, wechat_work_encoding_aes_key, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end')
      .eq('id', auth.companyId)
      .single();

    return NextResponse.json({ settings: data, company });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[settings:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST — upsert company settings
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const {
      company_id,
      system_prompt,
      industry,
      response_delay_seconds,
      company_name,
      chat_widget_enabled,
      image_response_prompt,
      whatsapp_number,
      whatsapp_phone_number_id,
      whatsapp_access_token,
      whatsapp_verify_token,
      whatsapp_waba_id,
      wechat_corp_id,
      wechat_agent_id,
      wechat_work_secret,
      wechat_work_token,
      wechat_work_encoding_aes_key,
      email_api_key,
      email_from_email,
      email_from_name,
    } = body;

    // During onboarding, company_id is passed in body (auth.companyId may be null yet)
    const companyId = company_id || auth.companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    // Verify ownership if both exist
    if (auth.companyId && companyId !== auth.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Upsert settings
    const settingsPayload: Record<string, unknown> = {
      company_id: companyId,
      system_prompt,
      industry,
      response_delay_seconds: response_delay_seconds ?? 2,
      image_response_prompt: image_response_prompt || null,
      email_api_key: email_api_key || null,
      email_from_email: email_from_email || null,
      email_from_name: email_from_name || null,
      email_configured: !!(email_from_email && email_from_name),
      updated_at: new Date().toISOString(),
    };
    // Only include chat_widget_enabled if it's explicitly passed
    if (chat_widget_enabled !== undefined) {
      settingsPayload.chat_widget_enabled = chat_widget_enabled;
    }

    const { error: settingsError } = await supabaseAdmin
      .from('company_settings')
      .upsert(settingsPayload, { onConflict: 'company_id' });

    if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 500 });

    // Update company info (name, whatsapp, wechat)
    const companyUpdate: Record<string, string> = { updated_at: new Date().toISOString() };
    if (company_name !== undefined) companyUpdate.name = company_name;
    if (whatsapp_number !== undefined) companyUpdate.whatsapp_number = whatsapp_number;
    if (whatsapp_phone_number_id !== undefined) companyUpdate.whatsapp_phone_number_id = whatsapp_phone_number_id;
    if (whatsapp_access_token !== undefined) companyUpdate.whatsapp_access_token = whatsapp_access_token;
    if (whatsapp_verify_token !== undefined) companyUpdate.whatsapp_verify_token = whatsapp_verify_token;
    if (whatsapp_waba_id !== undefined) companyUpdate.whatsapp_waba_id = whatsapp_waba_id;
    if (wechat_corp_id !== undefined) companyUpdate.wechat_corp_id = wechat_corp_id;
    if (wechat_agent_id !== undefined) companyUpdate.wechat_agent_id = wechat_agent_id;
    if (wechat_work_secret !== undefined) companyUpdate.wechat_work_secret = wechat_work_secret;
    if (wechat_work_token !== undefined) companyUpdate.wechat_work_token = wechat_work_token;
    if (wechat_work_encoding_aes_key !== undefined) companyUpdate.wechat_work_encoding_aes_key = wechat_work_encoding_aes_key;

    if (Object.keys(companyUpdate).length > 1) {
      const { error: companyError } = await supabaseAdmin
        .from('companies')
        .update(companyUpdate)
        .eq('id', companyId);
      if (companyError) return NextResponse.json({ error: companyError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[settings:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
