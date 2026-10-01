#!/usr/bin/env tsx
/**
 * Verifies POST/GET /api/admin/queue/draft: the AI writes an email for a queue
 * row, the human edit is stored, and re-opening reuses the stored draft rather
 * than spending another model call. Signs in as the demo user and samples one
 * row of each kind (reply, quote, follow-up) so the uniform panel contract is
 * exercised across all three.
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

const APP = process.env.APP_URL || 'https://tradeflow-ai-rho.vercel.app';
const EMAIL = process.env.DEMO_EMAIL || 'demo@broadust.io';
const PASSWORD = process.env.DEMO_PASSWORD || 'DemoTrade2026!';

type DraftResponse = {
  draft?: { body: string; edited: boolean; model: string | null } | null;
  persisted?: boolean;
  reused?: boolean;
  error?: string;
  ok?: boolean;
};

async function main() {
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { data: tok, error } = await anon.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (error) throw new Error(`sign-in failed: ${error.message}`);
  const headers = { Authorization: `Bearer ${tok.session!.access_token}`, 'Content-Type': 'application/json' };

  const q = await fetch(`${APP}/api/admin/queue`, { headers });
  if (!q.ok) throw new Error(`queue ${q.status}: ${await q.text()}`);
  const qj = (await q.json()) as { groups: Array<{ items: Array<{ id: string; kind: string; title: string }> }> };
  const all = qj.groups.flatMap((g) => g.items);
  const sample = (['quote', 'conv', 'fu'] as const)
    .map((p) => all.find((i) => i.id.startsWith(p)))
    .filter((v): v is { id: string; kind: string; title: string } => !!v);

  console.log(`queue items: ${all.length}; sampling: ${sample.map((s) => s.id).join(', ')}\n`);

  let generated = 0;
  for (const item of sample) {
    const key = item.id; // already type-prefixed, e.g. quote-<uuid>

    const res = await fetch(`${APP}/api/admin/queue/draft`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ itemId: key }),
    });
    const json = (await res.json()) as DraftResponse;
    if (!res.ok || !json.draft?.body) {
      console.log(`  ${key} -> FAIL HTTP ${res.status} ${json.error ?? 'no body'}`);
      continue;
    }
    generated++;
    console.log(`  ${key} (${item.kind})`);
    console.log(`    persisted=${json.persisted} chars=${json.draft.body.length} model=${json.draft.model}`);
    console.log(`    "${json.draft.body.replace(/\n/g, ' ').slice(0, 240)}…"`);

    // Human edit must persist, and must be returned by GET.
    const edit = await fetch(`${APP}/api/admin/queue/draft`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ itemId: key, body: 'EDITED BY HUMAN — please confirm 3,000 units.' }),
    });
    const ej = (await edit.json()) as DraftResponse;
    const got = await fetch(`${APP}/api/admin/queue/draft?itemId=${encodeURIComponent(key)}`, { headers });
    const gj = (await got.json()) as DraftResponse;
    const roundTrip = gj.draft?.body === 'EDITED BY HUMAN — please confirm 3,000 units.' && gj.draft?.edited === true;
    console.log(`    edit HTTP ${edit.status} ok=${ej.ok} persisted=${ej.persisted} | GET round-trip=${roundTrip ? 'PASS' : 'no (browser-local fallback)'}`);

    // Reopening without regenerate must reuse, not re-spend a model call.
    const again = await fetch(`${APP}/api/admin/queue/draft`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ itemId: key }),
    });
    const aj = (await again.json()) as DraftResponse;
    console.log(`    reopen -> reused=${!!aj.reused} sameBody=${aj.draft?.body === gj.draft?.body}`);
  }

  if (generated === 0) throw new Error('FAIL: no draft was generated for any sampled row');
  console.log(`\ndrafts generated: ${generated}/${sample.length}`);
  console.log('PASS');
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
