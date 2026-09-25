#!/usr/bin/env tsx
/**
 * Seed a realistic demo mailbox for Broadust Trading Ltd.
 *
 * Creates 8 conversations (email / WhatsApp / WeChat) with multi-turn
 * threads, varied statuses (active / human / bookmarked / ai_paused),
 * detected languages (en / zh), and external-search flags so every
 * inbox filter (Focused, Waiting on you, AI handled, Bookmarked,
 * All mail) shows believable content.
 *
 * Usage:
 *   npx tsx scripts/seed-mailbox.ts            # idempotent, safe to re-run
 *   npx tsx scripts/seed-mailbox.ts --reset    # delete seeded threads first
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname || __dirname, '..');
const COMPANY_NAME = 'Broadust Trading Ltd';

function loadEnv(): { url: string; key: string } {
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
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required (.env.local)');
  return { url, key };
}

const H = 60 * 60 * 1000;

interface SeedConv {
  channel: string;
  key: string;
  contact_name: string;
  contact_email?: string;
  contact_phone?: string;
  status: string;
  status_override?: string;
  detected_language: string;
  external_search_enabled: boolean;
  product_summary?: string;
  handoff_summary?: string;
  next_action?: string | null;
  messages: { role: 'customer' | 'assistant' | 'human' | 'user'; content: string; hoursAgo: number }[];
}

const SEEDS: SeedConv[] = [
  {
    channel: 'email',
    key: 'partner@oceancoltd.com',
    contact_name: 'Maria Chen',
    contact_email: 'partner@oceancoltd.com',
    status: 'active',
    detected_language: 'en',
    external_search_enabled: true,
    product_summary: 'Vacuum bottles (2,000) + silicone straws (5,000) + foldable bags (3,000)',
    next_action: 'Send revised quotation with logo artwork template',
    messages: [
      {
        role: 'customer',
        hoursAgo: 96,
        content: `Dear Broadust,

We would like to request a quotation for the following items for a corporate event in Q4:

1. 500ml Double-Wall Vacuum Bottle - 2,000 pcs
2. Reusable Silicone Straw Set - 5,000 sets
3. Foldable Reusable Shopping Bag - 3,000 pcs

Please advise your best FOB price, lead time, and MOQ. We would also like to know whether printing our logo on these items is available and any artwork requirements.

Looking forward to your quotation.

Best regards,
Maria Chen
Procurement Manager, Ocean & Co.`,
      },
      {
        role: 'assistant',
        hoursAgo: 94,
        content: `Dear Maria,

Thank you for your inquiry. Here is our best offer for Ocean & Co.:

1. 500ml Double-Wall Vacuum Bottle — USD 3.15/pc (FOB Ningbo), MOQ 500 pcs
2. Reusable Silicone Straw Set (4-pack) — USD 0.48/set, MOQ 1,000 sets
3. Foldable Reusable Shopping Bag (30L) — USD 0.78/pc, MOQ 1,000 pcs

Lead time is 25–30 days after artwork approval and 30% deposit.

Logo printing: yes — we offer pad printing, laser engraving, and full-color sublimation. Artwork in AI or PDF with PMS colors is sufficient; our art team can also prepare a die-strike/cost-free proof within 3 days.

May I send the full quotation document plus samples photos?

Best regards,
TradeFlow AI on behalf of Broadust`,
      },
      {
        role: 'customer',
        hoursAgo: 2,
        content: `Thanks Maria — the pricing works for bottles and bags. For the straw sets, can you do USD 0.44/set if we commit to 6,000 sets? Also please send the logo artwork template so we can prepare our event branding.`,
      },
    ],
  },
  {
    channel: 'email',
    key: 'sofia.rossi@verdegoods.it',
    contact_name: 'Sofia Rossi',
    contact_email: 'sofia.rossi@verdegoods.it',
    status: 'active',
    detected_language: 'en',
    external_search_enabled: false,
    product_summary: 'Ceramic coffee mugs (1,500, sublimation-ready)',
    next_action: 'Send PI + sample photos',
    messages: [
      {
        role: 'customer',
        hoursAgo: 76,
        content: `Hi,

We are Verde & Co, a giftware distributor in Milan. We need 1,500 x 350ml ceramic coffee mugs with full-wrap sublimation for a hotel chain rebrand.

Could you confirm:
- Unit price FOB
- MOQ
- whether the sublimation wrap area covers the full cup

Grazie,
Sofia`,
      },
      {
        role: 'assistant',
        hoursAgo: 73,
        content: `Dear Sofia,

Thank you! For 350ml white glazed ceramic mugs with full sublimation wrap:

- Unit price: USD 1.35/pc (FOB Ningbo)
- MOQ: 500 pcs (1,500 qualifies for the quoted tier)
- Sublimation wrap: yes, 360° coverage excluding the handle base

Lead time is 20–25 days after artwork approval. Shall I send a proforma invoice and a sample mug to your Milan office?

Best regards,
TradeFlow AI on behalf of Broadust`,
      },
      {
        role: 'customer',
        hoursAgo: 30,
        content: `Perfect, the price is fine. Please ship a sample to our Milan office before we approve the bulk order.`,
      },
    ],
  },
  {
    channel: 'email',
    key: 'amy.l@northwindpromo.com',
    contact_name: 'Amy Liu',
    contact_email: 'amy.l@northwindpromo.com',
    status: 'active',
    detected_language: 'en',
    external_search_enabled: false,
    handoff_summary: 'Amy needs 2,000 bottles with a two-sided logo by mid-March; asked for a 12% volume discount. Human rep to confirm discount and hold pricing.',
    next_action: 'Confirm 12% volume discount + sign-off on logo placement',
    status_override: 'human',
    messages: [
      {
        role: 'customer',
        hoursAgo: 50,
        content: `Hi Broadust,

Northwind Promotions — we're running a retail launch promo for a healthcare brand. Need 2,000 x 750ml stainless bottles, powder-coated, with our logo printed on both sides. Delivery must be in hand by mid-March.

Can you hold FOB pricing and confirm what a 12% volume discount looks like at this qty?

Thanks,
Amy Liu
Sourcing, Northwind Promotions`,
      },
      {
        role: 'assistant',
        hoursAgo: 47,
        content: `Dear Amy,

For 2,000 x 750ml stainless bottles (powder-coated, logo both sides):

- FOB Ningbo: USD 3.55/pc
- MOQ: 300 pcs
- Lead time: 28–32 days — fits mid-March if artwork is approved within this week

Regarding the 12% volume discount — your account manager will confirm shortly; at 2,000 pcs our standard band is 5–8%. May I connect you with the sales team for the final figure?

Best regards,
TradeFlow AI on behalf of Broadust`,
      },
      {
        role: 'human',
        hoursAgo: 20,
        content: `Hi Amy,

Thanks for the details. I can confirm a 10% discount at 2,000 pcs given the two-sided print setup — and I'll personally hold the FOB price through the end of the month. Artwork specs are attached for your agency.

Talk soon,
— Daniel (Sales, Broadust)`,
      },
      {
        role: 'customer',
        hoursAgo: 5,
        content: `Hi Daniel,

10% works for us if you can also include a free resin mock-up of the logo. I'm routing this to our brand team for artwork approval today. Will update you by Thursday.`,
      },
    ],
  },
  {
    channel: 'whatsapp',
    key: '+852 9123 4567',
    contact_name: 'George Wong',
    contact_phone: '+852 9123 4567',
    status: 'active',
    detected_language: 'zh',
    external_search_enabled: false,
    handoff_summary: 'HK distributor asking for stock availability on 500ml vacuum bottles; AI offered 800 pcs in 7 days at +8% rush. Waiting for qty confirmation.',
    next_action: 'Confirm rush order qty + deposit terms',
    messages: [
      {
        role: 'customer',
        hoursAgo: 26,
        content: `hi, 想確認下 500ml 不鏽鋼保溫瓶 而家有冇現貨？大概要 800 支，希望一星期內出到貨`,
      },
      {
        role: 'assistant',
        hoursAgo: 25,
        content: `你好 George 👋

而家 500ml 真空保溫杯我哋有少量庫存，可以安排 800 支、7 日內出貨（香港倉）。因為係急單，單價會係 USD 3.45/pc（FOB Ningbo）加 8% rush surcharge，MOQ 500 支已經達到。

總數確認後我即刻幫你留貨。需要我出 PI 俾你？`,
      },
      {
        role: 'customer',
        hoursAgo: 3,
        content: `ok 我同老闆confirm 數量，聽日俾你答覆。另外想問下可唔可以分兩批送，第一批 500 支 5 日內到，剩返 300 支一星期後？`,
      },
    ],
  },
  {
    channel: 'wechat',
    key: 'wechat__linjie',
    contact_name: 'Lin Jie',
    contact_phone: '微信: linjie_shop',
    status: 'bookmarked',
    detected_language: 'zh',
    external_search_enabled: true,
    handoff_summary: 'WeChat contact enquiring about bamboo utensil sets and insulated lunch bags for a retail chain; comparing two suppliers. Bookmarked for follow-up next week.',
    next_action: 'Follow up on 3,000 set + 2,000 bag quote',
    messages: [
      {
        role: 'customer',
        hoursAgo: 120,
        content: `你好，我係深圳市零售連鎖嘅採購。想了解竹製餐具套裝同保溫午餐袋嘅批發價，大概竹餐具 3000 套、午餐袋 2000 個，有冇批量優惠？`,
      },
      {
        role: 'assistant',
        hoursAgo: 118,
        content: `林小姐你好！

以下係詳細報價：
- 竹製餐具旅遊套裝（含叉、匙、筷、飲管+清潔刷）USD 2.05/set，MOQ 300
- 12L 保溫午餐袋（PEVA 內層）USD 2.45/pc，MOQ 500

3000 套 + 2000 個可享 4% 批量折扣，交期 22 天。我哋有現貨樣品可安排快遞到深圳俾你確認。

需要我準備 PI 或者寄樣品？`,
      },
      {
        role: 'human',
        hoursAgo: 72,
        content: `林小姐, 我哋可以再傾下。樣品今日已寄出, 順豐 2 日到, 單號我私下發你。另外如果 5,000+ 齊套, 我哋可以做到 6% 折扣。`,
      },
    ],
  },
  {
    channel: 'email',
    key: 'peter@greenfields-catering.com',
    contact_name: 'Peter Hale',
    contact_email: 'peter@greenfields-catering.com',
    status: 'active',
    detected_language: 'en',
    external_search_enabled: false,
    product_summary: 'Insulated lunch bags (1,200) + ceramic mugs (800) for field staff',
    next_action: 'Send combined quotation + freight estimate',
    messages: [
      {
        role: 'customer',
        hoursAgo: 40,
        content: `Morning,

Greenfields Catering (UK). We equip our field staff with branded kit each year. This year: 1,200 x 12L insulated lunch bags and 800 x 350ml ceramic mugs, both with our logo.

Please quote FOB and EXW, plus rough air/sea freight to Southampton, and expected lead time.

Cheers,
Peter Hale
Operations, Greenfields Catering`,
      },
      {
        role: 'assistant',
        hoursAgo: 38,
        content: `Hi Peter,

Thanks for the spec. Our offer:

- 12L Insulated Lunch Bag — USD 2.55/pc (FOB Ningbo)
- 350ml Ceramic Mug (sublimation) — USD 1.30/pc
- Combined lead time: 25 days after artwork approval

Freight estimate to Southampton: sea LCL ≈ USD 780 per CBM (14–18 days); air ≈ USD 3.85/kg (5–7 days). We can broker both incl. customs clearance.

Shall I produce the combined quotation PDF?

Best regards,
TradeFlow AI on behalf of Broadust`,
      },
      {
        role: 'customer',
        hoursAgo: 6,
        content: `Looks good — before the PDF, what embossing options do you have for the lunch bags, and is a cotton drawstring upgrade possible on the mug wrap? Want to present options to our branding committee.`,
      },
    ],
  },
  {
    channel: 'wechat',
    key: 'wechat__weylandt',
    contact_name: 'Wei Landt',
    contact_phone: '微信: weylandt',
    status: 'active',
    detected_language: 'zh',
    external_search_enabled: false,
    handoff_summary: 'R&D sourcing enquiry about custom double-wall bottle with temperature display; AI explained standard options and asked for target MOQ.',
    next_action: 'Await target MOQ / target price for custom display bottle',
    messages: [
      {
        role: 'customer',
        hoursAgo: 90,
        content: `Hi, 想問下你哋可唔可以做有溫度顯示嘅真空保溫杯？我哋係做智能水杯嘅新品牌，想睇下有冇現成方案或者改裝方案。`,
      },
      {
        role: 'assistant',
        hoursAgo: 88,
        content: `你好！

溫度顯示方案我哋可以配合：
1) 現成方案 — 杯蓋帶 LED 數顯溫度計（紐扣電池），MOQ 2,000 支
2) 改裝方案 — 客製杯蓋模組，可以同現有 500ml 杯身組合

請問你哋目標 MOQ 同目標單價大概係幾多？我可以安排工程樣品（大約 3-4 週）安排睇實物效果。`,
      },
      {
        role: 'customer',
        hoursAgo: 84,
        content: `目標係 5,000 支以上, 單價希望 USD 6 以內。可唔可以寄工程樣品? 我哋想年尾前出 DEMO。`,
      },
    ],
  },
  {
    channel: 'email',
    key: 'emily.zhao@harbingtrade.com',
    contact_name: 'Emily Zhao',
    contact_email: 'emily.zhao@harbingtrade.com',
    status: 'active',
    detected_language: 'en',
    external_search_enabled: false,
    handoff_summary: '',
    next_action: null,
    messages: [
      {
        role: 'customer',
        hoursAgo: 11,
        content: `Hello,

We're Harbin Trading Co. Do you carry aluminium keychain bottle openers for promotional giveaways? Looking for ~10,000 pcs, laser-engraved with a 2-color logo, FOB China. Please share the best tiered pricing and turnaround.

Thanks,
Emily Zhao
Purchasing, Harbin Trading`,
      },
      {
        role: 'assistant',
        hoursAgo: 9,
        content: `Hi Emily,

Good news — that's our standard promo line.

- Aluminium Keychain Bottle Opener — USD 0.24/pc at 10,000 pcs (FOB Ningbo)
- Laser engraving: included free for a 1-color logo
- MOQ: 2,000 pcs; tiered pricing breaks below that
- Turnaround: 12–15 days after artwork approval (fast for this line)

Would you like a sample pack of the 6 colour options shipped out — we can courier today, arrives in ~5 days.

Best regards,
TradeFlow AI on behalf of Broadust`,
      },
      {
        role: 'customer',
        hoursAgo: 2,
        content: `Great — yes please send the colour samples. Our brand team would also like the SVG version of the artwork template you mentioned.`,
      },
    ],
  },
];

function hoursAgoISO(h: number): string {
  return new Date(Date.now() - h * H).toISOString();
}

async function main() {
  const { url, key } = loadEnv();
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const reset = process.argv.includes('--reset');

  const { data: company, error: cErr } = await supabase
    .from('companies')
    .select('id, name')
    .eq('name', COMPANY_NAME)
    .maybeSingle();
  if (cErr) throw new Error(`company lookup: ${cErr.message}`);
  if (!company) throw new Error(`Company "${COMPANY_NAME}" not found — run scripts/seed-demo.ts first.`);

  let seeded = 0;
  for (const seed of SEEDS) {
    const lookup: Record<string, unknown> = { company_id: company.id, channel: seed.channel };
    if (seed.contact_phone !== undefined) lookup.contact_phone = seed.contact_phone;
    else lookup.contact_email = seed.contact_email;

    let { data: conv } = await supabase
      .from('conversations')
      .select('*')
      .match(lookup)
      .maybeSingle();

    if (conv && reset) {
      await supabase.from('conversations').delete().eq('id', conv.id);
      conv = null;
    }
    if (!conv) {
      const row: Record<string, unknown> = {
        company_id: company.id,
        channel: seed.channel,
        contact_name: seed.contact_name,
        status: (seed.status_override ?? seed.status) || 'active',
        detected_language: seed.detected_language || 'en',
        external_search_enabled: !!seed.external_search_enabled,
        source_channel: seed.channel,
        currency: 'USD',
        created_at: hoursAgoISO(seed.messages[0].hoursAgo),
        updated_at: hoursAgoISO(seed.messages[seed.messages.length - 1].hoursAgo),
      };
      if (seed.contact_email) row.contact_email = seed.contact_email;
      if (seed.contact_phone) row.contact_phone = seed.contact_phone;
      if (seed.handoff_summary) row.handoff_summary = seed.handoff_summary;
      if (seed.product_summary) row.product_summary = seed.product_summary;
      if (seed.next_action) row.next_action = seed.next_action;

      const { data: inserted, error: iErr } = await supabase
        .from('conversations')
        .insert(row)
        .select()
        .single();
      if (iErr) {
        console.error(`  ✗ ${seed.contact_name} (${seed.channel}): ${iErr.message}`);
        continue;
      }
      conv = inserted;
    }

    // Replace messages with the seed thread (single-run fidelity)
    await supabase.from('messages').delete().eq('conversation_id', conv.id);
    const msgs = seed.messages.map((m, i) => ({
      conversation_id: conv.id,
      role: m.role,
      content: m.content,
      created_at: hoursAgoISO(m.hoursAgo),
      tokens_used: 0,
    }));
    const { error: mErr } = await supabase.from('messages').insert(msgs);
    if (mErr) {
      console.error(`  ✗ messages ${seed.contact_name}: ${mErr.message}`);
      continue;
    }
    seeded++;
    console.log(`  ✓ ${seed.contact_name} (${seed.channel}) — ${msgs.length} msgs, status=${conv.status}`);
  }

  console.log(`\nSeeded ${seeded} conversations for ${company.name} (${company.id})`);
}

main().catch((err) => {
  console.error('Seed failed:', err.message || err);
  process.exit(1);
});