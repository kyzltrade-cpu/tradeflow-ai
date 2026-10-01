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
  const broadus = '99b52405-c9f2-4ac0-bf7e-69b10c3cfea5';
  const { data: convs } = await sb.from('conversations').select('id,contact_name,contact_email,contact_phone,channel,status,updated_at').eq('company_id', broadus).order('updated_at', { ascending: false }).limit(25);
  console.log('Broadust Trading convs:', convs?.length);
  for (const c of (convs || []).slice(0, 25)) console.log('  -', String(c.id).slice(0, 8), '|', c.channel, '|', c.status, '| name:', c.contact_name || 'NULL', '| email:', c.contact_email || 'NULL');
  const { data: users } = await sb.from('users').select('id,email,company_id,role').eq('id', '3a448b81-4706-4b27-9456-f3dc1e18fb78');
  console.log('demo user db row:', JSON.stringify(users));
  const { data: u2 } = await sb.from('users').select('id,email,company_id').ilike('email', '%demo%');
  console.log('any demo-ish users:', JSON.stringify(u2));
  for (const co of ['347c863e-e49b-4654-b66e-959b50efbf58', '9996084b-f593-489c-a177-455c550ccb60']) {
    const { data: cc } = await sb.from('conversations').select('id,contact_name,contact_email,channel,status').eq('company_id', co);
    console.log(`convs for ${co.slice(0,8)}:`, (cc || []).map((c) => `${String(c.id).slice(0,8)}|${c.contact_name||'NULL'}|${c.contact_email||'NULL'}|${c.status}`));
  }
}
main().catch((e) => { console.error('failed:', e.message); process.exit(1); });
