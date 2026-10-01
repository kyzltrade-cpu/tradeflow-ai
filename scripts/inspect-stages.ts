#!/usr/bin/env tsx
/** Inspects the real stage values and whether contacts link to customers. */
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

async function main() {
  const sb = createClient(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const { data: stages } = await sb.from('opportunities').select('stage');
  const counts = new Map<string, number>();
  for (const s of stages || []) {
    const v = String((s as { stage: string | null }).stage);
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  console.log('opportunity stage values:');
  for (const [v, n] of [...counts.entries()].sort()) console.log(`  ${JSON.stringify(v)} x${n}`);

  const { data: cols } = await sb.from('contacts').select('*').limit(1);
  console.log('\ncontact columns:', cols?.[0] ? Object.keys(cols[0]).join(', ') : '(none)');

  const { data: custCols } = await sb.from('customers').select('*').limit(1);
  console.log('customer columns:', custCols?.[0] ? Object.keys(custCols[0]).join(', ') : '(none)');

  const { data: convCols } = await sb.from('conversations').select('*').limit(1);
  console.log('conversation columns:', convCols?.[0] ? Object.keys(convCols[0]).join(', ') : '(none)');

  const { data: linked } = await sb
    .from('conversations')
    .select('id, opportunity_id')
    .not('opportunity_id', 'is', null);
  console.log(`\nconversations with opportunity_id: ${linked?.length ?? 0}`);
}

main().catch((e) => {
  console.error('FAILED', e instanceof Error ? e.message : e);
  process.exit(1);
});
