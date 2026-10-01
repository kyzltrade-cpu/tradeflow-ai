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
  const { data: convs } = await sb.from('conversations').select('id,company_id,contact_name,contact_email,channel,status').order('updated_at', { ascending: false });
  const byCo: Record<string, number> = {};
  for (const c of convs || []) byCo[c.company_id] = (byCo[c.company_id] || 0) + 1;
  console.log('conversations grouped by company:', JSON.stringify(byCo, null, 2));
  const { data: companies } = await sb.from('companies').select('id,name');
  for (const co of companies || []) console.log('company:', co.id, co.name, '-> convs:', byCo[co.id] || 0);
  const demo = '9996084b-f593-489c-a177-455c550ccb60';
  const { data: prods, error: pe } = await sb.from('products').select('name,price_range,category').eq('company_id', demo);
  console.log('demo(9996) products:', pe ? `ERR ${pe.message}` : prods?.length);
  for (const p of (prods || []).slice(0, 12)) console.log('   -', p.name, '| price:', p.price_range || 'NULL', '|', p.category || '');
  const { data: sups, error: se } = await sb.from('suppliers').select('trading_name,product_capabilities,is_approved,deleted_at').eq('company_id', demo);
  console.log('demo(9996) suppliers:', se ? `ERR ${se.message}` : sups?.length);
  for (const s of (sups || []).slice(0, 8)) console.log('   -', s.trading_name, '| caps:', JSON.stringify(s.product_capabilities), '| approved:', s.is_approved, '| del:', s.deleted_at);
  const { data: settings, error: ste } = await sb.from('company_settings').select('pricing').eq('company_id', demo).maybeSingle();
  console.log('demo(9996) pricing settings:', ste ? `ERR ${ste.message}` : JSON.stringify(settings?.pricing));
  const { data: msgs, error: mse } = await sb.from('messages').select('conversation_id,role,content,created_at').in('conversation_id', (convs || []).filter(c=>c.company_id===demo).map(c=>c.id)).order('created_at', { ascending: true });
  console.log('demo(9996) messages:', mse ? `ERR ${mse.message}` : msgs?.length);
  for (const m of (msgs || []).slice(0, 10)) console.log('   -', String(m.conversation_id).slice(0, 8), '|', m.role, '|', String(m.content||'').slice(0, 70).replace(/\n/g, ' '));
}
main().catch((e) => { console.error('failed:', e.message); process.exit(1); });
