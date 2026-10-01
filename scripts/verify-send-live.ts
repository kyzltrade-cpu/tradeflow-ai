#!/usr/bin/env tsx
/**
 * Proves the follow-up send path works against PRODUCTION, without emailing a
 * real customer and without leaving anything behind.
 *
 * The problem: every send route in this app fails loudly when no sending
 * address is configured, but "fails loudly" is not the same as "works", and
 * shipping a Send button without knowing is how you find out at the worst
 * moment. The only honest way to know is to send something.
 *
 * How this stays safe:
 *   - a throwaway follow-up item is created directly via the service role,
 *     scheduled far in the future so the 02:00 cron can never pick it up
 *   - it is sent to Resend's own test address (delivered@resend.dev), which
 *     is delivered and reaches no human
 *   - the item is deleted in a finally block, and the script exits non-zero if
 *     the delete fails, so a leftover row is visible rather than silent
 *
 * Run: APP_URL=https://tradeflow-ai-rho.vercel.app npx tsx scripts/verify-send-live.ts
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname || __dirname, '..');
if (existsSync(join(ROOT, '.env.local'))) {
  for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const APP = process.env.APP_URL || 'https://tradeflow-ai-rho.vercel.app';
const EMAIL = process.env.DEMO_EMAIL || 'demo@broadust.io';
const PASSWORD = process.env.DEMO_PASSWORD || 'DemoTrade2026!';
const TEST_BOX = 'delivered@resend.dev';
const MARKER = `send-path-check-${Date.now()}`;

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

let tempItemId: string | null = null;

async function cleanup() {
  if (!tempItemId) return;
  const { error } = await admin.from('follow_up_items').delete().eq('id', tempItemId);
  if (error) {
    console.error(`\nCLEANUP FAILED — remove follow_up_items row ${tempItemId} manually: ${error.message}`);
    process.exitCode = 1;
  } else {
    console.log(`\ncleaned up temp item ${tempItemId}`);
    tempItemId = null;
  }
}

async function main() {
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data: tok, error: signIn } = await anon.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (signIn) throw new Error(`sign-in failed: ${signIn.message}`);
  const authed = {
    Authorization: `Bearer ${tok.session!.access_token}`,
    'Content-Type': 'application/json',
  };

  // Resolve the company from the signed-in user rather than hardcoding an id,
  // so this keeps working on any tenant instead of one seeded demo.
  const { data: user, error: userErr } = await admin
    .from('users')
    .select('company_id')
    .eq('email', EMAIL)
    .maybeSingle();
  const companyId = user?.company_id;
  if (userErr || !companyId) throw new Error(`could not resolve a company for ${EMAIL}`);

  // Borrow a real active sequence so ownership and the resolver both have to
  // work exactly as they do in production.
  const { data: seq, error: seqErr } = await admin
    .from('follow_up_sequences')
    .select('id, opportunity_id, company_id')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .not('opportunity_id', 'is', null)
    .limit(1)
    .maybeSingle();
  if (seqErr || !seq) throw new Error(`no active sequence to borrow: ${seqErr?.message ?? 'none'}`);

  const { data: item, error: insErr } = await admin
    .from('follow_up_items')
    .insert({
      company_id: seq.company_id,
      sequence_id: seq.id,
      subject: MARKER,
      step_number: 1,
      delay_days: 0,
      message_type: 'check_in',
      // Far future: the 02:00 cron must never see this row, even if the
      // cleanup below fails.
      scheduled_for: '2099-01-01T00:00:00.000Z',
      status: 'scheduled',
    })
    .select('id')
    .single();
  if (insErr) throw new Error(`could not create temp item: ${insErr.message}`);
  tempItemId = item.id;
  console.log(`temp item ${tempItemId} on sequence ${seq.id}`);

  // 1. The real thing: signed in, real route, real Resend account, test box.
  const res = await fetch(`${APP}/api/admin/follow-ups/${seq.id}/items/${item.id}/send`, {
    method: 'POST',
    headers: authed,
    body: JSON.stringify({
      body: `Send-path check ${MARKER}. Safe to delete.`,
      subject: MARKER,
      recipient_email: TEST_BOX,
    }),
  });
  const json = await res.json().catch(() => ({}));
  console.log(`\nsend -> ${res.status} ${JSON.stringify(json)}`);

  if (res.status !== 200) {
    console.log('\nFAIL — production cannot send email. Every Send button will refuse.');
    console.log('Fix: set RESEND_API_KEY / EMAIL_FROM_ADDRESS in Vercel Production.');
    process.exitCode = 1;
    return;
  }
  if (json.sent !== true || json.recipient !== TEST_BOX) {
    console.log('\nFAIL — route reported success but not for the test box.');
    process.exitCode = 1;
    return;
  }

  // 2. The status write is what stops cron re-sending. Prove it landed.
  const { data: after } = await admin
    .from('follow_up_items')
    .select('status, sent_at, subject, message_body')
    .eq('id', item.id)
    .single();
  console.log(`row after send -> ${JSON.stringify(after)}`);

  const ok =
    after?.status === 'sent' &&
    typeof after?.sent_at === 'string' &&
    after?.message_body === `Send-path check ${MARKER}. Safe to delete.`;

  if (!ok) {
    console.log('\nFAIL — the email sent but the row was not marked sent. Cron would send it again.');
    process.exitCode = 1;
    return;
  }

  console.log('\nPASS — production sends, and the row is marked sent.');
}

main()
  .catch((e) => {
    console.error('verify failed:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
  });
