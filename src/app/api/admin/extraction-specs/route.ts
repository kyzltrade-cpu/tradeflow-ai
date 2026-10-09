import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { sanitizeExtractionSpecs } from '@/lib/extraction-specs';

// AI extraction fields live in company_settings.extraction_specs (migration
// 027). This route owns that single column so the Knowledge Base editor can
// save it without going through the full settings upsert — that payload
// defaults several other columns (image_response_prompt, email_*) and would
// clobber them if called from a page that does not load them.

// GET — read the configured extraction fields
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('company_settings')
      .select('extraction_specs')
      .eq('company_id', auth.companyId)
      .maybeSingle();

    // A deployment that has not run migration 027 reports "column does not
    // exist"; surface that as supported=false so the editor can explain it.
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ extraction_specs: [], supported: true });
      }
      return NextResponse.json({ extraction_specs: [], supported: false });
    }

    const specs = Array.isArray(data?.extraction_specs) ? data!.extraction_specs : [];
    return NextResponse.json({ extraction_specs: specs, supported: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[extraction-specs:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST — replace the configured extraction fields
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.companyId) {
      return NextResponse.json({ error: 'No company associated with this account' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const extraction_specs = (body as { extraction_specs?: unknown }).extraction_specs;

    if (!Array.isArray(extraction_specs)) {
      return NextResponse.json({ error: 'extraction_specs must be an array' }, { status: 400 });
    }

    // Probe first: writing an unknown column would fail the whole upsert, so a
    // missing migration must be reported, not thrown.
    const probe = await supabaseAdmin
      .from('company_settings')
      .select('extraction_specs')
      .eq('company_id', auth.companyId)
      .maybeSingle();
    if (probe.error) {
      return NextResponse.json({ ok: false, extraction_specs_saved: false });
    }

    const { error } = await supabaseAdmin
      .from('company_settings')
      .upsert(
        {
          company_id: auth.companyId,
          extraction_specs: sanitizeExtractionSpecs(extraction_specs),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id' }
      );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, extraction_specs_saved: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[extraction-specs:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}