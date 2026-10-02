import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { normaliseNotifications } from '@/lib/notifications';

async function loadNotifications(companyId: string) {
  const { data, error } = await supabaseAdmin
    .from('company_settings')
    .select('pricing')
    .eq('company_id', companyId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;

  const pricing = (data?.pricing as Record<string, unknown> | null) ?? null;
  return normaliseNotifications(pricing?.notifications);
}

// GET — WhatsApp alert preferences for a company
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const companyId = req.nextUrl.searchParams.get('company_id') || auth.companyId;
    if (!companyId) return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    if (auth.companyId && companyId !== auth.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const notifications = await loadNotifications(companyId);
    return NextResponse.json({ notifications });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[notifications:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST — merge WhatsApp alert preferences into company_settings.pricing
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const companyId = body.company_id || auth.companyId;
    if (!companyId) return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    if (auth.companyId && companyId !== auth.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const notifications = normaliseNotifications(body.notifications);

    // Preserve existing pricing keys — only replace `notifications`.
    const { data: existing } = await supabaseAdmin
      .from('company_settings')
      .select('pricing')
      .eq('company_id', companyId)
      .maybeSingle();

    const pricing = {
      ...((existing?.pricing as Record<string, unknown> | null) ?? {}),
      notifications,
    };

    const { error } = await supabaseAdmin
      .from('company_settings')
      .upsert(
        { company_id: companyId, pricing, updated_at: new Date().toISOString() },
        { onConflict: 'company_id' }
      );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, notifications });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[notifications:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
