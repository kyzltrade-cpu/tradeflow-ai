#!/usr/bin/env tsx
/**
 * Proves outbound email actually works, using Resend's own test address
 * (delivered@resend.dev — it reaches no human) so this is safe to run against
 * production credentials. It touches no application rows.
 *
 * This is the one part of every send path that a database check cannot prove:
 * whether a sending address is configured and Resend is accepting mail. Every
 * send route in this app already fails loudly when it is not, but "fails
 * loudly" is not the same as "works", and shipping an approval button without
 * knowing is how you find out at the worst moment.
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname || __dirname, '..');
if (existsSync(join(ROOT, '.env.local'))) {
  for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, '');
  }
}

async function main() {
  // Imported here, not at the top: src/lib/supabase reads env at module load,
  // and a static import would run before .env.local is parsed above.
  const { sendEmail } = await import('../src/lib/email');
  const to = process.env.MAIL_TEST_RECIPIENT || 'delivered@resend.dev';

  const result = await sendEmail({
    to,
    subject: 'Sailwise send-path check',
    html: '<p>Transport check. No action needed.</p>',
    companyId: process.env.DEMO_COMPANY_ID || '00000000-0000-0000-0000-000000000000',
  });

  console.log(`to:      ${to}`);
  console.log(`success: ${result.success}`);
  if (result.id) console.log(`id:      ${result.id}`);
  if (result.code) console.log(`code:    ${result.code}`);
  if (result.error) console.log(`error:   ${result.error}`);

  if (!result.success) {
    console.log('\nFAIL — every "Send draft" button will refuse until this is fixed.');
    console.log('Fix: connect a sending mailbox in Settings, or set EMAIL_FROM_ADDRESS.');
    process.exit(1);
  }
  console.log('\nPASS — outbound email is working.');
}

main().catch((e) => {
  console.error('transport check failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
