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
  const demoUserId = '3a448b81-4706-4b27-9456-f3dc1e18fb78';
  const target = '99b52405-c9f2-4ac0-bf7e-69b10c3cfea5';
  const { data: before } = await sb.from('users').select('id,email,company_id').eq('id', demoUserId).single();
  console.log('BEFORE:', JSON.stringify(before));
  const { data, error } = await sb.from('users').update({ company_id: target }).eq('id', demoUserId).select();
  if (error) { console.error('UPDATE FAILED:', error.message); process.exit(1); }
  console.log('AFTER:', JSON.stringify(data));
  const { count } = await sb.from('conversations').select('id', { count: 'exact', head: true }).eq('company_id', target);
  console.log('Broadust conversations visible to demo now:', count);
}
main().catch((e) => { console.error('failed:', e.message); process.exit(1); });
