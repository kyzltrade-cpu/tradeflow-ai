import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET — get company goals
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const companyId = req.nextUrl.searchParams.get('company_id') || auth.companyId;

    if (!companyId) {
      return NextResponse.json({ goals: [] });
    }
    if (auth.companyId && companyId !== auth.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('company_goals')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ goals: data || [] });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[goals:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST — create or update goals
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const { company_id, goals } = body;

    const companyId = company_id || auth.companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'No company' }, { status: 400 });
    }
    if (auth.companyId && companyId !== auth.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete existing goals and insert new ones
    await supabaseAdmin
      .from('company_goals')
      .delete()
      .eq('company_id', companyId);

    if (goals && goals.length > 0) {
      const goalsToInsert = goals.map((g: {
        title: string;
        description: string;
        enabled: boolean;
        greeting?: string;
        flow_steps?: Array<{ trigger: string; response: string }>;
        handoff_message?: string;
        triggers?: string[];
      }) => ({
        company_id: companyId,
        title: g.title,
        description: g.description,
        enabled: g.enabled,
        greeting: g.greeting || null,
        flow_steps: g.flow_steps || [],
        handoff_message: g.handoff_message || null,
        triggers: g.triggers || [],
      }));

      const { error } = await supabaseAdmin
        .from('company_goals')
        .insert(goalsToInsert);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[goals:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
