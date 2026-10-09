// Sample inbox data for the demo company. Shared by the seeder
// (scripts/seed-inbox.ts) and the chat context so the public demo can answer
// questions about specific buyers (e.g. "what did Hans Müller order?") even
// when the database is unreachable or not yet seeded.

export interface DemoInboxConversation {
  by: number; // offset ms before NOW for the latest message (seed script only)
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
  missing?: string[];
}

export const DEMO_INBOX_SEEDS: DemoInboxConversation[] = [
  {
    by: 18 * 3_600_000,
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
    missing: ['Confirmed artwork', 'Delivery date'],
  },
  {
    by: 3 * 3_600_000,
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
    missing: ['Engraving area size', 'Delivery date'],
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
    by: 2 * 86_400_000,
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
    missing: ['Bag material (woven PP vs non-woven)', 'Shipping method'],
  },
  {
    by: 5 * 3_600_000,
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
    missing: ['Delivery date', 'Confirmed logo artwork'],
  },
  {
    by: 4 * 86_400_000,
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
    missing: ['Spec sheet', 'Lanyard width'],
  },
  {
    by: 6 * 86_400_000,
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
    missing: ['Fabric compliance certificate', 'Delivery date'],
  },
  {
    by: 8 * 86_400_000,
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
    by: 12 * 3_600_000,
    name: 'Daniel Kim',
    email: 'daniel@kimtrading.co.kr',
    lang: 'en',
    last: 'customer',
    thread: [{ role: 'customer', text: 'We need 2,000 canvas messenger bags with adjustable strap and front pocket, in 4 colours split evenly. Sill keep the size 13x9x3 inches. Please give best price for 2,000 and 5,000.' }],
    product_summary: 'Canvas messenger bags',
    estimated_value: 15800,
    currency: 'USD',
    next_action: 'Quote 2,000 and 5,000 tiers',
    missing: ['Colour split', 'Delivery port'],
  },
  {
    by: 10 * 86_400_000,
    name: 'Sara Almeida',
    email: 'sara@almeida.pt',
    lang: 'en',
    last: 'customer',
    thread: [{ role: 'customer', text: 'Looking for 5,500 silicone wristbands with a raised 2-colour imprint for a charity run. Black base with white and green text. Minimum order and unit price please.' }],
    product_summary: 'Silicone wristbands, 2-colour',
    estimated_value: 3850,
    currency: 'EUR',
    next_action: 'Confirm bracelet sizes and imprint',
    missing: ['Bracelet sizes', 'Delivery date'],
  },
];

/**
 * Compact, always-available snapshot of the demo inbox. Appended to the chat
 * system prompt in demo mode so the assistant can answer buyer/order questions
 * (e.g. "what did Hans Müller order?") without depending on the live database.
 */
export function buildDemoInboxContext(): string {
  const fmt = (v?: number, cur?: string) =>
    v == null ? '' : ` — approx. ${new Intl.NumberFormat('en-US').format(v)} ${cur || 'USD'}`;

  const lines = DEMO_INBOX_SEEDS.map((s) => {
    const ask = s.thread.find((m) => m.role === 'customer')?.text ?? '';
    const parts = [
      `- ${s.name} <${s.email}>: ${s.product_summary ?? 'inquiry'} — "${ask}"${fmt(s.estimated_value, s.currency)}`,
    ];
    if (s.next_action) parts.push(`next: ${s.next_action}`);
    if (s.missing?.length) parts.push(`awaiting: ${s.missing.join(', ')}`);
    return parts.join(' · ');
  });

  return `
<demo_business_data>
These are the demo company's live inquiries (sample data). Use this to answer questions about individual buyers, what they ordered or asked for, values, and status.

${lines.join('\n\n')}
</demo_business_data>`;
}