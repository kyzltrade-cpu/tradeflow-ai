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
  const demo = '9996084b-f593-489c-a177-455c550ccb60';
  const { data: convs, error } = await sb.from('conversations')
    .select('id, contact_name, contact_email, status, external_search_enabled, created_at, source')
    .eq('company_id', demo).order('created_at', { ascending: true });
  console.log('Convs for 9996084b:', error ? `ERR ${error.message}` : convs?.length);
  for (const c of convs || []) console.log('  -', c.id.slice(0,8), '| contact:', c.contact_name || 'NULL', '| email:', c.contact_email || 'NULL', '| src:', c.source, '| external_search:', c.external_search_enabled);
}
main().catch((e) => { console.error('failed:', e.message); process.exit(1); });
