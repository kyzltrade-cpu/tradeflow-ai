/**
 * Follow-up automation engine for trading operations.
 *
 * Manages scheduled follow-up sequences for quotes and opportunities.
 * Uses NIM API for contextual message generation — never sends generic
 * "just following up" messages.
 */

import { supabaseAdmin } from "@/lib/supabase";
import type {
  FollowUpSequence,
  FollowUpItem,
  FollowUpStatus,
  SourceChannel,
} from "@/types/trading";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SequenceInput {
  companyId: string;
  opportunityId: string;
  quoteId?: string | null;
  channel?: SourceChannel;
  createdBy?: string | null;
}

export interface FollowUpContext {
  opportunityTitle: string;
  customerName: string;
  customerCompany?: string | null;
  productName?: string | null;
  quantity?: number | null;
  unit?: string | null;
  quoteTotal?: number | null;
  currency?: string | null;
  quoteSentAt?: string | null;
  daysSinceSent: number;
  stepNumber: number;
  previousStepsSummary?: string | null;
}

export interface DueFollowUp {
  itemId: string;
  sequenceId: string;
  companyId: string;
  opportunityId: string;
  channel: SourceChannel;
  scheduledFor: string;
  delayDays: number;
  stepNumber: number;
  messageType: string;
  subject: string | null;
  messageBody: string | null;
}

const NIM_BASE_URL = process.env.NIM_BASE_URL || "https://integrate.api.nvidia.com/v1";
const NIM_API_KEY = process.env.NIM_API_KEY!;
const NIM_MODEL = process.env.NIM_MODEL || "meta/llama-3.1-8b-instruct";

// ---------------------------------------------------------------------------
// Default sequence steps
// ---------------------------------------------------------------------------

const DEFAULT_STEPS: Array<{
  delayDays: number;
  messageType: string;
  subjectTemplate: string;
  bodyHint: string;
}> = [
  {
    delayDays: 3,
    messageType: "check_in",
    subjectTemplate: "Checking in on your inquiry",
    bodyHint:
      "A helpful check-in that references the specific product and requirements. " +
      "Ask if they need any additional information or clarification. " +
      "Do NOT say 'just following up' — mention something specific from the quote.",
  },
  {
    delayDays: 7,
    messageType: "needs_update",
    subjectTemplate: "Quick question about your requirements",
    bodyHint:
      "Ask whether their requirements or timeline have changed since the original inquiry. " +
      "Reference the specific product, quantity, and delivery expectations. " +
      "Offer to adjust the quote if anything has changed.",
  },
  {
    delayDays: 14,
    messageType: "value_add",
    subjectTemplate: "Additional options for your consideration",
    bodyHint:
      "Offer revised options, a sample arrangement, or clarification on specific line items. " +
      "Reference the quote details and suggest ways to move forward. " +
      "Mention any alternative products or pricing tiers if relevant.",
  },
  {
    delayDays: 21,
    messageType: "close",
    subjectTemplate: "Closing the loop on your inquiry",
    bodyHint:
      "A polite close/archive message. Acknowledge that they may have gone with another option, " +
      "and leave the door open for future inquiries. Reference the specific product " +
      "and let them know you're available if anything changes.",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86_400_000;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function fetchOpportunityContext(
  companyId: string,
  opportunityId: string,
): Promise<FollowUpContext> {
  const { data: opp } = await supabaseAdmin
    .from("opportunities")
    .select("title, customer_id, estimated_value, currency")
    .eq("id", opportunityId)
    .eq("company_id", companyId)
    .single();

  let customerName = "the customer";
  let customerCompany: string | null = null;

  if (opp?.customer_id) {
    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("name, company")
      .eq("id", opp.customer_id)
      .single();
    if (customer) {
      customerName = customer.name;
      customerCompany = customer.company;
    }
  }

  const { data: quote } = await supabaseAdmin
    .from("quotes")
    .select("id, sent_at, line_items")
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let productName: string | null = null;
  let quantity: number | null = null;
  let unit: string | null = null;
  let quoteSentAt: string | null = quote?.sent_at ?? null;

  if (quote?.line_items && Array.isArray(quote.line_items) && quote.line_items.length > 0) {
    const first = quote.line_items[0] as Record<string, unknown>;
    productName = (first.product_name as string) ?? (first.productName as string) ?? null;
    quantity = (first.quantity as number) ?? null;
    unit = (first.unit as string) ?? null;
  }

  const daysSinceSent = quoteSentAt
    ? daysBetween(new Date(quoteSentAt), new Date())
    : 0;

  return {
    opportunityTitle: opp?.title ?? "your inquiry",
    customerName,
    customerCompany,
    productName,
    quantity,
    unit,
    quoteTotal: opp?.estimated_value ?? null,
    currency: opp?.currency ?? "USD",
    quoteSentAt,
    daysSinceSent,
    stepNumber: 1,
  };
}

// ---------------------------------------------------------------------------
// 1. createDefaultSequence
// ---------------------------------------------------------------------------

export async function createDefaultSequence(
  params: SequenceInput,
): Promise<FollowUpSequence> {
  const now = new Date();
  const channel = params.channel ?? "email";

  const { data: sequence, error: seqErr } = await supabaseAdmin
    .from("follow_up_sequences")
    .insert({
      company_id: params.companyId,
      opportunity_id: params.opportunityId,
      quote_id: params.quoteId ?? null,
      status: "active",
      channel,
      created_by: params.createdBy ?? null,
    })
    .select("*")
    .single();

  if (seqErr) throw new Error(`Failed to create sequence: ${seqErr.message}`);

  const items: Array<{
    sequence_id: string;
    company_id: string;
    step_number: number;
    delay_days: number;
    scheduled_for: string;
    status: FollowUpStatus;
    message_type: string;
    subject: string;
    message_body: string | null;
  }> = DEFAULT_STEPS.map((step) => ({
    sequence_id: sequence.id,
    company_id: params.companyId,
    step_number: step.delayDays, // step_number maps to delay_days for ordering
    delay_days: step.delayDays,
    scheduled_for: addDays(now, step.delayDays).toISOString(),
    status: "scheduled" as FollowUpStatus,
    message_type: step.messageType,
    subject: step.subjectTemplate,
    message_body: null, // generated on-demand via NIM
  }));

  const { data: insertedItems, error: itemsErr } = await supabaseAdmin
    .from("follow_up_items")
    .insert(items)
    .select("*");

  if (itemsErr) throw new Error(`Failed to create sequence items: ${itemsErr.message}`);

  return {
    id: sequence.id,
    opportunityId: sequence.opportunity_id,
    name: `Follow-up for ${params.opportunityId.slice(0, 8)}`,
    isActive: sequence.status === "active",
    triggerCondition: "quote_sent",
    triggerValue: params.quoteId ?? null,
    items: (insertedItems ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      sequenceId: row.sequence_id as string,
      stepOrder: row.step_number as number,
      delayDays: row.delay_days as number,
      channel,
      templateId: null,
      subject: row.subject as string | null,
      bodyTemplate: row.message_body as string | null,
      status: row.status as FollowUpStatus,
      scheduledFor: row.scheduled_for as string | null,
      sentAt: null,
      completedAt: null,
      cancelledAt: null,
      cancelReason: null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    })),
    createdAt: sequence.created_at,
    updatedAt: sequence.updated_at,
  };
}

// ---------------------------------------------------------------------------
// 2. pauseSequence
// ---------------------------------------------------------------------------

export async function pauseSequence(
  sequenceId: string,
  companyId: string,
  userId: string,
): Promise<void> {
  const now = new Date().toISOString();

  await supabaseAdmin
    .from("follow_up_sequences")
    .update({
      status: "paused",
      paused_by: userId,
      paused_at: now,
      updated_at: now,
    })
    .eq("id", sequenceId)
    .eq("company_id", companyId);

  await supabaseAdmin
    .from("follow_up_items")
    .update({ status: "cancelled" as FollowUpStatus, updated_at: now })
    .eq("sequence_id", sequenceId)
    .eq("company_id", companyId)
    .eq("status", "scheduled");
}

// ---------------------------------------------------------------------------
// 3. resumeSequence
// ---------------------------------------------------------------------------

export async function resumeSequence(
  sequenceId: string,
  companyId: string,
): Promise<void> {
  const now = new Date();

  const { data: sequence } = await supabaseAdmin
    .from("follow_up_sequences")
    .select("paused_at")
    .eq("id", sequenceId)
    .eq("company_id", companyId)
    .single();

  if (!sequence) throw new Error("Sequence not found");

  const pausedAt = sequence.paused_at ? new Date(sequence.paused_at) : now;
  const pausedDays = daysBetween(pausedAt, now);

  const { data: cancelledItems } = await supabaseAdmin
    .from("follow_up_items")
    .select("id, delay_days")
    .eq("sequence_id", sequenceId)
    .eq("company_id", companyId)
    .eq("status", "cancelled");

  if (cancelledItems && cancelledItems.length > 0) {
    const updates = cancelledItems.map(
      (item: { id: string; delay_days: number }) => ({
        id: item.id,
        status: "scheduled" as FollowUpStatus,
        scheduled_for: addDays(now, item.delay_days).toISOString(),
        updated_at: now.toISOString(),
      }),
    );

    await supabaseAdmin
      .from("follow_up_items")
      .upsert(updates, { onConflict: "id" });
  }

  await supabaseAdmin
    .from("follow_up_sequences")
    .update({
      status: "active",
      paused_by: null,
      paused_at: null,
      updated_at: now.toISOString(),
    })
    .eq("id", sequenceId)
    .eq("company_id", companyId);
}

// ---------------------------------------------------------------------------
// 4. cancelSequence
// ---------------------------------------------------------------------------

export async function cancelSequence(
  sequenceId: string,
  companyId: string,
  reason: string,
): Promise<void> {
  const now = new Date().toISOString();

  await supabaseAdmin
    .from("follow_up_sequences")
    .update({
      status: "cancelled",
      completed_at: now,
      updated_at: now,
    })
    .eq("id", sequenceId)
    .eq("company_id", companyId);

  await supabaseAdmin
    .from("follow_up_items")
    .update({
      status: "cancelled" as FollowUpStatus,
      cancelled_reason: reason,
      updated_at: now,
    })
    .eq("sequence_id", sequenceId)
    .eq("company_id", companyId)
    .eq("status", "scheduled");
}

// ---------------------------------------------------------------------------
// 5. skipStep
// ---------------------------------------------------------------------------

export async function skipStep(
  itemId: string,
  companyId: string,
): Promise<void> {
  const now = new Date().toISOString();

  await supabaseAdmin
    .from("follow_up_items")
    .update({
      status: "cancelled" as FollowUpStatus,
      cancelled_reason: "Skipped by user",
      updated_at: now,
    })
    .eq("id", itemId)
    .eq("company_id", companyId);
}

// ---------------------------------------------------------------------------
// 6. rescheduleStep
// ---------------------------------------------------------------------------

export async function rescheduleStep(
  itemId: string,
  newDate: Date,
  companyId: string,
): Promise<void> {
  const now = new Date().toISOString();

  await supabaseAdmin
    .from("follow_up_items")
    .update({
      scheduled_for: newDate.toISOString(),
      updated_at: now,
    })
    .eq("id", itemId)
    .eq("company_id", companyId)
    .eq("status", "scheduled");
}

// ---------------------------------------------------------------------------
// 7. stopOnReply
// ---------------------------------------------------------------------------

export async function stopOnReply(
  sequenceId: string,
  companyId: string,
): Promise<void> {
  const now = new Date().toISOString();

  await supabaseAdmin
    .from("follow_up_items")
    .update({
      status: "cancelled" as FollowUpStatus,
      cancelled_reason: "Customer replied — stopping follow-up",
      updated_at: now,
    })
    .eq("sequence_id", sequenceId)
    .eq("company_id", companyId)
    .eq("status", "scheduled");

  await supabaseAdmin
    .from("follow_up_sequences")
    .update({
      status: "completed",
      completed_at: now,
      updated_at: now,
    })
    .eq("id", sequenceId)
    .eq("company_id", companyId);
}

// ---------------------------------------------------------------------------
// 8. stopOnOutcome
// ---------------------------------------------------------------------------

export async function stopOnOutcome(
  sequenceId: string,
  outcome: "accepted" | "rejected" | "expired" | "won" | "lost",
  companyId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const reason = `Opportunity outcome: ${outcome}`;

  await supabaseAdmin
    .from("follow_up_items")
    .update({
      status: "cancelled" as FollowUpStatus,
      cancelled_reason: reason,
      updated_at: now,
    })
    .eq("sequence_id", sequenceId)
    .eq("company_id", companyId)
    .eq("status", "scheduled");

  await supabaseAdmin
    .from("follow_up_sequences")
    .update({
      status: "completed",
      completed_at: now,
      updated_at: now,
    })
    .eq("id", sequenceId)
    .eq("company_id", companyId);
}

// ---------------------------------------------------------------------------
// 9. getDueFollowUps
// ---------------------------------------------------------------------------

export async function getDueFollowUps(
  companyId: string,
): Promise<DueFollowUp[]> {
  const now = new Date().toISOString();

  const { data: items, error } = await supabaseAdmin
    .from("follow_up_items")
    .select(`
      id,
      sequence_id,
      company_id,
      step_number,
      delay_days,
      scheduled_for,
      status,
      message_type,
      subject,
      message_body,
      follow_up_sequences!inner (
        id,
        opportunity_id,
        channel,
        status
      )
    `)
    .eq("company_id", companyId)
    .eq("status", "scheduled")
    .lte("scheduled_for", now);

  if (error) throw new Error(`Failed to fetch due follow-ups: ${error.message}`);
  if (!items || items.length === 0) return [];

  return items
    .filter(
      (item: Record<string, unknown>) =>
        (item.follow_up_sequences as Record<string, unknown>)?.status === "active",
    )
    .map((item: Record<string, unknown>) => {
      const seq = item.follow_up_sequences as Record<string, unknown>;
      return {
        itemId: item.id as string,
        sequenceId: item.sequence_id as string,
        companyId: item.company_id as string,
        opportunityId: seq.opportunity_id as string,
          channel: (seq.channel as SourceChannel) ?? "email",
        scheduledFor: item.scheduled_for as string,
        delayDays: item.delay_days as number,
        stepNumber: item.step_number as number,
        messageType: item.message_type as string,
        subject: item.subject as string | null,
        messageBody: item.message_body as string | null,
      };
    });
}

// ---------------------------------------------------------------------------
// 10. generateFollowUpMessage
// ---------------------------------------------------------------------------

export async function generateFollowUpMessage(
  item: FollowUpItem,
  context: FollowUpContext,
): Promise<string> {
  const stepMeta = DEFAULT_STEPS.find((s) => s.delayDays === item.delayDays) ?? DEFAULT_STEPS[0];

  const systemPrompt = `You are a professional trading operations assistant generating a follow-up message.

RULES:
- NEVER use generic phrases like "just following up", "just checking in", or "wanted to touch base".
- ALWAYS reference specific details: product name, quantity, quote value, or original inquiry.
- Keep the tone professional but warm — like a real business partner.
- Be concise: 2-4 short paragraphs max.
- Offer a clear next step or question.
- Write in a clear, professional, warm email style.

STEP PURPOSE: ${stepMeta.bodyHint}`;

  const userPrompt = `Generate a follow-up message for this trading opportunity.

OPPORTUNITY: ${context.opportunityTitle}
CUSTOMER: ${context.customerName}${context.customerCompany ? ` at ${context.customerCompany}` : ""}
PRODUCT: ${context.productName ?? "N/A"}
${context.quantity ? `QUANTITY: ${context.quantity} ${context.unit ?? "units"}` : ""}
${context.quoteTotal ? `QUOTE VALUE: ${context.currency} ${context.quoteTotal.toLocaleString()}` : ""}
DAYS SINCE SENT: ${context.daysSinceSent}
STEP: ${context.stepNumber} of 4
${context.previousStepsSummary ? `\nPREVIOUS COMMUNICATION:\n${context.previousStepsSummary}` : ""}

Write the follow-up message. Subject line on the first line, then a blank line, then the body.`;

  try {
    const response = await fetch(`${NIM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${NIM_API_KEY}`,
      },
      body: JSON.stringify({
        model: NIM_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 512,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`NIM API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return buildFallbackMessage(item, context);
    }

    return content;
  } catch {
    return buildFallbackMessage(item, context);
  }
}

function buildFallbackMessage(
  item: FollowUpItem,
  ctx: FollowUpContext,
): string {
  const productRef = ctx.productName ? ` regarding ${ctx.productName}` : "";
  const quantityRef = ctx.quantity ? ` (${ctx.quantity} ${ctx.unit ?? "units"})` : "";
  const valueRef = ctx.quoteTotal
    ? ` We quoted ${ctx.currency} ${ctx.quoteTotal.toLocaleString()} for this order.`
    : "";

  switch (item.stepOrder) {
    case 1:
      return `Subject: Checking in${productRef}\n\nHi ${ctx.customerName},\n\nI wanted to reach out about your inquiry${productRef}${quantityRef}.\nDo you have any questions about the quote we sent, or is there anything I can clarify?\n\nHappy to help.`;
    case 2:
      return `Subject: Any updates on your requirements?\n\nHi ${ctx.customerName},\n\nIt's been about a week since we sent the quote${productRef}.${valueRef}\nHave your requirements or timeline changed? I can adjust the quote if needed.\n\nLet me know.`;
    case 3:
      return `Subject: Additional options${productRef}\n\nHi ${ctx.customerName},\n\nI wanted to share some additional options that might work for you${productRef}.\nWe can also arrange samples or adjust specifications if that would help.\n\nWould any of these be useful?`;
    case 4:
      return `Subject: Closing the loop${productRef}\n\nHi ${ctx.customerName},\n\nI haven't heard back${productRef}, so I'll assume you've found another solution — no worries at all.\nIf anything changes, I'm here to help.\n\nWishing you all the best.`;
    default:
      return `Subject: Following up${productRef}\n\nHi ${ctx.customerName},\n\nI wanted to check in about your inquiry.${valueRef}\nLet me know if there's anything I can do.\n\nBest regards.`;
  }
}
