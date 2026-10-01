#!/usr/bin/env tsx
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
const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  const supabase = createClient(url!, key!, { auth: { persistSession: false } });
  const convKey = 'partner@oceancoltd.com';
  const { data: conv } = await supabase
    .from('conversations')
    .select('id, company_id, opportunity_id, status')
    .eq('contact_email', convKey)
    .maybeSingle();
  if (!conv) { console.log('NO CONVERSATION'); return; }
  console.log('conversation', conv.id, '| company', conv.company_id, '| opp', conv.opportunity_id, '| status', conv.status);

  const { data: msgs } = await supabase.from('messages').select('role, content, created_at').eq('conversation_id', conv.id).order('created_at');
  console.log('messages:', msgs?.length);
  for (const m of msgs || []) console.log(' -', m.role, '::', String(m.content).slice(0, 100).replace(/\n/g, ' '));

  const { data: opps } = await supabase
    .from('opportunities')
    .select('id, title, status')
    .eq('company_id', conv.company_id)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(5);
  console.log('opportunities:', opps?.length);
  for (const o of opps || []) {
    console.log(' - opp', o.id, '|', o.title, '|', o.status);
    const { data: qs } = await supabase.from('quotes').select('id, quote_number, status').eq('opportunity_id', o.id);
    for (const q of qs || []) console.log('    quote', q.id, q.quote_number, q.status);
  }
}

main().catch((e) => { console.error('FAILED', e.message || e); process.exit(1); });
