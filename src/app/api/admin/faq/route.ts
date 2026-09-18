import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET — list all FAQ rules for a company
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const companyId = auth.companyId || req.nextUrl.searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('faq_rules')
      .select('*')
      .eq('company_id', companyId)
      .order('priority', { ascending: false });

    if (error) {
      console.error('[faq:GET] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[faq:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST — create a FAQ rule
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const { company_id, question_pattern, answer, priority, keywords } = body;

    if (!question_pattern || !answer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // During onboarding, company_id is passed in body (auth.companyId may be null yet)
    const companyId = company_id || auth.companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    if (auth.companyId && companyId !== auth.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('faq_rules')
      .insert({ company_id: companyId, question_pattern, answer, priority: priority || 0, keywords: keywords || [] })
      .select()
      .single();

    if (error) {
      console.error('[faq:POST] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[faq:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT — update a FAQ rule
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const { id, question_pattern, answer, priority, keywords } = body;

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('faq_rules')
      .select('company_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    if (existing.company_id !== auth.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('faq_rules')
      .update({ question_pattern, answer, priority: priority || 0, keywords: keywords || [] })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[faq:PUT] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[faq:PUT] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE — remove a FAQ rule
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('faq_rules')
      .select('company_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    if (existing.company_id !== auth.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabaseAdmin.from('faq_rules').delete().eq('id', id);
    if (error) {
      console.error('[faq:DELETE] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[faq:DELETE] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
