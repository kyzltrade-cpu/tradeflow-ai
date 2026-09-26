#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const COMPANY_ID = '99b52405-c9f2-4ac0-bf7e-69b10c3cfea5';
const USER_ID = '3a448b81-4706-4b27-9456-f3dc1e18fb78';
const NOW = Date.now();
const D = 24 * 3600_000;

function iso(ms: number) { return new Date(ms).toISOString(); }
function validUntil(ms: number) { return new Date(ms + 30 * D).toISOString().slice(0, 10); }

interface Line { name: string; desc?: string; qty: number; unit: string; price: number }
interface QuoteSeed {
  number: string;
  status: string;
  oppTitle: string;
  oppStage: string;
  currency: string;
  incoterm: string;
  payment: string;
  delivery: string;
  marginPct: number;
  by: number; // days ago
  customerNote: string;
  items: Line[];
  approval: { status: string; comments: string | null; decided?: boolean };
  version?: { n: number; summary: string; daysAgo: number };
}

const QUOTES: QuoteSeed[] = [
  {
    number: 'QT-2026-7138',
    status: 'IN_REVIEW',
    oppTitle: 'Amelia Wong — 10,000 cotton tote bags for corporate giveaway',
    oppStage: 'rfq_sent',
    currency: 'USD',
    incoterm: 'FOB Yantian',
    payment: '30% deposit, 70% before shipment',
    delivery: '45 days after deposit',
    marginPct: 0.24,
    by: 3,
    customerNote: 'GOTS cotton totes, 1-colour print both sides',
    items: [
      { name: 'Cotton tote bag 38×42cm', desc: 'Heavy 8 oz cotton canvas, 1-colour screen print both sides', qty: 10000, unit: 'pcs', price: 1.45 },
      { name: 'Print setup fee', desc: 'One-time screen + plate setup', qty: 1, unit: 'lot', price: 350 },
    ],
    approval: { status: 'pending', comments: null, decided: false },
    version: { n: 1, summary: 'Initial quote drafted', daysAgo: 3 },
  },
  {
    number: 'QT-2026-1520',
    status: 'SENT',
    oppTitle: 'James Park — 5,000 insulated stainless bottles',
    oppStage: 'rfq_sent',
    currency: 'USD',
    incoterm: 'FOB Yantian',
    payment: '30% deposit, 70% before shipment',
    delivery: '30 days after deposit',
    marginPct: 0.28,
    by: 8,
    customerNote: '500ml vacuum insulated, laser engraving front',
    items: [
      { name: '500ml Double-Wall Vacuum Bottle', desc: '304 stainless, powder-coated, laser engraved logo', qty: 5000, unit: 'pcs', price: 2.8 },
    ],
    approval: { status: 'approved', comments: 'Auto-approved — below threshold', decided: true },
    version: { n: 2, summary: 'Revised freight allocation after client feedback', daysAgo: 7 },
  },
  {
    number: 'QT-2026-8801',
    status: 'DRAFT',
    oppTitle: 'Chloe Fontaine — 6,000 recycled PET lanyards',
    oppStage: 'sourcing',
    currency: 'EUR',
    incoterm: 'EXW',
    payment: '50% deposit, 50% before shipment',
    delivery: '25 days after deposit',
    marginPct: 0.22,
    by: 1,
    customerNote: 'Multi-colour woven lanyard + PVC snap buckle + carabiner',
    items: [
      { name: 'Recycled PET woven lanyard', desc: '15mm multi-colour with PVC snap buckle', qty: 6000, unit: 'pcs', price: 0.55 },
      { name: 'Carabiner clip', desc: 'Metal carabiner, nickel finish', qty: 6000, unit: 'pcs', price: 0.28 },
    ],
    approval: { status: 'pending', comments: null, decided: false },
    version: { n: 1, summary: 'Initial quote drafted', daysAgo: 1 },
  },
  {
    number: 'QT-2026-2384',
    status: 'IN_REVIEW',
    oppTitle: 'Siti Rahma — 700 executive gift sets',
    oppStage: 'rfq_sent',
    currency: 'USD',
    incoterm: 'FOB Yantian',
    payment: '50% deposit, 50% before shipment',
    delivery: '35 days after deposit',
    marginPct: 0.26,
    by: 5,
    customerNote: 'Recycled bottle + notebook + cap in rigid box, brand wrapper',
    items: [
      { name: 'Executive gift set', desc: 'Bottle, notebook, cap + rigid box with brand wrap', qty: 700, unit: 'sets', price: 9.8 },
    ],
    approval: { status: 'pending', comments: null, decided: false },
    version: { n: 1, summary: 'Initial quote drafted', daysAgo: 5 },
  },
  {
    number: 'QT-2026-3377',
    status: 'REJECTED',
    oppTitle: 'Daniel Kim — 2,000 canvas messenger bags',
    oppStage: 'negative_feedback',
    currency: 'USD',
    incoterm: 'CIF Busan',
    payment: '30% deposit, 70% before shipment',
    delivery: '40 days after deposit',
    marginPct: 0.18,
    by: 12,
    customerNote: '4-colour split, 13×9×3″, adjustable strap',
    items: [
      { name: 'Canvas messenger bag', desc: '16 oz canvas, front pocket, adjustable strap, staple-tab closure', qty: 2000, unit: 'pcs', price: 5.1 },
    ],
    approval: { status: 'rejected', comments: 'Customer declined on price — target $4.50/pc vs quoted $5.10', decided: true },
    version: { n: 1, summary: 'Initial quote drafted', daysAgo: 12 },
  },
];

async function main() {
  const { data: existing } = await supabase.from('quotes').select('quote_number').eq('company_id', COMPANY_ID);
  const have = (existing ?? []).map((q) => q.quote_number);
  const alreadySeeded = QUOTES.every((q) => have.includes(q.number));

  if (!alreadySeeded) {
    // New opportunities for the seeded quotes
    const oppInserts = QUOTES.map((s) => ({
      id: randomUUID(),
      company_id: COMPANY_ID,
      title: s.oppTitle,
      stage: s.oppStage,
      trading_model: 'principal',
      currency: s.currency,
      priority: 'normal',
      next_action: s.status === 'DRAFT' ? 'Complete supplier pricing' : 'Send quotation',
      created_at: iso(NOW - s.by * D),
      updated_at: iso(NOW - s.by * D),
    }));
    const { error: oppErr } = await supabase.from('opportunities').insert(oppInserts);
    if (oppErr) throw new Error(`opportunities insert failed: ${oppErr.message}`);

    const quoteInserts: any[] = [];
    const lineInserts: any[] = [];
    const costInserts: any[] = [];

    for (let i = 0; i < QUOTES.length; i++) {
      const s = QUOTES[i];
      const opp = oppInserts[i];
      const qid = randomUUID();
      const created = NOW - s.by * D;
      const total = s.items.reduce((acc, it) => acc + it.qty * it.price, 0);
      const margin = Math.round(total * s.marginPct * 100) / 100;
      const cost = Math.round((total - margin) * 100) / 100;
      const approved = s.status === 'APPROVED' || s.status === 'SENT';
      const decidedAt = s.approval.decided ? iso(created + 2 * D) : null;

      quoteInserts.push({
        id: qid,
        company_id: COMPANY_ID,
        opportunity_id: opp.id,
        quote_number: s.number,
        status: s.status,
        customer_id: null,
        contact_id: null,
        currency: s.currency,
        incoterm: s.incoterm,
        payment_terms: s.payment,
        delivery_terms: s.delivery,
        validity_days: 30,
        valid_until: validUntil(created),
        notes: `${s.customerNote}; margins verified · ${s.currency}`,
        internal_notes: null,
        terms_and_conditions: null,
        total_amount: total,
        total_cost: cost,
        total_margin: margin,
        margin_pct: s.marginPct,
        selected_supplier_quote_id: null,
        current_version: 1,
        created_by: USER_ID,
        approved_by: approved ? USER_ID : null,
        approved_at: approved ? decidedAt : null,
        sent_at: s.status === 'SENT' ? iso(created + 4 * D) : null,
        opened_at: s.status === 'SENT' || s.status === 'APPROVED' ? iso(created + 5 * D) : null,
        customer_replied_at: s.status === 'REJECTED' ? iso(created + 6 * D) : null,
        accepted_at: null,
        rejected_at: s.status === 'REJECTED' ? iso(created + 6 * D) : null,
        created_at: iso(created),
        updated_at: iso(created + (decidedAt ? 2 * D : D)),
      });

      s.items.forEach((it, idx) => {
        lineInserts.push({
          id: randomUUID(),
          quote_id: qid,
          company_id: COMPANY_ID,
          product_id: null,
          product_name: it.name,
          description: it.desc ?? it.name,
          quantity: it.qty,
          unit: it.unit,
          unit_price: it.price,
          total_price: Math.round(it.qty * it.price * 100) / 100,
          specs: null,
          notes: null,
          sort_order: idx,
          created_at: iso(created),
        });
      });

      costInserts.push(
        {
          id: randomUUID(),
          quote_id: qid,
          company_id: COMPANY_ID,
          component_name: 'Supplier cost (confirmed)',
          amount: Math.round(cost * 0.85),
          currency: s.currency,
          source: 'supplier',
          source_entity_type: 'supplier_quotes',
          source_entity_id: null,
          effective_date: iso(created).slice(0, 10),
          status: 'confirmed',
          assumption_note: 'Confirmed supplier quote',
          sort_order: 0,
        },
        {
          id: randomUUID(),
          quote_id: qid,
          company_id: COMPANY_ID,
          component_name: 'Freight & handling (estimated)',
          amount: Math.round(cost * 0.15),
          currency: s.currency,
          source: 'manual',
          source_entity_type: null,
          source_entity_id: null,
          effective_date: iso(created).slice(0, 10),
          status: 'estimated',
          assumption_note: 'Estimated till carrier quote',
          sort_order: 1,
        }
      );
    }

    const tables: Array<[string, any[]]> = [
      ['quotes', quoteInserts],
      ['quote_line_items', lineInserts],
      ['quote_cost_components', costInserts],
    ];
    for (const [name, ins] of tables) {
      for (const chunk of [ins.slice(0, 50), ins.slice(50)]) {
        if (chunk.length === 0) continue;
        const { error } = await supabase.from(name as any).insert(chunk);
        if (error) throw new Error(`${name} insert failed: ${error.message}`);
        console.log(`Inserted ${chunk.length} ${name}`);
      }
    }
    console.log('Quote seed complete.');
  } else {
    console.log('Quotes already seeded — skipping inserts.');
  }

  // Ensure versions + approvals exist for every seeded quote (idempotent).
  const seeded = await supabase
    .from('quotes')
    .select('id, quote_number, total_amount, status, created_at')
    .eq('company_id', COMPANY_ID)
    .in('quote_number', QUOTES.map((q) => q.number));
  for (const quote of seeded.data ?? []) {
    const s = QUOTES.find((x) => x.number === quote.quote_number)!;
    const created = new Date(quote.created_at).getTime();
    const decidedAt = s.approval.decided ? iso(created + 2 * D) : null;

    const { data: vexists } = await supabase
      .from('quote_versions')
      .select('id')
      .eq('quote_id', quote.id)
      .limit(1);
    if (!vexists || vexists.length === 0) {
      const vN = s.version?.n ?? 1;
      const vDays = s.version?.daysAgo ?? s.by;
      const { error: verr } = await supabase.from('quote_versions').insert({
        id: randomUUID(),
        quote_id: quote.id,
        company_id: COMPANY_ID,
        version_number: vN,
        snapshot: {
          quote_number: quote.quote_number,
          status: quote.status,
          total_amount: quote.total_amount,
        },
        change_summary: s.version?.summary ?? 'Initial quote drafted',
        created_by: USER_ID,
        created_at: iso(NOW - vDays * D),
      });
      if (verr) throw new Error(`quote_versions insert failed: ${verr.message}`);
      console.log(`version for ${quote.quote_number}`);
    }

    const { data: aexists } = await supabase
      .from('quote_approvals')
      .select('id')
      .eq('quote_id', quote.id)
      .limit(1);
    if (!aexists || aexists.length === 0) {
      const { error: aerr } = await supabase.from('quote_approvals').insert({
        id: randomUUID(),
        quote_id: quote.id,
        company_id: COMPANY_ID,
        approver_id: USER_ID,
        status: s.approval.status,
        comments: s.approval.comments,
        decided_at: decidedAt,
        created_at: iso(created + (decidedAt ? 2 * D : D)),
      });
      if (aerr) throw new Error(`quote_approvals insert failed: ${aerr.message}`);
      console.log(`approval for ${quote.quote_number}`);
    }
  }

  // Enrich the existing FX-test quotes with real margin values (idempotent).
  const { data: fix } = await supabase
    .from('quotes')
    .select('id, total_amount')
    .eq('company_id', COMPANY_ID)
    .in('quote_number', ['QT-2026-9494', 'QT-2026-5261', 'QT-2026-6954']);
  for (const q of fix ?? []) {
    const marginPct = 0.25;
    const margin = Math.round(q.total_amount * marginPct * 100) / 100;
    const cost = Math.round((q.total_amount - margin) * 100) / 100;
    const { error } = await supabase.from('quotes').update({ total_cost: cost, total_margin: margin, margin_pct: marginPct }).eq('id', q.id);
    if (error) throw new Error(`margin update failed: ${error.message}`);
  }
  if ((fix?.length ?? 0) > 0) console.log(`Updated margins on ${fix!.length} existing quotes`);
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});