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
const supabase = createClient(url!, key!, { auth: { persistSession: false } });

async function main() {
  const file = process.argv[2];
  if (!file) { console.error('usage: tsx scripts/run-sql.ts <migration-file.sql>'); process.exit(1); }
  const sql = readFileSync(join(ROOT, file), 'utf8');
  const { error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.error('rpc exec_sql failed:', error.message);
    const { data, error: qerr } = await supabase.from('_sql_runner').select('*').eq('_', 0).limit(1);
    console.log('probe result:', data, qerr?.message);
    process.exit(1);
  }
  console.log('exec_sql OK');
}
main().catch((err) => { console.error('Failed:', err.message); process.exit(1); });