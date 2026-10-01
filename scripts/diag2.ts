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
const sb = createClient(url!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const demo = '347c863e-e49b-4654-b66e-959b50efbf58';
async function main() {
  const { data: convs, error: ce } = await sb.from('conversations').select('id,contact_name,contact_email,channel,status,created_at,updated_at,company_id').eq('company_id', demo).order('updated_at', { ascending: false });
  console.log('demo conversations:', ce ? `ERR ${ce.message}` : convs?.length);
  for (const c of (convs || []).slice(0, 12)) console.log('  -', String(c.id).slice(0, 8), '|', c.channel, '|', c.status, '| name:', c.contact_name || 'NULL', '| email:', c.contact_email || 'NULL', '| updated:', c.updated_at);
  const { count: all } = await sb.from('conversations').select('id', { count: 'exact', head: true });
  const { data: users } = await sb.from('users').select('id,email,company_id,role').eq('email', 'demo@broadust.io');
  console.log('demo user row:', JSON.stringify(users));
  console.log('total conversations:', all);
  const { data: opps } = await sb.from('opportunities').select('id,title,stage,estimated_order_value,currency,company_id').eq('company_id', demo).order('created_at', { ascending: false }).limit(6);
  console.log('demo opportunities:', opps?.length || 0);
  for (const o of (opps || [])) console.log('   -', o.title, '|', o.stage, '|', o.estimated_order_value, o.currency);
}
main().catch((e) => { console.error('failed:', e.message); process.exit(1); });
