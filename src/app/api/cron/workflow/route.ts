/**
 * Cron: Process workflow jobs
 *
 * GET /api/cron/workflow
 *
 * Picks up pending workflow_jobs rows and executes them.
 * Currently handles:
 *   - send_rfq_email: Sends an RFQ email to a supplier
 *
 * Call via Vercel Cron or scheduler:
 *   vercel.json → { "crons": [{ "path": "/api/cron/workflow", "schedule": "0,10,20,30,40,50 * * * *" }] }
 *
 * Protected by CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';

const CRON_SECRET = process.env.CRON_SECRET;

function verifyCron(req: NextRequest): boolean {
  if (!CRON_SECRET) {
    console.warn('[cron/workflow] CRON_SECRET not set — allowing request in dev');
    return true;
  }
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${CRON_SECRET}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkflowJob {
  id: string;
  company_id: string;
  job_type: string;
  entity_type: string | null;
  entity_id: string | null;
  status: string;
  payload: Record<string, unknown> | null;
  idempotency_key: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date().toISOString();

  // ── Fetch pending jobs ────────────────────────────────────────────
  const { data: jobs, error: fetchError } = await supabaseAdmin
    .from('workflow_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(25);

  if (fetchError) {
    console.error('[cron/workflow] Fetch error:', fetchError.message);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No pending jobs' });
  }

  let processed = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      // Mark as processing
      await supabaseAdmin
        .from('workflow_jobs')
        .update({ status: 'processing', started_at: now })
        .eq('id', job.id);

      const result = await processJob(job);

      if (result.success) {
        await supabaseAdmin
          .from('workflow_jobs')
          .update({
            status: 'completed',
            completed_at: now,
            result: result.data || null,
          })
          .eq('id', job.id);
        processed++;
      } else {
        await supabaseAdmin
          .from('workflow_jobs')
          .update({
            status: 'failed',
            completed_at: now,
            error_message: result.error || 'Unknown error',
          })
          .eq('id', job.id);
        failed++;
      }
    } catch (jobErr) {
      console.error(`[cron/workflow] Job ${job.id} error:`, jobErr);
      await supabaseAdmin
        .from('workflow_jobs')
        .update({
          status: 'failed',
          completed_at: now,
          error_message: jobErr instanceof Error ? jobErr.message : 'Unknown error',
        })
        .eq('id', job.id);
      failed++;
    }
  }

  return NextResponse.json({ processed, failed, total: jobs.length });
}

// ---------------------------------------------------------------------------
// Job processors
// ---------------------------------------------------------------------------

async function processJob(
  job: WorkflowJob
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  switch (job.job_type) {
    case 'send_rfq_email':
      return handleSendRfqEmail(job);
    default:
      return { success: false, error: `Unknown job type: ${job.job_type}` };
  }
}

async function handleSendRfqEmail(
  job: WorkflowJob
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  const payload = job.payload as {
    rfq_id?: string;
    rfq_number?: string;
    to_email?: string;
    to_name?: string;
    subject?: string;
    message_body?: string;
    supplier_name?: string;
    opportunity_title?: string;
    response_deadline?: string;
  } | null;

  if (!payload?.to_email || !payload?.subject || !payload?.message_body) {
    return { success: false, error: 'Missing required payload fields (to_email, subject, message_body)' };
  }

  // Fetch company name
  const { data: company } = await supabaseAdmin
    .from('companies')
    .select('name, email_sender_name')
    .eq('id', job.company_id)
    .single();

  const companyName = company?.name || 'TradeFlow';
  const deadline = payload.response_deadline
    ? new Date(payload.response_deadline).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Not specified';

  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">${companyName}</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Request for Quotation</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; color: #374151; font-size: 14px; line-height: 1.6;">Dear ${payload.to_name || 'Supplier'},</p>
              <p style="margin: 0 0 16px; color: #374151; font-size: 14px; line-height: 1.6;">We would like to request a quotation for the following. Please review the details and submit your best pricing.</p>
              ${payload.opportunity_title ? `<div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 20px;"><p style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">${payload.opportunity_title}</p></div>` : ''}
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px; width: 140px;">RFQ Number</td><td style="padding: 6px 0; color: #111827; font-size: 13px; font-weight: 600;">${payload.rfq_number || job.entity_id?.slice(0, 8) || 'N/A'}</td></tr>
                  <tr><td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Response Deadline</td><td style="padding: 6px 0; color: #111827; font-size: 13px; font-weight: 600;">${deadline}</td></tr>
                </table>
              </div>
              <div style="color: #374151; font-size: 14px; line-height: 1.7; margin-bottom: 24px;">${payload.message_body.replace(/\n/g, '<br>')}</div>
              <p style="margin: 0; color: #6b7280; font-size: 13px; text-align: center;">Please reply to this email with your quotation.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">${companyName} · Sent via TradeFlow AI</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const result = await sendEmail({
    to: payload.to_email,
    subject: payload.subject,
    html: emailHtml,
    from: company?.email_sender_name
      ? `${company.email_sender_name} <onboarding@resend.dev>`
      : undefined,
  });

  return {
    success: result.success,
    data: { email_id: result.id || null, recipient: payload.to_email },
    error: result.error || undefined,
  };
}
