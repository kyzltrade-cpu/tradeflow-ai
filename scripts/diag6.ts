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
  const bt = '99b52405-c9f2-4ac0-bf7e-69b10c3cfea5';

  const { data: users } = await sb.from('users').select('id,email,role,company_id').in('email', ['demo@broadust.io','demo@hktrading.com']);
  console.log('USERS:', JSON.stringify(users, null, 1));

  // Which company does demo resolve to? And does 024 exist now?
  const { data: conv, error: ce } = await sb.from('conversations').select('id, subject, folder, status').eq('company_id', demo).limit(1);
  console.log('\n024 check (conversations subject/folder):', ce ? `ERR ${ce.message}` : JSON.stringify(conv));

  for (const [label, cid, exempt] of [['DEMO 9996084b', demo, false], ['BROADUST 99b52405', bt, true]] as const) {
    const since = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
    const { count: drafts } = await sb.from('audit_events').select('id', { count: 'exact', head: true }).eq('company_id', cid).eq('entity_type', 'quote').eq('metadata->>auto_created', 'true').gte('created_at', since);
    const { count: sends } = await sb.from('audit_events').select('id', { count: 'exact', head: true }).eq('company_id', cid).eq('event_type', 'sent').gte('created_at', since);
    const { count: quotes } = await sb.from('quotes').select('id', { count: 'exact', head: true }).eq('company_id', cid).not('sent_at','is',null).gte('sent_at', since);
    const { data: planRow, error: ple } = await sb.from('companies').select('id, plan, subscription_status').eq('id', cid).maybeSingle();
    console.log(`\n${label} plan:`, ple ? `ERR ${ple.message}` : JSON.stringify(planRow), `| ai_quote_drafts_month=${drafts} trial cap=50`, `| sends_month=${sends}`, `| quotes_sent_month=${quotes}`);
  }

  const { data: audited } = await sb.from('audit_events').select('id, event_type, entity_type, created_at').eq('company_id', demo).in('entity_type', ['quote','suggestion']).order('created_at',{ascending:false}).limit(10);
  console.log('\nRecent demo audit_events:'); for (const a of audited || []) console.log('  ', a.event_type, a.entity_type, a.created_at);
}
main().catch((e) => { console.error('failed:', e.message); process.exit(1); });
