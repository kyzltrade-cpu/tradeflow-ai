import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';

// GET /api/admin/inquiries/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;

    const { data: inquiry, error } = await supabaseAdmin
      .from('inquiries')
      .select('*')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .single();

    if (error || !inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    // Fetch related data in parallel
    const [attachmentsResult, extractedFieldsResult, opportunityResult] = await Promise.all([
      supabaseAdmin
        .from('inquiry_attachments')
        .select('*')
        .eq('inquiry_id', id)
        .order('created_at'),
      supabaseAdmin
        .from('extracted_fields')
        .select('*')
        .eq('inquiry_id', id)
        .order('field_name'),
      inquiry.opportunity_id
        ? supabaseAdmin
            .from('opportunities')
            .select('id, title, stage, priority, estimated_order_value, currency, created_at')
            .eq('id', inquiry.opportunity_id)
            .single()
        : { data: null, error: null },
    ]);

    return NextResponse.json({
      inquiry: {
        ...inquiry,
        attachments: attachmentsResult.data || [],
        extracted_fields: extractedFieldsResult.data || [],
        opportunity: opportunityResult.data || null,
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[inquiries:GET:ID] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/inquiries/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;
    const body = await req.json();

    const { company_id, id: _bodyId, ...updates } = body;

    if (company_id && company_id !== auth.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify the inquiry belongs to the user's company
    const { data: existing } = await supabaseAdmin
      .from('inquiries')
      .select('company_id')
      .eq('id', id)
      .single();

    if (!existing || existing.company_id !== auth.companyId) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('inquiries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[inquiries:PUT] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ inquiry: data });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[inquiries:PUT] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/inquiries/[id] — soft delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('inquiries')
      .select('company_id')
      .eq('id', id)
      .single();

    if (!existing || existing.company_id !== auth.companyId) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('inquiries')
      .update({
        processing_status: 'FAILED',
        error_message: 'Soft deleted by user',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('[inquiries:DELETE] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[inquiries:DELETE] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
