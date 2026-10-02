/**
 * Outbound email: drafts, the send policy log, and the single send path.
 *
 * Every outbound message is recorded in `outbound_messages` first. Auto-sent
 * chases and human-approved replies both flow through `sendOutbound`, so there
 * is exactly one place where an email can leave the system and exactly one
 * place to audit what was sent and why.
 *
 * When the transport is not configured (no verified sender) the send is
 * refused and the row is kept as `pending_approval` so nothing is silently
 * dropped — it shows up under "Needs you" until an operator finishes setup or
 * sends it by hand.
 */

import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';

export type OutboundStatus = 'draft' | 'pending_approval' | 'sent' | 'failed';

export interface CreateDraftInput {
  companyId: string;
  conversationId: string;
  inquiryId?: string | null;
  quoteId?: string | null;
  to: string;
  subject: string;
  body: string;
  aiGenerated?: boolean;
  aiReasoning?: string | null;
  citations?: unknown;
  status?: OutboundStatus;
}

export interface OutboundRow {
  id: string;
  company_id: string;
  conversation_id: string | null;
  inquiry_id: string | null;
  quote_id: string | null;
  channel: string | null;
  to_address: string | null;
  subject: string | null;
  body: string | null;
  draft_status: string | null;
  ai_generated: boolean | null;
  ai_reasoning: string | null;
  error_message: string | null;
  created_at: string | null;
  sent_at: string | null;
}

export interface SendOutboundInput {
  companyId: string;
  conversationId: string;
  inquiryId?: string | null;
  quoteId?: string | null;
  to: string;
  subject: string;
  body: string;
  aiGenerated?: boolean;
  aiReasoning?: string | null;
  citations?: unknown;
  /** Set when a human tapped approve; omitted for policy-approved auto-sends. */
  approvedBy?: string | null;
}

export interface SendOutboundResult {
  ok: boolean;
  draftId?: string;
  messageId?: string;
  error?: string;
  code?: string;
  /** True when the send was skipped because no sender is configured. */
  pending?: boolean;
}

function textToHtml(body: string): string {
  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<div style="white-space:pre-wrap">${escaped.replace(/\n/g, '<br>')}</div>`;
}

export async function createDraft(input: CreateDraftInput): Promise<OutboundRow | null> {
  const { data, error } = await supabaseAdmin
    .from('outbound_messages')
    .insert({
      company_id: input.companyId,
      conversation_id: input.conversationId,
      inquiry_id: input.inquiryId ?? null,
      quote_id: input.quoteId ?? null,
      channel: 'email',
      to_address: input.to,
      subject: input.subject,
      body: input.body,
      body_html: textToHtml(input.body),
      draft_status: input.status ?? 'draft',
      ai_generated: input.aiGenerated ?? false,
      ai_reasoning: input.aiReasoning ?? null,
      citations: input.citations ?? null,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('[outbound] failed to create draft:', error?.message);
    return null;
  }
  return data as OutboundRow;
}

async function updateDraft(id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await supabaseAdmin.from('outbound_messages').update(patch).eq('id', id);
  if (error) console.error('[outbound] failed to update draft:', error.message);
}

/** Approve an existing draft and send it (one-tap from the inbox). */
export async function sendDraft(
  draft: OutboundRow,
  approvedBy: string | null,
): Promise<SendOutboundResult> {
  return deliver({
    companyId: draft.company_id,
    conversationId: draft.conversation_id ?? '',
    inquiryId: draft.inquiry_id,
    quoteId: draft.quote_id ?? undefined,
    to: draft.to_address ?? '',
    subject: draft.subject ?? '',
    body: draft.body ?? '',
    aiGenerated: draft.ai_generated ?? false,
    aiReasoning: draft.ai_reasoning,
    draftId: draft.id,
    approvedBy,
  });
}

/**
 * The one send path. Creates the audit row, sends, then logs the message into
 * the conversation thread so the inbox reflects what actually went out.
 */
export async function sendOutbound(input: SendOutboundInput): Promise<SendOutboundResult> {
  return deliver({ ...input, draftId: undefined });
}

async function deliver(
  input: SendOutboundInput & { draftId?: string },
): Promise<SendOutboundResult> {
  const now = new Date().toISOString();
  const { companyId, conversationId, to, subject, body } = input;

  let draftId = input.draftId;
  if (!draftId) {
    const draft = await createDraft({
      companyId,
      conversationId,
      inquiryId: input.inquiryId,
      quoteId: input.quoteId,
      to,
      subject,
      body,
      aiGenerated: input.aiGenerated,
      aiReasoning: input.aiReasoning,
      citations: input.citations,
      status: 'draft',
    });
    draftId = draft?.id;
  }

  if (!to || !to.includes('@')) {
    if (draftId) await updateDraft(draftId, { draft_status: 'failed', error_message: 'No valid recipient' });
    return { ok: false, draftId, error: 'No valid recipient', code: 'NO_RECIPIENT' };
  }

  const result = await sendEmail({ to, subject, html: textToHtml(body), companyId });

  if (!result.success) {
    if (draftId) {
      await updateDraft(draftId, {
        draft_status: 'pending_approval',
        error_message: result.error ?? 'Send failed',
      });
    }
    return { ok: false, draftId, error: result.error, code: result.code, pending: true };
  }

  const { data: message } = await supabaseAdmin
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: 'assistant',
      kind: 'sent',
      status: 'sent',
      subject,
      sender_email: result.from ?? null,
      recipient_email: to,
      content: body,
      tokens_used: 0,
      created_at: now,
    })
    .select('id')
    .single();

  if (draftId) {
    await updateDraft(draftId, {
      draft_status: 'sent',
      sent_at: now,
      approved_by: input.approvedBy ?? null,
      approved_at: input.approvedBy ? now : null,
      error_message: null,
    });
  }

  return { ok: true, draftId, messageId: message?.id };
}

/** Open drafts awaiting a human, newest first. */
export async function listPendingDrafts(companyId: string): Promise<OutboundRow[]> {
  const { data, error } = await supabaseAdmin
    .from('outbound_messages')
    .select('*')
    .eq('company_id', companyId)
    .in('draft_status', ['draft', 'pending_approval'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[outbound] listPendingDrafts failed:', error.message);
    return [];
  }
  return (data ?? []) as OutboundRow[];
}

export async function getDraft(id: string): Promise<OutboundRow | null> {
  const { data } = await supabaseAdmin.from('outbound_messages').select('*').eq('id', id).maybeSingle();
  return (data as OutboundRow) ?? null;
}

export async function discardDraft(id: string): Promise<void> {
  await updateDraft(id, { draft_status: 'failed', error_message: 'Discarded by operator' });
}
