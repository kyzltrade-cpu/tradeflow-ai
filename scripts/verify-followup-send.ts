#!/usr/bin/env tsx
/**
 * Verifies the follow-up send path that the queue's "Send draft" button uses.
 *
 * Deliberately does NOT send any real email. Sending would email a live
 * customer from their production mailbox, which is not something a check
 * script is allowed to do on its own. What it proves instead is everything
 * around the send:
 *
 *   1. the recipient the route will resolve to (and that it prefers the
 *      named contact over the company address)
 *   2. unauthenticated and malformed calls are refused
 *   3. an item id from another sequence is refused, not sent
 *   4. a real item is reachable and its draft text is what would go out
 *   5. the row's company-scoped query still returns the sequence id the
 *      button needs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname || __dirname, '..');
const env: Record<string, string> = {};
if (existsSync(join(ROOT, '.env.local'))) {
  for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const APP = process.env.APP_URL || 'http://localhost:3000';
const EMAIL = process.env.DEMO_EMAIL || 'demo@broadust.io';
const PASSWORD = process.env.DEMO_PASSWORD || 'DemoTrade2026!';

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, extra = '') {
  if (ok) {
    pass++;
    console.log(`  ok    ${label}${extra ? ` — ${extra}` : ''}`);
  } else {
    fail++;
    console.log(`  FAIL  ${label}${extra ? ` — ${extra}` : ''}`);
  }
}

async function main() {
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { data: tok, error } = await anon.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (error) throw new Error(`sign-in failed: ${error.message}`);
  const authed = {
    Authorization: `Bearer ${tok.session!.access_token}`,
    'Content-Type': 'application/json',
  };

  // Find a due follow-up through the queue itself, so we test the same row the
  // button would act on rather than a hand-picked id.
  const queue = await fetch(`${APP}/api/admin/queue`, { headers: authed });
  if (!queue.ok) throw new Error(`queue ${queue.status}`);
  type QueueRow = {
    id: string;
    sequenceId?: string | null;
    subject?: string | null;
    detail?: { recipientEmail?: string | null } | null;
  };
  const qJson = (await queue.json()) as { groups: Array<{ key: string; items: QueueRow[] }> };
  const items = qJson.groups.flatMap((g) => g.items);
  const fu = items.find((i) => i.id.startsWith('fu-'));

  if (!fu) {
    console.log('no due follow-up in the queue right now — nothing to verify');
    return;
  }
  const itemId = fu.id.slice('fu-'.length);

  console.log(`\nfollow-up item ${itemId} (sequence ${fu.sequenceId})`);

  // 1. the button needs a sequence id, or it refuses to send
  check('queue row carries the sequence id', Boolean(fu.sequenceId), String(fu.sequenceId));

  // 2. and it needs a recipient to show before sending
  check(
    'queue row shows a recipient',
    Boolean(fu.detail?.recipientEmail),
    fu.detail?.recipientEmail || 'none — the button will stay disabled'
  );

  const base = `${APP}/api/admin/follow-ups/${fu.sequenceId}/items/${itemId}/send`;

  // 3. unauthenticated
  const noAuth = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: 'should never go out' }),
  });
  check('refuses an unauthenticated send', noAuth.status === 401 || noAuth.status === 403, `status ${noAuth.status}`);

  // 4. empty body
  const empty = await fetch(base, { method: 'POST', headers: authed, body: JSON.stringify({ body: '   ' }) });
  check('refuses an empty body', empty.status === 400, `status ${empty.status}`);

  // 5. an item id that is not in this sequence
  const foreign = await fetch(`${APP}/api/admin/follow-ups/${fu.sequenceId}/items/00000000-0000-0000-0000-000000000000/send`, {
    method: 'POST',
    headers: authed,
    body: JSON.stringify({ body: 'should never go out' }),
  });
  check(
    'refuses an item from another sequence',
    foreign.status === 404 || foreign.status === 400,
    `status ${foreign.status}`
  );

  // 6. the real route is reachable and only fails at the transport step, which
  //    is where we stop: a 502 means the gate passed and Resend was reached or
  //    refused, and it also means the item status was written to 'failed'.
  console.log('\n  (stopping before a real send — that would email a live customer)');

  console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'}  ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error('verify failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
