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
async function main() {
  const bt = '99b52405-c9f2-4ac0-bf7e-69b10c3cfea5';
  const { data: prods, error: pe } = await sb.from('products').select('name,price_range,category').eq('company_id', bt);
  console.log('Broadust products:', pe ? `ERR ${pe.message}` : prods?.length);
  for (const p of (prods || []).slice(0, 12)) console.log('   -', p.name, '| price:', p.price_range || 'NULL', '|', p.category || '');
  const { data: sups, error: se } = await sb.from('suppliers').select('trading_name,is_approved').eq('company_id', bt).is('deleted_at', null);
  console.log('Broadust suppliers:', se ? `ERR ${se.message}` : sups?.length);
  const { data: settings, error: ste } = await sb.from('company_settings').select('pricing').eq('company_id', bt).maybeSingle();
  console.log('Broadust pricing:', ste ? `ERR ${ste.message}` : JSON.stringify(settings?.pricing));
  const { data: opps, error: oe } = await sb.from('opportunities').select('title,stage,estimated_order_value,currency').eq('company_id', bt).limit(6);
  console.log('Broadust opps:', oe ? `ERR ${oe.message}` : opps?.length);
  for (const o of (opps || [])) console.log('   -', o.title, '|', o.stage, '|', o.estimated_order_value, o.currency);
  const { data: users, error: ue } = await sb.from('users').select('id,email,company_id').eq('company_id', bt);
  console.log('Broadust users:', ue ? `ERR ${ue.message}` : JSON.stringify(users));
}
main().catch((e) => { console.error('failed:', e.message); process.exit(1); });
