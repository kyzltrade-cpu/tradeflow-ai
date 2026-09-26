import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { generateQuotePDF } from '@/lib/quote-generator';

// GET /api/admin/quotes/[id]/pdf — download the quote as a branded PDF
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
      .select('*, quote_line_items(*)')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (!quote.quote_line_items || quote.quote_line_items.length === 0) {
      return NextResponse.json({ error: 'Quote has no line items.' }, { status: 400 });
    }

    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .single();

    const lineItems = (quote.quote_line_items || []).map((li: Record<string, unknown>) => ({
      id: li.id as string,
      quoteId: li.quote_id as string,
      productName: li.product_name as string,
      description: (li.description as string) || null,
      specifications: (li.specifications as string) || null,
      quantity: li.quantity as number,
      unit: li.unit as string,
      unitPrice: li.unit_price as number,
      totalPrice: li.total_price as number,
      currency: li.currency as string,
      sourceSupplierId: (li.source_supplier_id as string) || null,
      sourceSupplierQuoteId: (li.source_supplier_quote_id as string) || null,
      costBreakdown: [],
      margin: (li.margin as number) || null,
      marginPercent: (li.margin_percent as number) || null,
      notes: (li.notes as string) || null,
      createdAt: li.created_at as string,
      updatedAt: li.updated_at as string,
    }));

    const quoteObj = {
      id: quote.id,
      opportunityId: quote.opportunity_id || '',
      status: quote.status as 'DRAFT' | 'SENT' | 'APPROVED' | 'OPENED' | 'ACCEPTED' | 'REJECTED',
      version: quote.current_version || 1,
      currency: quote.currency,
      validUntil: quote.valid_until,
      paymentTerms: quote.payment_terms || null,
      deliveryTerms: quote.delivery_terms || null,
      incoterms: quote.incoterms || null,
      notes: quote.notes || null,
      internalNotes: null,
      lineItems,
      costComponents: [],
      totalCost: quote.total_cost || 0,
      margin: quote.margin || 0,
      marginPercent: quote.margin_percent || 0,
      sentAt: null,
      openedAt: null,
      acceptedAt: null,
      rejectedAt: null,
      createdAt: quote.created_at,
      updatedAt: quote.updated_at,
    };

    const companyName = company?.name || 'Sailwise';

    const pdfBuffer = await generateQuotePDF(
      quoteObj,
      { id: companyId, name: companyName, logoUrl: null },
      lineItems
    );

    const filename = (quote.quote_number || quote.id) + '.pdf';

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[quotes/[id]/pdf:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}