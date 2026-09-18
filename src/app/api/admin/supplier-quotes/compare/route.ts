import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

interface ComparisonMetric {
  label: string;
  field: string;
  values: Record<string, number | null>;
  best: string | null;
  worst: string | null;
  unit?: string;
  lowerIsBetter?: boolean;
}

// POST /api/admin/supplier-quotes/compare
// Body: { quote_ids: string[] }
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json();
    const { quote_ids } = body;

    if (!Array.isArray(quote_ids) || quote_ids.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 quote_ids are required for comparison' },
        { status: 400 }
      );
    }

    if (quote_ids.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 quotes can be compared at once' },
        { status: 400 }
      );
    }

    const companyId = auth.companyId;

    const { data: quotes, error } = await supabaseAdmin
      .from('supplier_quotes')
      .select(
        `
        id,
        supplier_id,
        unit_price,
        currency,
        moq,
        quantity_breaks,
        tooling_cost,
        sample_cost,
        packaging_cost,
        production_lead_time_days,
        payment_terms,
        incoterm,
        freight_assumptions,
        quote_validity_days,
        certifications,
        warranty_terms,
        exclusions,
        notes,
        status,
        suppliers (id, legal_name, trading_name, location),
        supplier_rfqs (id, rfq_number, subject),
        opportunities (id, title, product_name, currency as opp_currency)
      `
      )
      .eq('company_id', companyId)
      .in('id', quote_ids);

    if (error) {
      console.error('[supplier-quotes/compare:POST] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!quotes || quotes.length === 0) {
      return NextResponse.json({ error: 'No quotes found for the provided IDs' }, { status: 404 });
    }

    if (quotes.length < quote_ids.length) {
      const foundIds = new Set(quotes.map((q: { id: string }) => q.id));
      const missing = quote_ids.filter((id: string) => !foundIds.has(id));
      return NextResponse.json(
        { error: `Quotes not found or access denied: ${missing.join(', ')}` },
        { status: 404 }
      );
    }

    // Build supplier display names
    const suppliers: Record<string, string> = {};
    for (const q of quotes) {
      const s = q.suppliers as unknown as { legal_name: string; trading_name: string | null };
      suppliers[q.id] = s.trading_name || s.legal_name;
    }

    // Define comparison metrics with deterministic logic
    const metrics: ComparisonMetric[] = [
      {
        label: 'Unit Price',
        field: 'unit_price',
        values: {},
        best: null,
        worst: null,
        unit: quotes[0]?.currency || 'USD',
        lowerIsBetter: true,
      },
      {
        label: 'Tooling Cost',
        field: 'tooling_cost',
        values: {},
        best: null,
        worst: null,
        unit: quotes[0]?.currency || 'USD',
        lowerIsBetter: true,
      },
      {
        label: 'Sample Cost',
        field: 'sample_cost',
        values: {},
        best: null,
        worst: null,
        unit: quotes[0]?.currency || 'USD',
        lowerIsBetter: true,
      },
      {
        label: 'Packaging Cost',
        field: 'packaging_cost',
        values: {},
        best: null,
        worst: null,
        unit: quotes[0]?.currency || 'USD',
        lowerIsBetter: true,
      },
      {
        label: 'MOQ',
        field: 'moq',
        values: {},
        best: null,
        worst: null,
        unit: 'pcs',
        lowerIsBetter: true,
      },
      {
        label: 'Lead Time',
        field: 'production_lead_time_days',
        values: {},
        best: null,
        worst: null,
        unit: 'days',
        lowerIsBetter: true,
      },
      {
        label: 'Quote Validity',
        field: 'quote_validity_days',
        values: {},
        best: null,
        worst: null,
        unit: 'days',
        lowerIsBetter: false,
      },
    ];

    // Populate values
    for (const metric of metrics) {
      for (const q of quotes) {
        const val = (q as Record<string, unknown>)[metric.field];
        metric.values[q.id] = typeof val === 'number' ? val : null;
      }

      // Determine best/worst using deterministic logic
      const validEntries = Object.entries(metric.values).filter(
        ([, v]) => v !== null
      ) as [string, number][];

      if (validEntries.length >= 2) {
        const sorted = [...validEntries].sort((a, b) => a[1] - b[1]);
        if (metric.lowerIsBetter) {
          metric.best = sorted[0][0];
          metric.worst = sorted[sorted.length - 1][0];
        } else {
          metric.best = sorted[sorted.length - 1][0];
          metric.worst = sorted[0][0];
        }
      }
    }

    // Build summary table
    const summary = {
      total_quotes: quotes.length,
      opportunity: quotes[0]?.opportunities
        ? {
            id: (quotes[0].opportunities as Record<string, unknown>).id,
            title: (quotes[0].opportunities as Record<string, unknown>).title,
            product_name: (quotes[0].opportunities as Record<string, unknown>).product_name,
          }
        : null,
      suppliers: Object.entries(suppliers).map(([id, name]) => ({
        quote_id: id,
        supplier_name: name,
      })),
      metrics: metrics.map((m) => ({
        label: m.label,
        field: m.field,
        unit: m.unit,
        lower_is_better: m.lowerIsBetter,
        values: m.values,
        best_quote_id: m.best,
        worst_quote_id: m.worst,
        best_supplier: m.best ? suppliers[m.best] : null,
        worst_supplier: m.worst ? suppliers[m.worst] : null,
      })),
      // Additional context fields (non-numeric, shown as-is)
      qualitative: [
        {
          label: 'Payment Terms',
          field: 'payment_terms',
          values: Object.fromEntries(
            quotes.map((q: Record<string, unknown>) => [q.id, q.payment_terms || null])
          ),
        },
        {
          label: 'Incoterm',
          field: 'incoterm',
          values: Object.fromEntries(
            quotes.map((q: Record<string, unknown>) => [q.id, q.incoterm || null])
          ),
        },
        {
          label: 'Freight Assumptions',
          field: 'freight_assumptions',
          values: Object.fromEntries(
            quotes.map((q: Record<string, unknown>) => [q.id, q.freight_assumptions || null])
          ),
        },
        {
          label: 'Warranty Terms',
          field: 'warranty_terms',
          values: Object.fromEntries(
            quotes.map((q: Record<string, unknown>) => [q.id, q.warranty_terms || null])
          ),
        },
        {
          label: 'Certifications',
          field: 'certifications',
          values: Object.fromEntries(
            quotes.map((q: Record<string, unknown>) => [q.id, q.certifications || []])
          ),
        },
        {
          label: 'Notes',
          field: 'notes',
          values: Object.fromEntries(
            quotes.map((q: Record<string, unknown>) => [q.id, q.notes || null])
          ),
        },
      ],
    };

    return NextResponse.json({ comparison: summary });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[supplier-quotes/compare:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
