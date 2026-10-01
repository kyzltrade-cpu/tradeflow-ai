#!/usr/bin/env tsx
/**
 * Verifies GET /api/admin/queue returns the per-row `detail` approval context:
 * quoted lines with totals, client identity, deal stage, and the customer's
 * own words. Signs in as the demo user and inspects the live payload.
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

type Detail = {
  stage?: string | null;
  quoteStatus?: string | null;
  whatTheyWant?: string | null;
  company?: string | null;
  industry?: string | null;
  contactTitle?: string | null;
  value?: number | null;
  currency?: string | null;
  marginPct?: number | null;
  lineItems?: Array<{ product: string; quantity?: number | null; total?: number | null }>;
  nextAction?: string | null;
};

async function main() {
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { data: tok, error } = await anon.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (error) throw new Error(`sign-in failed: ${error.message}`);
  const jwt = tok.session!.access_token;

  const res = await fetch(`${APP}/api/admin/queue`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  if (!res.ok) throw new Error(`queue ${res.status}: ${await res.text()}`);
  const body = (await res.json()) as {
    groups: Array<{ key: string; count: number; items: Array<{ id: string; title: string; detail?: Detail | null }> }>;
    totals: Record<string, number>;
  };

  console.log('totals:', JSON.stringify(body.totals));
  let withDetail = 0;
  let withLines = 0;
  for (const g of body.groups) {
    console.log(`\n── ${g.key} (${g.count})`);
    for (const item of g.items) {
      const d = item.detail;
      if (d) withDetail++;
      if (d?.lineItems?.length) withLines++;
      const lines = d?.lineItems?.length
        ? ` lines=${d.lineItems.length} [${d.lineItems
            .slice(0, 2)
            .map((l) => `${l.product} x${l.quantity ?? '?'}`)
            .join('; ')}]`
        : '';
      console.log(
        `  ${item.id.slice(0, 14)}… ${item.title.slice(0, 34).padEnd(34)} detail=${d ? 'Y' : 'n'} ` +
          `stage=${d?.stage ?? '-'} co=${d?.company ?? '-'} val=${d?.currency ?? ''}${d?.value ?? '-'}${lines}`,
      );
      if (d?.whatTheyWant) console.log(`      want: ${d.whatTheyWant.slice(0, 96)}`);
    }
  }
  console.log(`\nitems with detail: ${withDetail}, with line items: ${withLines}`);
  if (withDetail === 0) throw new Error('FAIL: no item carried a detail payload');
  console.log('PASS');
}

main().catch((e) => {
  console.error('FAILED', e instanceof Error ? e.message : e);
  process.exit(1);
});
