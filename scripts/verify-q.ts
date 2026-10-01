#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
const ROOT = join(import.meta.dirname || __dirname, '..');
const env: Record<string, string> = {};
if (existsSync(join(ROOT, '.env.local'))) for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) { const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ''); }
const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  const supabase = createClient(url!, key!, { auth: { persistSession: false } });
  const oppId = 'e9a78254-1f8a-46ae-a648-02992096e308';
  const companyId = '99b52405-c9f2-4ac0-bf7e-69b10c3cfea5';
  const { data: qsCols, error: colsErr } = await supabase.from('quotes').select('id, quote_number, status, currency, total').eq('company_id', companyId).limit(10);
  console.log('quotes by company:', colsErr ? 'ERR ' + colsErr.message : JSON.stringify(qsCols));
  const { data: qs2, error: e2 } = await supabase.from('quotes').select('*').eq('opportunity_id', oppId);
  console.log('quotes by opp:', e2 ? 'ERR ' + e2.message : JSON.stringify(qs2).slice(0, 800));
  const { data: t } = await supabase.from('conversation_ai_tracking').select('*').limit(5);
  console.log('ai_tracking exists?', JSON.stringify(t).slice(0, 300));
}

main().catch((e) => { console.error('FAILED', e.message || e); process.exit(1); });
