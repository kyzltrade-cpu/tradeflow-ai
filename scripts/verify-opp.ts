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
  const { data: opp, error } = await supabase.from('opportunities').select('*').eq('id', oppId).maybeSingle();
  console.log('OPP:', error ? 'ERR ' + error.message : JSON.stringify(opp, null, 2).slice(0, 1200));
  const { data: qs } = await supabase.from('quotes').select('id, quote_number, status, currency, total, items').eq('opportunity_id', oppId);
  console.log('QUOTES:', qs?.length);
  for (const q of qs || []) {
    console.log(' -', q.id, q.quote_number, q.status, q.currency, q.total);
    console.log('   items:', JSON.stringify(q.items).slice(0, 400));
  }
  const { data: track } = await supabase.from('conversation_ai_tracking').select('*').eq('conversation_id', 'dce2ea1c-37fe-4738-85c8-c5d159eb625e');
  console.log('AI TRACKING:', track?.length ? JSON.stringify(track).slice(0, 500) : 'none');
}

main().catch((e) => { console.error('FAILED', e.message || e); process.exit(1); });
