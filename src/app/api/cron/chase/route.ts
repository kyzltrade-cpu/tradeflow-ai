/**
 * Cron: spec-chase timer.
 *
 * GET /api/cron/chase
 *
 * Follow-up is a timer, not a page. Any thread that is waiting on the buyer and
 * has been silent for CHASE_INTERVAL_DAYS gets one short, different-angled chase
 * that references the outstanding specs, then the clock resets. Routine chases
 * (no numbers/terms/commitments) send automatically under the send policy;
 * anything gated is left as a one-tap draft. After COLD_AFTER_CHASES unanswered
 * nudges the thread is left to go cold.
 *
 * Call via Vercel Cron, daily:
 *   vercel.json → { "crons": [{ "path": "/api/cron/chase", "schedule": "0 2 * * *" }] }
 *
 * Protected by CRON_SECRET (Bearer token).
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { buildChaseDraft } from '@/lib/chase-draft';
import { classifyOutbound } from '@/lib/send-policy';
import { sendOutbound, createDraft } from '@/lib/outbound';
import { deriveThread, COLD_AFTER_CHASES, type ThreadMessage } from '@/lib/thread-state';

const CRON_SECRET = process.env.CRON_SECRET;

const CHASE_INTERVAL_DAYS = 3;
const MS_PER_DAY = 86_400_000;
const SKIP_STATUSES = new Set(['ai_paused', 'human', 'closed', 'archived', 'resolved']);

function verifyCron(req: NextRequest): boolean {
  if (!CRON_SECRET) {
    console.warn('[cron/chase] CRON_SECRET not set — rejecting cron trigger');
    return false;
  }
  return req.headers.get('authorization') === `Bearer ${CRON_SECRET}`;
}

function timeOf(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

interface ConversationRow {
  id: string;
  company_id: string;
  status: string | null;
  contact_name: string | null;
  contact_email: string | null;
  subject: string | null;
  product_summary: string | null;
  missing_info: unknown;
  opportunity_id: string | null;
  next_action_due: string | null;
  last_message_at: string | null;
  created_at: string | null;
}

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const cutoff = new Date(now - CHASE_INTERVAL_DAYS * MS_PER_DAY).toISOString();

  const { data: convRows, error: convError } = await supabaseAdmin
    .from('conversations')
    .select(
      'id, company_id, status, contact_name, contact_email, subject, product_summary, missing_info, opportunity_id, next_action_due, last_message_at, created_at',
    )
    .lt('last_message_at', cutoff)
    .order('last_message_at', { ascending: true })
    .limit(300);

  if (convError) {
    console.error('[cron/chase] conversation fetch failed:', convError.message);
    return NextResponse.json({ error: convError.message }, { status: 500 });
  }

  const conversations = (convRows ?? []) as ConversationRow[];
  if (conversations.length === 0) {
    return NextResponse.json({ ok: true, scanned: 0, sent: 0, drafted: 0, skipped: 0 });
  }

  const ids = conversations.map((c) => c.id);
  const companyIds = Array.from(new Set(conversations.map((c) => c.company_id)));

  const [messagesRes, draftsRes, oppsRes, companiesRes] = await Promise.all([
    supabaseAdmin
      .from('messages')
      .select('id, conversation_id, role, kind, content, subject, status, created_at')
      .in('conversation_id', ids),
    supabaseAdmin
      .from('outbound_messages')
      .select('conversation_id, draft_status')
      .in('conversation_id', ids)
      .in('draft_status', ['draft', 'pending_approval']),
    supabaseAdmin
      .from('opportunities')
      .select('id, stage')
      .in('company_id', companyIds),
    supabaseAdmin
      .from('companies')
      .select('id, follow_up_auto_send')
      .in('id', companyIds),
  ]);

  const messagesByConv = new Map<string, ThreadMessage[]>();
  for (const m of (messagesRes.data ?? []) as Array<ThreadMessage & { conversation_id: string }>) {
    const list = messagesByConv.get(m.conversation_id) ?? [];
    list.push(m);
    messagesByConv.set(m.conversation_id, list);
  }

  const pendingByConv = new Set<string>();
  for (const d of (draftsRes.data ?? []) as Array<{ conversation_id: string | null }>) {
    if (d.conversation_id) pendingByConv.add(d.conversation_id);
  }

  const stageById = new Map<string, string | null>();
  for (const o of (oppsRes.data ?? []) as Array<{ id: string; stage: string | null }>) {
    stageById.set(o.id, o.stage);
  }

  const autoByCompany = new Map<string, boolean>();
  for (const c of (companiesRes.data ?? []) as Array<{ id: string; follow_up_auto_send: boolean | null }>) {
    // Fail safe: opt-in only. NULL/missing previously meant "auto-send on".
        autoByCompany.set(c.id, c.follow_up_auto_send === true);
  }

  let sent = 0;
  let drafted = 0;
  let skipped = 0;
  const details: Array<{ id: string; action: string; reason?: string }> = [];

  for (const conv of conversations) {
    if (conv.status && SKIP_STATUSES.has(conv.status.toLowerCase())) {
      skipped += 1;
      continue;
    }

    const messages = messagesByConv.get(conv.id) ?? [];
    const d = deriveThread({
      conversation: conv,
      messages,
      hasPendingDraft: pendingByConv.has(conv.id),
      opportunity: conv.opportunity_id ? { stage: stageById.get(conv.opportunity_id) ?? null } : null,
      now: new Date(now),
    });

    if (d.state !== 'waiting_on_buyer' || d.paused || d.cold || d.chaseCount >= COLD_AFTER_CHASES || d.needsYou) {
      skipped += 1;
      continue;
    }

    // Space chases at least CHASE_INTERVAL_DAYS apart measured from the last
    // message in either direction (the timer resets after each nudge).
    const lastMsgMs = Math.max(
      timeOf(d.lastInboundAt) ?? 0,
      timeOf(d.lastOutboundAt) ?? 0,
      timeOf(conv.last_message_at) ?? 0,
    );
    if (now - lastMsgMs < CHASE_INTERVAL_DAYS * MS_PER_DAY) {
      skipped += 1;
      continue;
    }

    const recipient = conv.contact_email;
    if (!recipient || !recipient.includes('@')) {
      skipped += 1;
      details.push({ id: conv.id, action: 'skip', reason: 'no_recipient' });
      continue;
    }

    const step = d.chaseCount + 1;
    const body = buildChaseDraft({
      sender: conv.contact_name,
      productSummary: conv.product_summary,
      missing: d.missing.map((label) => ({ label, suggestion: '' })),
      step,
    });
    const subject = `Re: ${conv.subject || conv.product_summary || 'your enquiry'}`;
    const verdict = classifyOutbound(body);
    const autoEnabled = autoByCompany.get(conv.company_id) !== false;

    if (verdict.policy === 'auto' && autoEnabled) {
      const result = await sendOutbound({
        companyId: conv.company_id,
        conversationId: conv.id,
        to: recipient,
        subject,
        body,
        aiGenerated: true,
        aiReasoning: `Auto spec chase (step ${step}, policy: auto)`,
      });
      if (result.ok) {
        sent += 1;
        details.push({ id: conv.id, action: 'sent', reason: `step ${step}` });
        await supabaseAdmin
          .from('conversations')
          .update({
            next_action: 'Chase missing specs',
            next_action_due: new Date(now + CHASE_INTERVAL_DAYS * MS_PER_DAY).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', conv.id);
      } else {
        drafted += 1;
        details.push({ id: conv.id, action: 'drafted', reason: result.code || result.error });
      }
    } else {
      const draft = await createDraft({
        companyId: conv.company_id,
        conversationId: conv.id,
        to: recipient,
        subject,
        body,
        aiGenerated: true,
        aiReasoning:
          verdict.policy === 'auto'
            ? 'Auto chase held (auto-send disabled)'
            : `Gated: ${verdict.reasons.join(', ')}`,
        status: 'pending_approval',
      });
      if (draft) {
        drafted += 1;
        details.push({ id: conv.id, action: 'drafted', reason: verdict.policy });
      } else {
        skipped += 1;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: conversations.length,
    sent,
    drafted,
    skipped,
    details: details.slice(0, 50),
  });
}
