import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { processAttachment, type AttachmentInput } from '@/lib/attachment-processor';
import { createHash } from 'node:crypto';

// GET /api/admin/inquiries/[id]/attachments
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;

    // Verify inquiry ownership
    const { data: inquiry } = await supabaseAdmin
      .from('inquiries')
      .select('company_id')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .single();

    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('inquiry_attachments')
      .select('*')
      .eq('inquiry_id', id)
      .order('created_at');

    if (error) {
      console.error('[attachments:GET] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ attachments: data });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[attachments:GET] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/inquiries/[id]/attachments — upload new attachment
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;

    // Verify inquiry ownership
    const { data: inquiry } = await supabaseAdmin
      .from('inquiries')
      .select('company_id')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .single();

    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Compute content hash for dedup
    const contentHash = createHash('sha256').update(buffer).digest('hex');

    // Check for duplicate
    const { data: existing } = await supabaseAdmin
      .from('inquiry_attachments')
      .select('id')
      .eq('inquiry_id', id)
      .eq('content_hash', contentHash)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Attachment with identical content already exists', existing_id: existing.id },
        { status: 409 }
      );
    }

    // Generate storage path
    const timestamp = Date.now();
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${auth.companyId}/${id}/${timestamp}_${safeFilename}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('inquiry-attachments')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[attachments:POST] Storage upload error:', uploadError.message);
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    // Process attachment for text extraction
    const input: AttachmentInput = {
      buffer,
      filename: file.name,
      mimeType: file.type,
      fileSize: file.size,
    };

    const result = await processAttachment(input);

    // Store attachment record
    const { data, error } = await supabaseAdmin
      .from('inquiry_attachments')
      .insert({
        inquiry_id: id,
        company_id: auth.companyId,
        original_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        content_hash: contentHash,
        extracted_text: result.text || null,
        extracted_tables: result.tables.length > 0 ? result.tables : null,
        extraction_status: result.status,
        extraction_error: result.error || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[attachments:POST] Supabase error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ attachment: data }, { status: 201 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[attachments:POST] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
