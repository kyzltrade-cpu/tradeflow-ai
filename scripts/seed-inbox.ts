#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { DEMO_INBOX_SEEDS } from '../src/lib/demo-inbox-seeds';

const ROOT = join(import.meta.dirname || __dirname, '..');
const env: Record<string, string> = {};
if (existsSync(join(ROOT, '.env.local'))) {
  for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url!, key!, { auth: { persistSession: false } });

const COMPANY_ID = '99b52405-c9f2-4ac0-bf7e-69b10c3cfea5';
const NOW = Date.now();

async function main() {
  const { data: existing, error: countErr } = await supabase
    .from('conversations')
    .select('id')
    .eq('company_id', COMPANY_ID);
  if (countErr) throw countErr;
  if ((existing?.length ?? 0) >= 25) {
    console.log(`Already ${existing!.length} conversations — skipping seed.`);
    return;
  }

  const convRows: any[] = [];
  const msgRows: any[] = [];

  for (const seed of DEMO_INBOX_SEEDS) {
    const convId = randomUUID();
    const lastAt = new Date(NOW - seed.by).toISOString();
    convRows.push({
      id: convId,
      company_id: COMPANY_ID,
      channel: 'email',
      status: seed.status || 'active',
      contact_name: seed.name,
      contact_email: seed.email,
      detected_language: seed.lang,
      product_summary: seed.product_summary ?? null,
      estimated_value: seed.estimated_value ?? null,
      currency: seed.currency ?? 'USD',
      next_action: seed.next_action ?? null,
      missing_info: seed.missing ?? [],
      external_search_enabled: seed.lang === 'zh' || true,
      created_at: lastAt,
      updated_at: lastAt,
    });
    seed.thread.forEach((m, i) => {
      const createdAt = new Date(new Date(lastAt).getTime() - (seed.thread.length - 1 - i) * 5 * 60_000).toISOString();
      msgRows.push({
        id: randomUUID(),
        conversation_id: convId,
        role: m.role,
        content: m.text,
        created_at: createdAt,
      });
    });
  }

  for (const chunk of [convRows.slice(0, 6), convRows.slice(6)]) {
    const { error } = await supabase.from('conversations').insert(chunk);
    if (error) throw new Error(`conversations insert failed: ${error.message}\n${JSON.stringify(error)}`);
    console.log(`Inserted ${chunk.length} conversations`);
  }
  for (const chunk of [msgRows.slice(0, 30), msgRows.slice(30)]) {
    if (chunk.length === 0) continue;
    const { error } = await supabase.from('messages').insert(chunk);
    if (error) throw new Error(`messages insert failed: ${error.message}\n${JSON.stringify(error)}`);
    console.log(`Inserted ${chunk.length} messages`);
  }
  console.log('Seed complete.');
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});