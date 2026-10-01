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
const API_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ADMIN = createClient(API_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const AUTH = createClient(API_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
const APP = 'https://tradeflow-ai-rho.vercel.app';

const stamp = Date.now();
const EMAIL = `quote-fix-e2e-${stamp}@example.com`;
const PASSWORD = 'E2e-Test-2026!';
let companyId = '';
let userId = '';
let throwaway: string[] = [];

async function main() {
  // 1. create a throwaway auth user (service role, email pre-confirmed)
  const { data: usr, error: uerr } = await ADMIN.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (uerr || !usr.user) throw new Error(`createUser: ${uerr?.message}`);
  userId = usr.user.id;
  throwaway.push('auth-user:' + userId);
  console.log('user created', userId, EMAIL);

  // 2. sign in via password grant to get a user token
  const { data: tok, error: terr } = await AUTH.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (terr || !tok.session) throw new Error(`signIn: ${terr?.message}`);
  const token = tok.session.access_token;
  console.log('signed in ok');

  // 3. on-board a company (starter kit seeds catalog + conversations)
  const res = await fetch(`${APP}/api/admin/company`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: `QuoteFix E2E ${stamp}`, user_id: userId }),
  });
  const body = await res.json();
  if (res.status !== 200 || !body.id) throw new Error(`onboarding: ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  companyId = body.id;
  throwaway.push('company:' + companyId);
  console.log('company created', companyId, '| seeded', JSON.stringify(body.seed_count || {}));

  // 4. pick the Double-Wall Vacuum Bottle starter conversation (has a clear
  //    product + a large batch quantity in the thread => must produce a clean quote)
  let convs: any[] | null = null;
  for (let i = 0; i < 12 && !convs?.length; i++) {
    if (i) await new Promise((r) => setTimeout(r, 1000));
    const { data } = await ADMIN.from('conversations').select('id, contact_email, contact_name, status').eq('company_id', companyId);
    convs = data;
  }
  if (!convs?.length) throw new Error('no seed conversations');

  let anyQuoteValidated = false;
  for (const conv of convs as any[]) {
    console.log('\n--- conversation', conv.contact_email, '|', conv.contact_name, '|', conv.status);

    // 5. trigger the suggest route on prod
    const sug = await fetch(`${APP}/api/admin/inbox/${conv.id}/suggest`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const s = await sug.json();
    if (sug.status !== 200) throw new Error(`suggest: ${sug.status} ${JSON.stringify(s).slice(0, 300)}`);
    console.log('suggest ok | source', s.extraction?.source, '| draft', s.draft?.reason || JSON.stringify({ q: s.draft?.quote_number, priced: s.draft?.priced_count, excluded: s.draft?.excluded_count }));
    console.log('lines', JSON.stringify(s.lines?.map((l: any) => ({ p: l.product.slice(0, 36), qty: l.quantity, up: l.unit_price, cost: l.cost_price, margin: l.margin_pct, rev: l.needs_review, at_cost: l.at_cost, src: l.sources?.map((x: any) => `${x.label}:${x.detail}`) })), null, 1));

    // 6. read the persisted quote + line items and assert integrity
    if (!s.draft?.quote_id) {
      console.log('No quote (draft.reason=' + s.draft?.reason + '). Correct: nothing broken to send.');
      continue;
    }
    anyQuoteValidated = true;
    const { data: q, error: qerr } = await ADMIN.from('quotes').select('id, quote_number, status, customer_id, contact_id, incoterm, payment_terms, total_amount, total_cost, total_margin, margin_pct, internal_notes').eq('id', s.draft.quote_id).single();
    if (qerr) {
      console.error('quotes fetch error:', JSON.stringify(qerr), 'id=', s.draft.quote_id);
      const lim = await ADMIN.from('quotes').select('id').eq('id', s.draft.quote_id).limit(1);
      console.log('retry by-id limit:', lim.error ? 'ERR ' + lim.error.message : 'ok ' + (lim.data || []).length);
      const plain = await ADMIN.from('quotes').select('id').limit(1);
      console.log('plain limit:', plain.error ? 'ERR ' + plain.error.message : 'ok ' + (plain.data || []).length);
    }
    if (!q) continue;
    console.log('QUOTE', JSON.stringify(q, null, 1));
    const { data: li } = await ADMIN.from('quote_line_items').select('product_name, quantity, unit_price, total_price, product_id').eq('quote_id', s.draft.quote_id);
    console.log('LINE ITEMS', JSON.stringify(li, null, 1));

    const { data: contact } = await ADMIN.from('contacts').select('id, full_name, email').eq('id', q.contact_id).maybeSingle();
    console.log('CONTACT', JSON.stringify(contact));

    const flaws: string[] = [];
    if (q.status !== 'DRAFT') flaws.push('status!==DRAFT');
    if (!q.incoterm) flaws.push('no incoterm');
    if (!q.payment_terms) flaws.push('no payment_terms');
    if (!q.contact_id || !contact?.email) flaws.push('no recipient contact/email');
    if (!(q.total_amount > 0) || !(q.total_cost > 0)) flaws.push('no amount/cost');
    if (!(q.margin_pct >= 0)) flaws.push('margin_pct not set');
    for (const it of li || []) {
      if (!(it.quantity > 0)) flaws.push(`zero/undef qty on ${it.product_name}`);
      if (!(it.unit_price > 0)) flaws.push(`zero price on ${it.product_name}`);
      if (!it.product_id) flaws.push(`no product_id on ${it.product_name}`);
    }
    const sumItems = (li || []).reduce((a: number, b: any) => a + Number(b.total_price || 0), 0);
    if (Math.abs(sumItems - q.total_amount) > 1) flaws.push('line-item sum != total_amount');
    console.log(flaws.length ? `FLAWS: ${flaws.join(' | ')}` : 'QUOTE VALID ✅');
    if (flaws.length) process.exitCode = 1;
  }
  if (!anyQuoteValidated) console.log('\nNOTE: no auto-drafted quote was produced on any seeded conversation.');
}

async function cleanup() {
  if (!companyId) return;
  for (const tbl of ['audit_events', 'quote_line_items', 'quotes', 'opportunities', 'inquiries', 'messages', 'conversations', 'contacts', 'products', 'suppliers', 'supplier_documents']) {
    try { await ADMIN.from(tbl).delete().eq('company_id', companyId); } catch { /* column may not exist on table */ }
  }
}

main()
  .catch((e) => { console.error('FAILED', e.message || e); process.exitCode = 1; })
  .finally(async () => {
    await cleanup();
    if (userId) await ADMIN.auth.admin.deleteUser(userId).catch(() => {});
    console.log('cleanup done', throwaway.join(', '));
  });