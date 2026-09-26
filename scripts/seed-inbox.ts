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
const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url!, key!, { auth: { persistSession: false } });

const COMPANY_ID = '99b52405-c9f2-4ac0-bf7e-69b10c3cfea5';
const NOW = Date.now();
const H = 3600_000;
const D = 24 * H;

interface SeedConv {
  by: number; // offset ms before NOW for the latest message
  name: string;
  email: string;
  lang: 'en' | 'zh';
  last: 'customer' | 'assistant' | 'human';
  status?: 'active' | 'human';
  thread: Array<{ role: 'customer' | 'assistant' | 'human'; text: string }>;
  product_summary?: string;
  estimated_value?: number;
  currency?: string;
  next_action?: string;
}

const SEEDS: SeedConv[] = [
  {
    by: 18 * H,
    name: 'Amelia Wong',
    email: 'amelia.wong@luxeevents.hk',
    lang: 'en',
    last: 'customer',
    thread: [
      {
        role: 'customer',
        text: 'Hi, we need 10,000 cotton tote bags for a corporate giveaway in January. Custom print 1 colour on both sides, eco-friendly GOTS cotton preferred. Can you quote and confirm lead time?',
      },
    ],
    product_summary: 'Custom printed cotton tote bags',
    estimated_value: 18500,
    currency: 'USD',
    next_action: 'Send quote for cotton totes',
  },
  {
    by: 3 * H,
    name: 'James Park',
    email: 'james.park@blueoceanretail.com',
    lang: 'en',
    last: 'customer',
    thread: [
      {
        role: 'customer',
        text: 'Do you supply stainless steel water bottles with vacuum insulation, 500ml? We would order 5,000 and want laser engraving of our logo on the front. Please share your MOQ and pricing tiers.',
      },
    ],
    product_summary: 'Insulated stainless steel bottles, 500ml',
    estimated_value: 22400,
    currency: 'USD',
    next_action: 'Confirm bottle capacity and engraving cost',
  },
  {
    by: 45 * 60_000,
    name: 'Ingrid Hoffmann',
    email: 'ingrid@hoffmann-gmbh.de',
    lang: 'en',
    last: 'assistant',
    thread: [
      { role: 'customer', text: 'Hello, we need 3,000 embroidered baseball caps for a trade show in Berlin. Cotton twill, classic unstructured style, logo on front in two colours.' },
      { role: 'assistant', text: "Thanks Ingrid — noted: 3,000 cotton twill caps, unstructured, 2-colour front embroidery. Just to confirm: would you like a pre-production sample and are these for our wholesale price list or a branded re-order? I can prepare a quote once you confirm the budget and target unit price." },
    ],
    product_summary: 'Embroidered cotton twill caps',
    estimated_value: 18900,
    currency: 'EUR',
    status: 'active',
  },
  {
    by: 2 * D,
    name: 'Ricardo Mendes',
    email: 'ricardo@mendespromo.com.br',
    lang: 'en',
    last: 'customer',
    thread: [
      { role: 'customer', text: 'Precisamos de 5.000 sacolas de polipropileno tecido para supermercado. Eles precisam de alças reforçadas. Qual é o prazo de produção e o valor final do frete marítimo?' },
    ],
    product_summary: 'Woven polypropylene shopping bags',
    estimated_value: 12800,
    currency: 'USD',
    next_action: 'Clarify woven PP vs non-woven; translate to zh for reply',
  },
  {
    by: 5 * H,
    name: 'Tom Nakamura',
    email: 'tom@nagoya-greens.jp',
    lang: 'en',
    last: 'customer',
    thread: [
      { role: 'customer', text: 'We are a stationery retailer and would like 8,000 bamboo notebooks (A5, 80 sheets) with a kraft inner box and a free pen. Please quote including the custom logo blind debossing on the cover.' },
    ],
    product_summary: 'A5 bamboo notebooks with pen, kraft box',
    estimated_value: 15200,
    currency: 'USD',
    next_action: 'Draft notebook quote and sample photo',
  },
  {
    by: 4 * D,
    name: 'Elena Petrova',
    email: 'elena@petrova-supply.ru',
    lang: 'en',
    last: 'assistant',
    thread: [
      { role: 'customer', text: 'Needed 2,500 cordura laptop sleeves with zipper, for 14 inches. We can do black only. Our target price is $3.2 per piece.' },
      { role: 'assistant', text: "Noted — 2,500 cordura 14″ sleeves, black, target $3.20/pc. We hit that with a 5,000 unit carton batch; on 2,500 we land around $3.45. Happy to split into two runs so both share the tooling. Shall I draft a quote?" },
    ],
    product_summary: 'Cordura 14″ laptop sleeves',
    estimated_value: 8625,
    currency: 'USD',
  },
  {
    by: 30 * 60_000,
    name: 'Chloe Fontaine',
    email: 'chloe@fontaine-paris.fr',
    lang: 'en',
    last: 'customer',
    thread: [{ role: 'customer', text: 'Bonjour, we are looking for 6,000 recycled PET lanyards with PVC buckle and carabiner clip for a conference in March. Multi-colour woven, attach a spec sheet.' }],
    product_summary: 'Recycled PET lanyards + carabiners',
    estimated_value: 7200,
    currency: 'EUR',
    next_action: 'Request spec sheet; confirm widths',
  },
  {
    by: 6 * D,
    name: 'Priya Sharma',
    email: 'priya@sharma-imports.in',
    lang: 'en',
    last: 'human',
    status: 'human',
    thread: [
      { role: 'customer', text: 'We need 4,000 ceramic travel mugs, glossy, with lid in custom colour and our logo printed in one colour. Please confirm if dishwashers safe.' },
      { role: 'assistant', text: 'Confirmed — 4,000 glossy ceramic travel mugs, custom lid colour, 1-colour print. They are microwave and dishwasher safe.' },
      { role: 'human', text: 'Hi Priya, we can do this at $2.85/pc FOB Yantian with a 30-day payment term. Lead time 18 days after deposit. Attaching the catalogue with the lid colour card — please pick your lid colour.' },
    ],
    product_summary: 'Custom ceramic travel mugs',
    estimated_value: 12600,
    currency: 'USD',
  },
  {
    by: 30 * 60_000,
    name: 'Hans Müller',
    email: 'hans.mueller@mueller-event.de',
    lang: 'en',
    last: 'customer',
    thread: [{ role: 'customer', text: 'Guten Tag, we are organising a sustainability summit and need 12,000 non-woven shoe bags with drawstrings, each packed flat. Can you send your compliance certificate for the fabric?' }],
    product_summary: 'Non-woven shoe/dust bags',
    estimated_value: 8900,
    currency: 'EUR',
    next_action: 'Send fabric compliance certificate',
  },
  {
    by: 8 * D,
    name: 'Siti Rahma',
    email: 'siti@rahma-bags.co',
    lang: 'en',
    last: 'assistant',
    thread: [
      { role: 'customer', text: 'Hi, 700 premium gift sets for our executive clients — recycled bottle, notebook and cap inside a rigid box with our brand. Target December delivery.' },
      { role: 'assistant', text: 'Thanks Siti — 700 executive gift sets (bottle + notebook + cap + rigid box), we can deliver mid-December to your KL warehouse. Benchmarked at $9.80/kit assembled with the box wrap. Want me to send a quotation with three wrapping options?' },
    ],
    product_summary: 'Premium executive gift sets',
    estimated_value: 6860,
    currency: 'USD',
    next_action: 'Quotation with 3 box wrap options',
  },
  {
    by: 12 * H,
    name: 'Daniel Kim',
    email: 'daniel@kimtrading.co.kr',
    lang: 'en',
    last: 'customer',
    thread: [{ role: 'customer', text: 'We need 2,000 canvas messenger bags with adjustable strap and front pocket, in 4 colours split evenly. Sill keep the size 13x9x3 inches. Please give best price for 2,000 and 5,000.' }],
    product_summary: 'Canvas messenger bags',
    estimated_value: 15800,
    currency: 'USD',
    next_action: 'Quote 2,000 and 5,000 tiers',
  },
  {
    by: 10 * D,
    name: 'Sara Almeida',
    email: 'sara@almeida.pt',
    lang: 'en',
    last: 'customer',
    thread: [{ role: 'customer', text: 'Looking for 5,500 silicone wristbands with a raised 2-colour imprint for a charity run. Black base with white and green text. Minimum order and unit price please.' }],
    product_summary: 'Silicone wristbands, 2-colour',
    estimated_value: 3850,
    currency: 'EUR',
    next_action: 'Confirm bracelet sizes and imprint',
  },
];

async function main() {
  const { data: existing, error: countErr } = await supabase
    .from('conversations')
    .select('id')
    .eq('company_id', COMPANY_ID);
  if (countErr) throw countErr;
  if ((existing?.length ?? 0) >= 25) {
    console.log(`Already ${existing!.length} conversations — skipping seed.`);
    return;
  }

  const convRows: any[] = [];
  const msgRows: any[] = [];

  for (const seed of SEEDS) {
    const convId = randomUUID();
    const lastAt = new Date(NOW - seed.by).toISOString();
    convRows.push({
      id: convId,
      company_id: COMPANY_ID,
      channel: 'email',
      status: seed.status || 'active',
      contact_name: seed.name,
      contact_email: seed.email,
      detected_language: seed.lang,
      product_summary: seed.product_summary ?? null,
      estimated_value: seed.estimated_value ?? null,
      currency: seed.currency ?? 'USD',
      next_action: seed.next_action ?? null,
      external_search_enabled: seed.lang === 'zh' || true,
      created_at: lastAt,
      updated_at: lastAt,
    });
    seed.thread.forEach((m, i) => {
      const t = lastAt;
      const createdAt = new Date(new Date(t).getTime() - (seed.thread.length - 1 - i) * 5 * 60_000).toISOString();
      msgRows.push({
        id: randomUUID(),
        conversation_id: convId,
        role: m.role,
        content: m.text,
        created_at: createdAt,
      });
    });
  }

  for (const chunk of [convRows.slice(0, 6), convRows.slice(6)]) {
    const { error } = await supabase.from('conversations').insert(chunk);
    if (error) throw new Error(`conversations insert failed: ${error.message}\n${JSON.stringify(error)}`);
    console.log(`Inserted ${chunk.length} conversations`);
  }
  for (const chunk of [msgRows.slice(0, 30), msgRows.slice(30)]) {
    if (chunk.length === 0) continue;
    const { error } = await supabase.from('messages').insert(chunk);
    if (error) throw new Error(`messages insert failed: ${error.message}\n${JSON.stringify(error)}`);
    console.log(`Inserted ${chunk.length} messages`);
  }
  console.log('Seed complete.');
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});