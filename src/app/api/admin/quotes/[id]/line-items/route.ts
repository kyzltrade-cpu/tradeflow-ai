import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

async function recalculateTotals(quoteId: string, companyId: string) {
  const { data: items } = await supabaseAdmin
    .from('quote_line_items')
    .select('total_price')
    .eq('quote_id', quoteId)
    .eq('company_id', companyId);

  const totalAmount = (items || []).reduce(
    (sum: number, item: { total_price: number }) => sum + (item.total_price || 0),
    0
  );

  await supabaseAdmin
    .from('quotes')
    .update({
      total_amount: Math.round(totalAmount * 100) / 100,
      updated_at: new Date().toISOString(),
    })
    .eq('id', quoteId);

  return Math.round(totalAmount * 100) / 100;
}

// GET /api/admin/quotes/[id]/line-items
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

    const { data: items, error: itemsError } = await supabaseAdmin
      .from('quote_line_items')
      .select('*')
      .eq('quote_id', id)
      .eq('company_id', companyId)
      .order('sort_order', { ascending: true });

    if (itemsError) {
      console.error('[quotes/[id]/line-items:GET] Supabase error:', itemsError.message);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    return NextResponse.json({ line_items: items || [] });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[quotes/[id]/line-items:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/quotes/[id]/line-items
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
    const body = await req.json();
    const {
      product_id,
      product_name,
      description,
      quantity,
      unit,
      unit_price,
      specs,
      notes,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (!product_name) {
      return NextResponse.json({ error: 'product_name is required' }, { status: 400 });
    }

    const qty = parseFloat(String(quantity)) || 0;
    const price = parseFloat(String(unit_price)) || 0;

    if (qty <= 0) {
      return NextResponse.json({ error: 'quantity must be greater than 0' }, { status: 400 });
    }

    if (price < 0) {
      return NextResponse.json({ error: 'unit_price cannot be negative' }, { status: 400 });
    }

    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quotes')
      .select('id, status')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (quote.status !== 'DRAFT' && quote.status !== 'IN_REVIEW') {
      return NextResponse.json(
        { error: `Cannot add items to quote in "${quote.status}" status.` },
        { status: 400 }
      );
    }

    const { data: lastItem } = await supabaseAdmin
      .from('quote_line_items')
      .select('sort_order')
      .eq('quote_id', id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = (lastItem?.sort_order ?? -1) + 1;
    const totalPrice = Math.round(qty * price * 100) / 100;

    const { data: item, error: insertError } = await supabaseAdmin
      .from('quote_line_items')
      .insert({
        quote_id: id,
        company_id: companyId,
        product_id: product_id || null,
        product_name,
        description: description || null,
        quantity: qty,
        unit: unit || 'pcs',
        unit_price: price,
        total_price: totalPrice,
        specs: specs || null,
        notes: notes || null,
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[quotes/[id]/line-items:POST] Supabase error:', insertError.message);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await recalculateTotals(id, companyId);

    return NextResponse.json({ line_item: item }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[quotes/[id]/line-items:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/quotes/[id]/line-items
export async function PUT(
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
    const body = await req.json();
    const { item_id, product_id, product_name, description, quantity, unit, unit_price, specs, notes, sort_order } = body;

    if (!id || !item_id) {
      return NextResponse.json({ error: 'id and item_id are required' }, { status: 400 });
    }

    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quotes')
      .select('id, status')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (quote.status !== 'DRAFT' && quote.status !== 'IN_REVIEW') {
      return NextResponse.json(
        { error: `Cannot update items on quote in "${quote.status}" status.` },
        { status: 400 }
      );
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('quote_line_items')
      .select('*')
      .eq('id', item_id)
      .eq('quote_id', id)
      .eq('company_id', companyId)
      .single();

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Line item not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};

    if (product_id !== undefined) updates.product_id = product_id || null;
    if (product_name !== undefined) updates.product_name = product_name;
    if (description !== undefined) updates.description = description || null;
    if (unit !== undefined) updates.unit = unit;
    if (specs !== undefined) updates.specs = specs || null;
    if (notes !== undefined) updates.notes = notes || null;
    if (sort_order !== undefined) updates.sort_order = sort_order;

    const newQty = quantity !== undefined ? parseFloat(String(quantity)) : existing.quantity;
    const newPrice = unit_price !== undefined ? parseFloat(String(unit_price)) : existing.unit_price;

    if (quantity !== undefined) {
      if (newQty <= 0) {
        return NextResponse.json({ error: 'quantity must be greater than 0' }, { status: 400 });
      }
      updates.quantity = newQty;
    }

    if (unit_price !== undefined) {
      if (newPrice < 0) {
        return NextResponse.json({ error: 'unit_price cannot be negative' }, { status: 400 });
      }
      updates.unit_price = newPrice;
    }

    if (quantity !== undefined || unit_price !== undefined) {
      updates.total_price = Math.round(newQty * newPrice * 100) / 100;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('quote_line_items')
      .update(updates)
      .eq('id', item_id)
      .select()
      .single();

    if (updateError) {
      console.error('[quotes/[id]/line-items:PUT] Supabase error:', updateError.message);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await recalculateTotals(id, companyId);

    return NextResponse.json({ line_item: updated });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[quotes/[id]/line-items:PUT] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/quotes/[id]/line-items
export async function DELETE(
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
    const url = new URL(req.url);
    const itemId = url.searchParams.get('item_id');

    if (!id || !itemId) {
      return NextResponse.json({ error: 'id and item_id are required' }, { status: 400 });
    }

    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quotes')
      .select('id, status')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (quote.status !== 'DRAFT' && quote.status !== 'IN_REVIEW') {
      return NextResponse.json(
        { error: `Cannot delete items from quote in "${quote.status}" status.` },
        { status: 400 }
      );
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('quote_line_items')
      .select('id')
      .eq('id', itemId)
      .eq('quote_id', id)
      .eq('company_id', companyId)
      .single();

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Line item not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('quote_line_items')
      .delete()
      .eq('id', itemId);

    if (deleteError) {
      console.error('[quotes/[id]/line-items:DELETE] Supabase error:', deleteError.message);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    await recalculateTotals(id, companyId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[quotes/[id]/line-items:DELETE] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
