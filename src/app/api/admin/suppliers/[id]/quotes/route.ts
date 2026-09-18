import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET /api/admin/suppliers/[id]/quotes?page=1&limit=20&status=
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;
    const url = new URL(req.url);

    // Verify supplier belongs to user's company
    const { data: supplier } = await supabaseAdmin
      .from('suppliers')
      .select('company_id')
      .eq('id', id)
      .single();

    if (!supplier || supplier.company_id !== auth.companyId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;
    const status = url.searchParams.get('status');

    let query = supabaseAdmin
      .from('supplier_quotes')
      .select(`
        *,
        supplier_rfqs!inner (subject, opportunity_id)
      `, { count: 'exact' })
      .eq('supplier_id', id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('[suppliers/[id]/quotes:GET] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      quotes: data,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[suppliers/[id]/quotes:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
