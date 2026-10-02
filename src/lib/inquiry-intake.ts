/**
 * Inbound inquiry intake: the "zero taps" pipeline.
 *
 * On arrival, with no human input, an inbound buyer inquiry becomes a real
 * opportunity in the inbox with specs extracted, missing specs flagged, and a
 * spec chase drafted — and, when the send policy says it is safe, sent.
 *
 * Design constraints discovered from the live database:
 *   - `inquiries` has no `extraction_run_id` column, so we never write one.
 *     The run links back via `extraction_runs.inquiry_id`.
 *   - `opportunities` has no `conversation_id` or `status`; it uses `stage`.
 *   - `conversations` carries the denormalised thread state we need
 *     (`product_summary`, `missing_info`, `opportunity_id`, `next_action_due`).
 *
 * Every step is isolated: a failure in opportunity creation must not lose the
 * extracted specs, and a failure to send a chase must not lose the draft.
 */

import { supabaseAdmin } from '@/lib/supabase';
import { processAttachment, type AttachmentInput } from '@/lib/attachment-processor';
import {
  extractTradingRequest,
  identifyMissingFields,
  type MissingField,
} from '@/lib/rfq-extraction';
import { buildChaseDraft } from '@/lib/chase-draft';
import { classifyOutbound } from '@/lib/send-policy';
import { sendOutbound, createDraft } from '@/lib/outbound';
import { pingBigDeal } from '@/lib/whatsapp';
import { BIG_DEAL_MIN_VALUE } from '@/lib/big-deals';
import type { ProductRequirementTemplate, TradingRequest } from '@/types/trading';

export interface IntakeResult {
  ok: boolean;
  inquiryId: string;
  conversationId: string | null;
  opportunityId: string | null;
  missing: string[];
  chase: { drafted: boolean; sent: boolean; pending: boolean; draftId?: string };
  steps: string[];
  error?: string;
}

const CHASE_INTERVAL_DAYS = 3;

const DEFAULT_TEMPLATE = (companyId: string): ProductRequirementTemplate => ({
  id: 'default',
  companyId,
  name: 'Default',
  requiredFields: ['productName', 'quantity', 'unit', 'specifications', 'deliveryCountry'],
  optionalFields: ['deliveryDate', 'targetPrice'],
  isActive: true,
  createdAt: '',
  updatedAt: '',
});

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function firstEmail(...values: Array<string | null | undefined>): string | null {
  for (const v of values) {
    if (v && v.includes('@')) return v.trim().toLowerCase();
  }
  return null;
}

function parseDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

async function loadTemplate(companyId: string): Promise<ProductRequirementTemplate> {
  try {
    const { data } = await supabaseAdmin
      .from('requirement_templates')
      .select('id, required_fields, optional_fields, category')
      .eq('company_id', companyId)
      .limit(1)
      .maybeSingle();
    if (data?.required_fields?.length) {
      return {
        ...DEFAULT_TEMPLATE(companyId),
        id: data.id,
        name: data.category || 'Default',
        requiredFields: data.required_fields,
        optionalFields: data.optional_fields ?? [],
      };
    }
  } catch (err) {
    console.error('[intake] template lookup failed:', err);
  }
  return DEFAULT_TEMPLATE(companyId);
}

async function gatherAttachmentTexts(inquiryId: string): Promise<string[]> {
  const texts: string[] = [];
  try {
    const { data: attachments } = await supabaseAdmin
      .from('inquiry_attachments')
      .select('*')
      .eq('inquiry_id', inquiryId);

    for (const att of attachments ?? []) {
      if (att.extracted_text) {
        texts.push(att.extracted_text);
        continue;
      }
      if (!att.storage_path) continue;
      try {
        const { data: file } = await supabaseAdmin.storage
          .from('inquiry-attachments')
          .download(att.storage_path);
        if (!file) continue;
        const buffer = Buffer.from(await file.arrayBuffer());
        const input: AttachmentInput = {
          buffer,
          filename: att.original_name,
          mimeType: att.mime_type,
          fileSize: att.file_size,
        };
        const result = await processAttachment(input);
        if (result.text) {
          texts.push(result.text);
          await supabaseAdmin
            .from('inquiry_attachments')
            .update({
              extracted_text: result.text,
              extracted_tables: result.tables.length > 0 ? result.tables : null,
              extraction_status: result.status,
            })
            .eq('id', att.id);
        }
      } catch (err) {
        console.error(`[intake] attachment ${att.original_name} failed:`, err);
      }
    }
  } catch (err) {
    console.error('[intake] attachment load failed:', err);
  }
  return texts;
}

async function persistExtraction(
  companyId: string,
  inquiryId: string,
  extraction: TradingRequest,
): Promise<void> {
  try {
    const { data: run } = await supabaseAdmin
      .from('extraction_runs')
      .insert({
        inquiry_id: inquiryId,
        company_id: companyId,
        model_used: process.env.NIM_MODEL || 'meta/llama-3.1-8b-instruct',
        status: 'completed',
        raw_response: extraction,
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (!run) return;

    const rows = Object.entries(extraction.partiallyExtractedFields || {}).map(
      ([fieldName, fieldData]) => ({
        extraction_run_id: run.id,
        inquiry_id: inquiryId,
        company_id: companyId,
        field_name: fieldName,
        field_value: fieldData?.value ? String(fieldData.value) : null,
        confidence: fieldData?.confidence ?? 0,
        source_location: fieldData?.source || 'message',
        status: fieldData?.status || 'EXTRACTED',
        human_confirmation_required: fieldData?.requiresConfirmation ?? true,
      }),
    );

    if (rows.length > 0) {
      const names = rows.map((r) => r.field_name);
      await supabaseAdmin
        .from('extracted_fields')
        .delete()
        .eq('inquiry_id', inquiryId)
        .in('field_name', names)
        .neq('status', 'CONFIRMED');
      await supabaseAdmin.from('extracted_fields').insert(rows);
    }
  } catch (err) {
    console.error('[intake] persistExtraction failed:', err);
  }
}

interface ResolvedParties {
  contactId: string | null;
  customerId: string | null;
}

async function resolveParties(
  companyId: string,
  email: string | null,
  name: string | null,
  companyName: string | null,
): Promise<ResolvedParties> {
  const out: ResolvedParties = { contactId: null, customerId: null };
  if (!email) return out;

  try {
    const { data: existing } = await supabaseAdmin
      .from('contacts')
      .select('id, customer_id')
      .eq('company_id', companyId)
      .eq('email', email)
      .is('deleted_at', null)
      .maybeSingle();
    if (existing) {
      out.contactId = existing.id;
      out.customerId = existing.customer_id ?? null;
      if (out.customerId) return out;
    } else {
      const { data: created } = await supabaseAdmin
        .from('contacts')
        .insert({ company_id: companyId, full_name: name || email, email, is_primary: true })
        .select('id')
        .single();
      out.contactId = created?.id ?? null;
    }

    const domain = email.split('@')[1] || null;
    const legalName = companyName?.trim() || null;
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .insert({
        company_id: companyId,
        legal_name: legalName,
        trading_name: legalName,
        email_domain: domain,
      })
      .select('id')
      .single();
    out.customerId = customer?.id ?? null;

    if (out.contactId && out.customerId) {
      await supabaseAdmin.from('contacts').update({ customer_id: out.customerId }).eq('id', out.contactId);
    }
  } catch (err) {
    console.error('[intake] resolveParties failed:', err);
  }
  return out;
}

function opportunityValue(extraction: TradingRequest): number | null {
  if (extraction.quantity > 0 && extraction.targetPrice && extraction.targetPrice > 0) {
    return extraction.quantity * extraction.targetPrice;
  }
  if (extraction.budget && extraction.budget > 0) return extraction.budget;
  return null;
}

async function upsertOpportunity(
  companyId: string,
  inquiry: Record<string, unknown>,
  extraction: TradingRequest,
  parties: ResolvedParties,
): Promise<string | null> {
  const existingId = (inquiry.opportunity_id as string | null) ?? null;
  const value = opportunityValue(extraction);
  const payload = {
    company_id: companyId,
    inquiry_id: inquiry.id,
    customer_id: parties.customerId,
    contact_id: parties.contactId,
    title: extraction.productName || (inquiry.subject as string) || 'New enquiry',
    stage: 'NEW',
    product_category: extraction.productCategory ?? null,
    product_name: extraction.productName ?? null,
    estimated_order_value: value,
    currency:
      extraction.targetPriceCurrency ||
      extraction.preferredCurrency ||
      'USD',
    country: extraction.customerCountry || extraction.deliveryCountry || null,
    destination: extraction.deliveryCountry ?? null,
    required_delivery_date: parseDate(extraction.requiredDeliveryDate),
    priority: value != null && value >= BIG_DEAL_MIN_VALUE ? 'high' : 'normal',
    next_action: 'Chase missing specs',
    last_activity_at: new Date().toISOString(),
  };

  if (existingId) {
    await supabaseAdmin.from('opportunities').update(payload).eq('id', existingId);
    return existingId;
  }

  const { data, error } = await supabaseAdmin
    .from('opportunities')
    .insert(payload)
    .select('id')
    .single();
  if (error || !data) {
    console.error('[intake] opportunity insert failed:', error?.message);
    return null;
  }
  return data.id;
}

export async function runInquiryIntake(params: {
  companyId: string;
  inquiryId: string;
}): Promise<IntakeResult> {
  const { companyId, inquiryId } = params;
  const steps: string[] = [];
  const result: IntakeResult = {
    ok: false,
    inquiryId,
    conversationId: null,
    opportunityId: null,
    missing: [],
    chase: { drafted: false, sent: false, pending: false },
    steps,
  };

  try {
    const { data: inquiry } = await supabaseAdmin
      .from('inquiries')
      .select('*')
      .eq('id', inquiryId)
      .eq('company_id', companyId)
      .maybeSingle();
    if (!inquiry) {
      result.error = 'inquiry_not_found';
      return result;
    }
    result.conversationId = inquiry.conversation_id ?? null;
    steps.push('loaded inquiry');

    let conversation: Record<string, unknown> | null = null;
    if (inquiry.conversation_id) {
      const { data } = await supabaseAdmin
        .from('conversations')
        .select('*')
        .eq('id', inquiry.conversation_id)
        .maybeSingle();
      conversation = data ?? null;
    }

    await supabaseAdmin
      .from('inquiries')
      .update({ processing_status: 'EXTRACTING', updated_at: new Date().toISOString() })
      .eq('id', inquiryId);

    const attachmentTexts = await gatherAttachmentTexts(inquiryId);
    steps.push(`attachments: ${attachmentTexts.length}`);

    const { data: products } = await supabaseAdmin
      .from('products')
      .select('name')
      .eq('company_id', companyId);
    const companyProducts = (products ?? []).map((p: { name: string }) => p.name);

    const template = await loadTemplate(companyId);

    const { data: confirmed } = await supabaseAdmin
      .from('extracted_fields')
      .select('field_name, field_value, status')
      .eq('inquiry_id', inquiryId)
      .eq('company_id', companyId);
    const userConfirmedFields = (confirmed ?? [])
      .filter((f: { status: string }) => f.status === 'CONFIRMED')
      .map((f: { field_name: string; field_value: string | null }) => ({
        name: f.field_name,
        value: f.field_value,
      }));

    let extraction: TradingRequest;
    try {
      extraction = await extractTradingRequest({
        emailText: inquiry.original_message ?? '',
        attachmentTexts,
        companyProducts,
        requirementTemplate: template,
        subject: inquiry.subject,
        sourceChannel: inquiry.source_channel,
        userConfirmedFields,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Extraction failed';
      await supabaseAdmin
        .from('inquiries')
        .update({ processing_status: 'FAILED', error_message: message, updated_at: new Date().toISOString() })
        .eq('id', inquiryId);
      result.error = message;
      steps.push('extraction failed');
      return result;
    }
    steps.push('extracted');

    await persistExtraction(companyId, inquiryId, extraction);

    const missingFields: MissingField[] = identifyMissingFields(extraction, template);
    const missing = missingFields.map((f) => ({ label: f.label, suggestion: f.suggestion }));
    result.missing = missing.map((m) => m.label);

    const parties = await resolveParties(
      companyId,
      firstEmail(inquiry.sender_email, conversation?.contact_email as string),
      (inquiry.sender_name as string) || (conversation?.contact_name as string) || null,
      extraction.customerCompany ?? null,
    );
    steps.push(`parties: contact=${!!parties.contactId} customer=${!!parties.customerId}`);

    const opportunityId = await upsertOpportunity(companyId, inquiry, extraction, parties);
    result.opportunityId = opportunityId;
    steps.push(`opportunity: ${opportunityId ? 'ok' : 'none'}`);

    const confidence = extraction.extractionConfidence ?? 0;
    const nextStatus = confidence >= 0.8 ? 'READY_FOR_RFQ' : 'NEEDS_REVIEW';
    await supabaseAdmin
      .from('inquiries')
      .update({
        processing_status: nextStatus,
        detected_language: extraction.originalLanguage ?? inquiry.detected_language ?? null,
        customer_id: parties.customerId,
        contact_id: parties.contactId,
        opportunity_id: opportunityId,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inquiryId);

    const currency =
      extraction.targetPriceCurrency || extraction.preferredCurrency || (conversation?.currency as string) || 'USD';

    if (conversation?.id) {
      await supabaseAdmin
        .from('conversations')
        .update({
          opportunity_id: opportunityId,
          product_summary: extraction.productName || conversation.product_summary || null,
          missing_info: result.missing,
          estimated_value: opportunityValue(extraction),
          currency,
          detected_language: extraction.originalLanguage ?? conversation.detected_language ?? null,
          next_action: missing.length > 0 ? 'Chase missing specs' : 'Prepare quote',
          next_action_due: missing.length > 0 ? daysFromNow(CHASE_INTERVAL_DAYS) : null,
          last_message_at: conversation.last_message_at ?? inquiry.received_at ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversation.id);
      steps.push('conversation updated');
    }

    // Big-deal ping — best effort, never blocks.
    try {
      const ping = await pingBigDeal({
        companyId,
        conversationId: conversation?.id as string | undefined,
        title: extraction.productName || (inquiry.subject as string) || 'New enquiry',
        value: opportunityValue(extraction),
        currency,
        priority: opportunityValue(extraction) != null && opportunityValue(extraction)! >= BIG_DEAL_MIN_VALUE ? 'high' : 'normal',
        stage: 'NEW',
      });
      steps.push(`whatsapp: ${ping.ok ? 'sent' : ping.skipped || ping.error || 'skipped'}`);
    } catch (err) {
      console.error('[intake] whatsapp ping failed:', err);
    }

    // Draft the spec chase and let the send policy decide.
    if (missing.length > 0 && conversation?.id) {
      const recipient = firstEmail(conversation.contact_email as string, inquiry.sender_email);
      const body = buildChaseDraft({
        sender: (conversation.contact_name as string) || inquiry.sender_name || null,
        productSummary: extraction.productName || (inquiry.subject as string) || null,
        missing,
        step: 1,
      });
      const subject = `Re: ${inquiry.subject || extraction.productName || 'your enquiry'}`;
      const verdict = classifyOutbound(body);
      result.chase.drafted = true;

      const { data: company } = await supabaseAdmin
        .from('companies')
        .select('follow_up_auto_send')
        .eq('id', companyId)
        .maybeSingle();
      const autoEnabled = company?.follow_up_auto_send !== false;
      const paused = conversation.status === 'ai_paused' || conversation.status === 'human';

      if (verdict.policy === 'auto' && autoEnabled && !paused && recipient) {
        const send = await sendOutbound({
          companyId,
          conversationId: conversation.id as string,
          inquiryId,
          to: recipient,
          subject,
          body,
          aiGenerated: true,
          aiReasoning: 'Auto spec chase (policy: auto)',
        });
        result.chase.sent = send.ok;
        result.chase.pending = !send.ok;
        result.chase.draftId = send.draftId;
        steps.push(send.ok ? 'chase auto-sent' : `chase pending: ${send.code || send.error}`);
      } else {
        const draft = await createDraft({
          companyId,
          conversationId: conversation.id as string,
          inquiryId,
          to: recipient ?? '',
          subject,
          body,
          aiGenerated: true,
          aiReasoning: verdict.policy === 'auto' ? 'Auto chase held (paused/disabled/unconfigured)' : `Gated: ${verdict.reasons.join(', ')}`,
          status: 'pending_approval',
        });
        result.chase.pending = true;
        result.chase.draftId = draft?.id;
        steps.push('chase gated to approval');
      }
    }

    result.ok = true;
    return result;
  } catch (err) {
    console.error('[intake] unexpected error:', err);
    result.error = err instanceof Error ? err.message : 'unknown';
    return result;
  }
}
