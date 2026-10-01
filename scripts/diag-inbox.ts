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
const sb = createClient(url!, key!, { auth: { persistSession: false } });

const columns = (t: string) =>
  sb.from(t).select('*').limit(0).then((r) => ({ error: r.error?.message, keys: r.data ? Object.keys(r.data) : [] }));

async function main() {
  console.log('project:', url);
  const conv = await columns('conversations');
  console.log('conversations.columns:', conv.error ? `ERR ${conv.error}` : conv.keys);
  let p1 = new Promise<string>((resolve) =>
    sb.from('conversations').select('count', { count: 'exact', head: true }).then((r) => resolve(`all=${r.count} err=${r.error?.message}`))
  );
  console.log('conversations.count:', await p1);

  const demo = '347c863e-e49b-4654-b66e-959b50efbf58';
  const { data: convs, error: ce } = await sb
    .from('conversations')
    .select('id,contact_name,contact_email,channel,status,created_at,updated_at,subject')
    .eq('company_id', demo)
    .order('updated_at', { ascending: false });
  console.log('demo conversations:', ce ? `ERR ${ce.message}` : convs?.length);
  for (const c of (convs || []).slice(0, 10)) {
    console.log('  -', String(c.id).slice(0, 8), '|', c.channel, '|', c.status, '|', c.subject || '(no subject)', '| name:', c.contact_name || 'NULL', '| email:', c.contact_email || 'NULL', '| updated:', c.updated_at);
  }

  const { data: prods, error: pe } = await sb.from('products').select('name,price_range,category').eq('company_id', demo);
  console.log('demo products:', pe ? `ERR ${pe.message}` : prods?.length);
  for (const p of (prods || []).slice(0, 12)) console.log('   -', p.name, '| price:', p.price_range || 'NULL', '|', p.category || '');

  const { data: sups, error: se } = await sb.from('suppliers').select('trading_name,product_capabilities,is_approved,deleted_at').eq('company_id', demo);
  console.log('demo suppliers:', se ? `ERR ${se.message}` : sups?.length);
  for (const s of (sups || []).slice(0, 8)) console.log('   -', s.trading_name || 'NULL', '| caps:', JSON.stringify(s.product_capabilities), '| approved:', s.is_approved, '| del:', s.deleted_at);

  const { data: settings, error: ste } = await sb.from('company_settings').select('pricing').eq('company_id', demo).maybeSingle();
  console.log('demo pricing settings:', ste ? `ERR ${ste.message}` : JSON.stringify(settings?.pricing));

  const { data: msgs, error: mse } = await sb
    .from('messages')
    .select('conversation_id,role,sender_email,recipient_email,kind,status,created_at')
    .in('conversation_id', (convs || []).map((c) => c.id))
    .order('created_at', { ascending: true });
  console.log('messages query:', mse ? `ERR ${mse.message}` : msgs?.length);
  for (const m of (msgs || []).slice(0, 20)) console.log('   -', String(m.conversation_id).slice(0, 8), '|', m.role, '| kind:', m.kind || 'NULL', '| status:', m.status || 'NULL', '| from:', m.sender_email || 'NULL', '| to:', m.recipient_email || 'NULL');
}
main().catch((e) => { console.error('failed:', e.message); process.exit(1); });