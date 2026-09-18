import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/api-auth';
import { processAttachment, type AttachmentInput } from '@/lib/attachment-processor';
import { extractTradingRequest } from '@/lib/rfq-extraction';

// POST /api/admin/inquiries/[id]/extract
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;

    // Fetch inquiry
    const { data: inquiry, error: inquiryError } = await supabaseAdmin
      .from('inquiries')
      .select('*')
      .eq('id', id)
      .eq('company_id', auth.companyId)
      .single();

    if (inquiryError || !inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    if (inquiry.processing_status === 'EXTRACTING') {
      return NextResponse.json({ error: 'Extraction already in progress' }, { status: 409 });
    }

    // Update status to EXTRACTING
    await supabaseAdmin
      .from('inquiries')
      .update({ processing_status: 'EXTRACTING', updated_at: new Date().toISOString() })
      .eq('id', id);

    // Fetch attachments
    const { data: attachments } = await supabaseAdmin
      .from('inquiry_attachments')
      .select('*')
      .eq('inquiry_id', id);

    // Process each attachment through the attachment processor
    const attachmentTexts: string[] = [];
    const attachmentErrors: string[] = [];

    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        // If we already have extracted text, skip processing
        if (att.extracted_text) {
          attachmentTexts.push(att.extracted_text);
          continue;
        }

        // Download file from storage if storage_path exists
        if (att.storage_path) {
          try {
            const { data: fileData, error: downloadError } = await supabaseAdmin.storage
              .from('inquiry-attachments')
              .download(att.storage_path);

            if (downloadError || !fileData) {
              attachmentErrors.push(`Failed to download ${att.original_name}: ${downloadError?.message || 'unknown error'}`);
              continue;
            }

            const buffer = Buffer.from(await fileData.arrayBuffer());
            const input: AttachmentInput = {
              buffer,
              filename: att.original_name,
              mimeType: att.mime_type,
              fileSize: att.file_size,
            };

            const result = await processAttachment(input);

            if (result.status === 'completed' || result.text) {
              attachmentTexts.push(result.text);

              // Store extracted text back
              await supabaseAdmin
                .from('inquiry_attachments')
                .update({
                  extracted_text: result.text,
                  extracted_tables: result.tables.length > 0 ? result.tables : null,
                  extraction_status: result.status,
                })
                .eq('id', att.id);
            } else {
              attachmentErrors.push(`Processing failed for ${att.original_name}: ${result.error || 'unknown error'}`);
            }
          } catch (err) {
            attachmentErrors.push(`Error processing ${att.original_name}: ${err instanceof Error ? err.message : 'unknown error'}`);
          }
        }
      }
    }

    // Fetch company products for context
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('name')
      .eq('company_id', auth.companyId);

    const companyProducts = (products || []).map((p: { name: string }) => p.name);

    // Run RFQ extraction
    const extractionInput = {
      emailText: inquiry.original_message,
      attachmentTexts,
      companyProducts,
      subject: inquiry.subject,
      sourceChannel: inquiry.source_channel,
    };

    let extractionResult;
    let extractionRunId: string | null = null;

    try {
      extractionResult = await extractTradingRequest(extractionInput);

      // Create extraction run record
      const { data: run, error: runError } = await supabaseAdmin
        .from('extraction_runs')
        .insert({
          inquiry_id: id,
          company_id: auth.companyId,
          model_used: process.env.NIM_MODEL || 'meta/llama-3.1-8b-instruct',
          status: 'completed',
          raw_response: extractionResult,
          completed_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (runError) {
        console.error('[extract] Failed to create extraction run:', runError.message);
      } else {
        extractionRunId = run.id;

        // Store extracted fields
        const fieldsToInsert = Object.entries(extractionResult.partiallyExtractedFields || {}).map(
          ([fieldName, fieldData]) => ({
            extraction_run_id: run.id,
            inquiry_id: id,
            company_id: auth.companyId,
            field_name: fieldName,
            field_value: fieldData?.value ? String(fieldData.value) : null,
            confidence: fieldData?.confidence ?? 0,
            source_location: fieldData?.source || 'message',
            status: fieldData?.status || 'EXTRACTED',
            human_confirmation_required: fieldData?.requiresConfirmation ?? true,
          })
        );

        if (fieldsToInsert.length > 0) {
          await supabaseAdmin.from('extracted_fields').insert(fieldsToInsert);
        }
      }

      // Determine next status based on confidence
      const nextStatus = extractionResult.extractionConfidence >= 0.8
        ? 'READY_FOR_RFQ'
        : 'NEEDS_REVIEW';

      await supabaseAdmin
        .from('inquiries')
        .update({
          processing_status: nextStatus,
          detected_language: extractionResult.originalLanguage || inquiry.detected_language,
          extraction_run_id: extractionRunId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      return NextResponse.json({
        extraction: extractionResult,
        extraction_run_id: extractionRunId,
        next_status: nextStatus,
        attachment_errors: attachmentErrors.length > 0 ? attachmentErrors : undefined,
      });
    } catch (extractionError) {
      // Mark extraction as failed
      await supabaseAdmin
        .from('inquiries')
        .update({
          processing_status: 'FAILED',
          error_message: extractionError instanceof Error ? extractionError.message : 'Extraction failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      // Log failed extraction run
      if (extractionRunId) {
        await supabaseAdmin
          .from('extraction_runs')
          .update({
            status: 'failed',
            error_message: extractionError instanceof Error ? extractionError.message : 'Extraction failed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', extractionRunId);
      }

      console.error('[extract] Extraction failed:', extractionError);
      return NextResponse.json(
        { error: 'Extraction failed', details: extractionError instanceof Error ? extractionError.message : 'Unknown error' },
        { status: 500 }
      );
    }
  } catch (err) {
    if (err instanceof Response) return err;
    console.error('[extract] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
