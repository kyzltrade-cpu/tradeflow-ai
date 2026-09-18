import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET /api/admin/products?company_id=xxx
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const url = new URL(req.url);
    const companyId = auth.companyId || url.searchParams.get('company_id');

    if (!companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('company_id', companyId)
      .order('category')
      .order('name');

    if (error) {
      console.error('[products:GET] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ products: data });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[products:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/products
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const { company_id, name, description, moq, price_range, lead_time, specs, category, photos } = body;

    if (!name) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }

    // During onboarding, company_id is passed in body (auth.companyId may be null yet)
    const companyId = company_id || auth.companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }
    // Verify ownership if both exist
    if (auth.companyId && companyId !== auth.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        company_id: companyId,
        name,
        description: description || null,
        moq: moq || null,
        price_range: price_range || null,
        lead_time: lead_time || null,
        specs: specs || null,
        category: category || null,
        photos: photos || [],
      })
      .select()
      .single();

    if (error) {
      console.error('[products:POST] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ product: data });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[products:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/products
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const { id, company_id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    if (company_id && company_id !== auth.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify the product belongs to the user's company
    const { data: existing } = await supabaseAdmin
      .from('products')
      .select('company_id')
      .eq('id', id)
      .single();

    if (existing && existing.company_id !== auth.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[products:PUT] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ product: data });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[products:PUT] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/products?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('products')
      .select('company_id')
      .eq('id', id)
      .single();

    if (existing && existing.company_id !== auth.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabaseAdmin.from('products').delete().eq('id', id);

    if (error) {
      console.error('[products:DELETE] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[products:DELETE] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
