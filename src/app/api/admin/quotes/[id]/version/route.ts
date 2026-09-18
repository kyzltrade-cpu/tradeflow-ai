import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET /api/admin/quotes/[id]/version
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    const companyId = auth.companyId;
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quotes')
      .select('id')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const { data: versions, error: versionsError } = await supabaseAdmin
      .from('quote_versions')
      .select('*')
      .eq('quote_id', id)
      .order('version_number', { ascending: false });

    if (versionsError) {
      console.error('[quotes/[id]/version:GET] Supabase error:', versionsError.message);
      return NextResponse.json({ error: versionsError.message }, { status: 500 });
    }

    return NextResponse.json({ versions: versions || [] });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[quotes/[id]/version:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/quotes/[id]/version
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    const companyId = auth.companyId;
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { change_summary } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quotes')
      .select('*, quote_line_items(*), quote_cost_components(*)')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (quote.status === 'SENT' || quote.status === 'OPENED' || quote.status === 'ACCEPTED') {
      return NextResponse.json(
        { error: `Cannot create version for quote in "${quote.status}" status. Only draft or review quotes can be versioned.` },
        { status: 400 }
      );
    }

    const { data: existingVersions } = await supabaseAdmin
      .from('quote_versions')
      .select('version_number')
      .eq('quote_id', id)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion =
      existingVersions && existingVersions.length > 0
        ? existingVersions[0].version_number + 1
        : 1;

    const snapshot = {
      ...quote,
      line_items: quote.quote_line_items,
      cost_components: quote.quote_cost_components,
    };
    delete snapshot.quote_line_items;
    delete snapshot.quote_cost_components;

    const { error: versionError } = await supabaseAdmin
      .from('quote_versions')
      .insert({
        quote_id: id,
        company_id: companyId,
        version_number: nextVersion,
        snapshot,
        change_summary: change_summary || null,
        created_by: auth.user.id,
      });

    if (versionError) {
      console.error('[quotes/[id]/version:POST] Supabase error:', versionError.message);
      return NextResponse.json({ error: versionError.message }, { status: 500 });
    }

    await supabaseAdmin
      .from('quotes')
      .update({
        current_version: nextVersion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    await supabaseAdmin.from('audit_events').insert({
      company_id: companyId,
      event_type: 'version_created',
      entity_type: 'quote',
      entity_id: id,
      actor_id: auth.user.id,
      actor_email: auth.user.email,
      metadata: {
        version_number: nextVersion,
        change_summary: change_summary || null,
      },
    });

    return NextResponse.json({
      version: {
        quote_id: id,
        version_number: nextVersion,
        change_summary: change_summary || null,
        created_by: auth.user.id,
      },
    }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[quotes/[id]/version:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
