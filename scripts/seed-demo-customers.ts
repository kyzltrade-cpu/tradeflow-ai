#!/usr/bin/env tsx
/**
 * Seed customers + contacts for the demo workspace and link existing demo
 * quotes to them so Queue / Quotes / Conversations resolve customer emails.
 *
 * Idempotent — safe to re-run. Uses the same take as the starter-kit's
 * demo-company path: only backfills missing customers/contacts and links
 * quotes; never touches protected conversations/quotes/suppliers.
 *
 * Usage:
 *   npx tsx scripts/seed-demo-customers.ts
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname || __dirname, '..');

if (existsSync(join(ROOT, '.env.local'))) {
  for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

async function main() {
  const { DEMO_COMPANY_ID, seedStarterKit } = await import('@/lib/starter-kit');
  const summary = await seedStarterKit(DEMO_COMPANY_ID);
  console.log(JSON.stringify(summary, null, 2));
  if (summary.errors.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Seed failed:', err.message || err);
  process.exit(1);
});