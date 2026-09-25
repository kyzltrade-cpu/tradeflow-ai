#!/usr/bin/env tsx
/**
 * Demo Seed Script for TradeFlow AI
 *
 * Creates (or reuses) a demo account + company, loads a realistic product
 * catalog (priced, so the auto-draft flow can price and quote them), and
 * seeds a sample inbound email conversation + inquiry so the Inbox workspace
 * shows the full flow immediately.
 *
 * Usage:
 *   npx tsx scripts/seed-demo.ts            # idempotent; safe to re-run
 *   npx tsx scripts/seed-demo.ts --reset    # delete demo company data first
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname || __dirname, '..');

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

function loadEnv(): Env {
  const file = join(ROOT, '.env.local');
  const env: Record<string, string> = {};
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required (.env.local)');
  }
  return { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key };
}

const DEMO_EMAIL = 'demo@broadust.io';
const DEMO_PASSWORD = 'DemoTrade2026!';
const COMPANY_NAME = 'Broadust Trading Ltd';

const PRODUCTS = [
  { name: '500ml Double-Wall Vacuum Bottle', category: 'Drinkware', price_range: 'USD 2.80 - 3.50 / pc', moq: '500 pcs', description: '304 stainless steel, double-wall vacuum insulation, PP lid' },
  { name: '750ml Stainless Steel Water Bottle', category: 'Drinkware', price_range: 'USD 3.20 - 4.10 / pc', moq: '300 pcs', description: '18/8 stainless, powder-coated finish, leak-proof flip lid' },
  { name: 'Reusable Silicone Straw Set', category: 'Eco Products', price_range: 'USD 0.35 - 0.55 / set', moq: '1000 sets', description: '4-pack bent straws + cleaning brush, food-grade silicone' },
  { name: 'Foldable Reusable Shopping Bag', category: 'Eco Products', price_range: 'USD 0.60 - 0.90 / pc', moq: '1000 pcs', description: '210D nylon, 30L, carabiner clip, pouch included' },
  { name: 'Ceramic Coffee Mug 350ml', category: 'Drinkware', price_range: 'USD 1.10 - 1.60 / pc', moq: '500 pcs', description: 'White glazed ceramic, sublimation-ready wrap area' },
  { name: 'Bamboo Utensil Travel Set', category: 'Eco Products', price_range: 'USD 1.80 - 2.40 / set', moq: '300 sets', description: 'Fork, spoon, chopsticks, straw, brush in canvas roll' },
  { name: 'Insulated Lunch Bag 12L', category: 'Eco Products', price_range: 'USD 2.00 - 2.80 / pc', moq: '500 pcs', description: 'PEVA lining, polyester shell, zip-top, carabiner' },
  { name: 'Aluminum Keychain Bottle Opener', category: 'Promotional', price_range: 'USD 0.18 - 0.30 / pc', moq: '2000 pcs', description: 'Aluminum, laser-engraving ready, 6-color options' },
];

const INBOUND_EMAIL = `Dear Broadust,

We would like to request a quotation for the following items for a corporate event in Q4:

1. 500ml Double-Wall Vacuum Bottle - 2,000 pcs
2. Reusable Silicone Straw Set - 5,000 sets
3. Foldable Reusable Shopping Bag - 3,000 pcs

Please advise your best FOB price, lead time, and MOQ. We would also like to know
whether printing our logo on these items is available and any artwork requirements.

Looking forward to your quotation.

Best regards,
Maria Chen
Procurement Manager, Ocean & Co.`;

async function main() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = loadEnv();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const reset = process.argv.includes('--reset');

  // ---------------------------------------------------------------------
  // 1. Company (idempotent by name)
  // ---------------------------------------------------------------------
  let { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('name', COMPANY_NAME)
    .maybeSingle();

  if (reset && company) {
    const { error } = await supabase.from('companies').delete().eq('id', company.id);
    if (error) console.log('  reset: skip (', error.message, ')');
    company = null;
  }

  if (!company) {
    const { data, error } = await supabase
      .from('companies')
      .insert({ name: COMPANY_NAME, industry: 'Trading' })
      .select()
      .single();
    if (error) throw new Error(`company insert: ${error.message}`);
    company = data;
  }
  console.log(`[1/4] company: ${company.name} (${company.id})`);

  // ---------------------------------------------------------------------
  // 2. Demo user (idempotent by email; links existing auth user if present)
  // ---------------------------------------------------------------------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = supabase.auth.admin as any;

  let userId: string | null = null;

  const { data: userRow } = await supabase
    .from('users')
    .select('id')
    .eq('email', DEMO_EMAIL)
    .maybeSingle();
  if (userRow) {
    userId = userRow.id;
  } else {
    const { data: existingUser } = await admin.listUsers();
    const match = existingUser?.users.find(
      (u: { email: string }) => u.email.toLowerCase() === DEMO_EMAIL.toLowerCase()
    );
    if (match) {
      userId = match.id;
    } else {
      const { data: created, error } = await admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { company_id: company.id },
      });
      if (error) throw new Error(`createUser: ${error.message}`);
      userId = created.user.id;
    }
  }

  if (!userId) throw new Error('demo user id not resolved');

  const { error: linkError } = await supabase
    .from('users')
    .upsert(
      { id: userId, email: DEMO_EMAIL, company_id: company.id, role: 'admin' },
      { onConflict: 'id' }
    );
  if (linkError) throw new Error(`users upsert: ${linkError.message}`);
  console.log(`[2/4] demo user: ${DEMO_EMAIL} (${userId})`);

  // ---------------------------------------------------------------------
  // 3. Product catalog — upsert by (company_id, name); preserves photos
  // ---------------------------------------------------------------------
  let inserted = 0;
  let updated = 0;
  for (const p of PRODUCTS) {
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('company_id', company.id)
      .eq('name', p.name)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase
        .from('products')
        .update({ ...p, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) throw new Error(`product update: ${error.message}`);
      updated++;
    } else {
      const { error } = await supabase.from('products').insert({
        company_id: company.id,
        ...p,
        photos: [],
      });
      if (error) throw new Error(`product insert: ${error.message}`);
      inserted++;
    }
  }
  console.log(`[3/4] products: ${inserted} inserted, ${updated} updated`);

  // ---------------------------------------------------------------------
  // 4. Sample email conversation + inquiry
  // ---------------------------------------------------------------------
  const convChannel = 'email';
  const convKey = 'partner@oceancoltd.com';

  const { data: existingConv } = await supabase
    .from('conversations')
    .select('*')
    .eq('company_id', company.id)
    .eq('channel', convChannel)
    .eq('contact_phone', convKey)
    .maybeSingle();

  let conversation = existingConv;
  if (!conversation) {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        company_id: company.id,
        channel: convChannel,
        contact_phone: convKey,
        contact_email: convKey,
        contact_name: 'Maria Chen',
        status: 'active',
        source_channel: 'email',
        currency: 'USD',
        external_search_enabled: true,
      })
      .select()
      .single();
    if (error) throw new Error(`conversation insert: ${error.message}`);
    conversation = data;
  }

  const { data: msgCount } = await supabase
    .from('messages')
    .select('id')
    .eq('conversation_id', conversation.id)
    .eq('role', 'customer')
    .limit(1);

  if (!msgCount || msgCount.length === 0) {
    await supabase.from('messages').insert([
      { conversation_id: conversation.id, role: 'customer', content: INBOUND_EMAIL, created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    ]);
  }

  const { data: existingInquiry } = await supabase
    .from('inquiries')
    .select('*')
    .eq('company_id', company.id)
    .eq('sender_email', convKey)
    .eq('subject', 'Quotation request - vacuum bottles, straws, bags')
    .maybeSingle();

  let inquiry = existingInquiry;
  if (!inquiry) {
    const { data, error } = await supabase
      .from('inquiries')
      .insert({
        company_id: company.id,
        source_channel: 'email',
        sender_name: 'Maria Chen',
        sender_email: convKey,
        subject: 'Quotation request - vacuum bottles, straws, bags',
        original_message: INBOUND_EMAIL,
        conversation_id: conversation.id,
        processing_status: 'RECEIVED',
        detected_language: 'en',
      })
      .select()
      .single();
    if (error) throw new Error(`inquiry insert: ${error.message}`);
    inquiry = data;
  }

  if (!conversation.opportunity_id) {
    await supabase
      .from('conversations')
      .update({ opportunity_id: inquiry.opportunity_id || null })
      .eq('id', conversation.id);
  }

  console.log(`[4/4] inbox: conversation ${conversation.id} + inquiry ${inquiry.id}`);
  console.log('');
  console.log('Demo ready. Sign in at the app with:');
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log(`  password: ${DEMO_PASSWORD}`);
  console.log('');
  console.log('Open Inbox → the seeded email → auto-draft creates the opportunity + DRAFT quote.');
}

main().catch((err) => {
  console.error('Seed failed:', err.message || err);
  process.exit(1);
});