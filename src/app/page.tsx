'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import SiteHeader from '@/components/landing/SiteHeader';
import HeroDemo from '@/components/landing/HeroDemo';
import Reveal from '@/components/landing/Reveal';
import PricingPrice from '@/components/landing/PricingPrice';
import { useLang } from '@/lib/lang';
import {
  HeroProduct,
  ExtractionMock,
  InboxMock,
  HandoffMock,
  QuoteMock,
  WhatsAppMock,
} from '@/components/landing/ProductMocks';

/* ── Content ─────────────────────────────────────────────────────────────── */

type Bi = [en: string, zh: string];

const PROOF: { title: Bi; body: Bi }[] = [
  {
    title: ['Every field shows its work', '每個欄位都有出處'],
    body: [
      'Each extracted spec carries a confidence, a status and the source it came from — never a black-box summary you have to trust.',
      '每個擷取的規格都附有可信度、狀態與來源，絕非只能硬信的黑箱摘要。',
    ],
  },
  {
    title: ['Approved, not auto-sent', '待您批准，絕不自動發送'],
    body: [
      'Replies and quotes stay drafts until you say go. Nothing leaves your mailbox without you.',
      '回覆與報價在您確認前都是草稿，未經您同意不會離開您的信箱。',
    ],
  },
  {
    title: ['Your prices, your margins', '您的價格，您的利潤'],
    body: [
      'Quote lines are calculated from your product list and margin rules — not invented by a language model.',
      '報價行由您的產品清單與利潤規則計算，並非由語言模型憑空生成。',
    ],
  },
];

const FACTS: { value: Bi; label: Bi }[] = [
  { value: ['1 click', '一按'], label: ['Connects Gmail or Outlook', '連接 Gmail 或 Outlook'] },
  { value: ['4', '4'], label: ['Languages, incl. mixed threads', '語言，含混合對話'] },
  { value: ['3 days', '3 天'], label: ['Before a quiet thread is chased', '靜默對話自動跟進'] },
  { value: ['Every quote', '每份報價'], label: ['Waits for your sign-off', '都待您簽核'] },
];

const QUEUE: { label: Bi; tone: string; title: Bi; body: Bi }[] = [
  {
    label: ['Needs specs', '待補規格'],
    tone: '#8A8279',
    title: ['Waiting on the buyer', '等待買方'],
    body: [
      'The inquiry is missing something you need before it can be priced. Sailwise drafts the one question to ask, in their language.',
      '詢盤尚缺計價所需的資料。Sailwise 以對方的語言草擬唯一要問的問題。',
    ],
  },
  {
    label: ['Owed replies', '待您回覆'],
    tone: '#B4552D',
    title: ['Waiting on you', '等待您'],
    body: [
      'The customer asked something and is still waiting. These are the threads quietly costing you the deal.',
      '客戶提出了問題，仍在等候。這些正是悄悄流失訂單的對話。',
    ],
  },
  {
    label: ['Needs you', '需要您'],
    tone: '#14342B',
    title: ['Ready for sign-off', '待您簽核'],
    body: [
      'A reply or a quote has been drafted and is sitting in your approval queue, one tap from going out.',
      '回覆或報價已草擬完成，正躺在您的批准佇列中，一按即可送出。',
    ],
  },
];

const EXTRACTION: { label: Bi; title: Bi; body: Bi; points: Bi[] }[] = [
  {
    label: ['Extraction', '擷取'],
    title: ['Every spec carries its source', '每個規格都附帶來源'],
    body: [
      'Each field lands with the line it came from, a confidence and a status — so you can see exactly what Sailwise read, and exactly what it is still unsure about.',
      '每個欄位都連同來源行、可信度與狀態一起落地——您看得見 Sailwise 讀到了什麼，以及哪裡仍不確定。',
    ],
    points: [
      ['Quantities, materials, certifications and lead times', '數量、材質、認證與交期'],
      ['Attachments parsed alongside the message', '附件與訊息一併解析'],
      ['Low-confidence fields flagged, never quietly filled in', '可信度低的欄位會標示，絕不悄悄填補'],
    ],
  },
  {
    label: ['Clarification', '釐清'],
    title: ['Gaps get asked about, not assumed', '缺漏用問的，不用猜的'],
    body: [
      'What is missing becomes one plain question in the buyer’s own language — drafted for you to approve, never sent on its own.',
      '缺漏的資料會變成一句對方語言的具體問題——由您草擬批准，絕不自行寄出。',
    ],
    points: [
      ['Target price, Incoterm, destination and date', '目標價、貿易條件、目的地與日期'],
      ['Drafted in English, 繁體中文, 简体中文 or Español', '以英文、繁體中文、簡體中文或西班牙文草擬'],
      ['Flagged before quoting so nothing is guessed on your behalf', '報價前先標示，絕不代您臆測'],
    ],
  },
];

const STEPS: { code: string; title: Bi; body: Bi }[] = [
  {
    code: 'INBOUND',
    title: ['The inquiry arrives', '詢盤送達'],
    body: [
      'A buyer’s email lands in the mailbox you already use — no new app for your team or your customers to learn.',
      '買家的電郵落入您現用的信箱——團隊與客戶都無需學習新應用。',
    ],
  },
  {
    code: 'EXTRACT',
    title: ['Specs, extracted', '擷取規格'],
    body: [
      'Quantities, materials, certifications and lead times are pulled out and pinned to the line they came from.',
      '數量、材質、認證與交期全被擷取，並釘在原本的那一行。',
    ],
  },
  {
    code: 'CLARIFY',
    title: ['Gaps get clarified', '釐清缺漏'],
    body: [
      'Target price, Incoterm, destination. Sailwise flags what is missing and drafts one question in the customer’s language.',
      '目標價、貿易條件、目的地。Sailwise 標示缺漏，並以客戶的語言草擬一個問題。',
    ],
  },
  {
    code: 'QUOTE',
    title: ['The quote is drafted', '草擬報價'],
    body: [
      'Priced from your product list and your margin rules — nothing invented, and any line that cannot be matched is flagged for review.',
      '依您的產品清單與利潤規則定價——絕不憑空生成，無法比對的行會標示待審核。',
    ],
  },
];

const GATES: { label: Bi; title: Bi; body: Bi }[] = [
  {
    label: ['Approval', '批准'],
    title: ['Every message is a draft', '每則訊息都是草稿'],
    body: [
      'Replies, quotes and follow-ups all wait for your sign-off before they send.',
      '回覆、報價與跟進在送出前都等待您簽核。',
    ],
  },
  {
    label: ['Knowledge', '知識'],
    title: ['Your rules do the pricing', '定價由您的規則決定'],
    body: [
      'Products, margins, certifications and FAQ rules define what the AI may say and charge.',
      '產品、利潤、認證與 FAQ 規則界定 AI 可說什麼、可收多少。',
    ],
  },
  {
    label: ['Handover', '交接'],
    title: ['Step in — and hand it back', '隨時接手——再交還給 AI'],
    body: [
      'Sailwise flags the sensitive threads — a discount, a complaint, a big order — and hands over. Take control mid-conversation, then hand it back to the AI when you are done.',
      'Sailwise 會標示敏感對話——折扣、投訴、大額訂單——並交棒給您。您可中途接管，處理完再交回 AI。',
    ],
  },
];

const PLANS = [
  {
    name: ['Starter', '入門'] as Bi,
    price: 'HK$1,880',
    period: '/mo',
    features: [
      ['Email inbox (Google / Microsoft)', '電郵收件匣（Google / Microsoft）'],
      ['WhatsApp alerts when a thread needs you', '對話需要您時發出 WhatsApp 提示'],
      ['Unlimited AI conversations', '無限 AI 對話'],
      ['Unlimited products & FAQ rules', '無限產品與 FAQ 規則'],
      ['English, Traditional & Simplified Chinese, Spanish', '英文、繁體及簡體中文、西班牙文'],
      ['Human takeover anytime', '隨時由真人接手'],
    ] as Bi[],
  },
];

const FAQS: { q: Bi; a: Bi }[] = [
  {
    q: ['Does it work with the email I already use?', '它適用於我現用的電郵嗎？'],
    a: [
      'Yes. Sailwise runs over your existing mailbox with a one-click Google or Microsoft connection — no new software for your team or your customers.',
      '是。Sailwise 直接運作於您現有的信箱，一鍵連接 Google 或 Microsoft——團隊與客戶都無需安裝新軟件。',
    ],
  },
  {
    q: ['Can it handle Chinese and mixed-language messages?', '能處理中文及混合語言的訊息嗎？'],
    a: [
      'It reads and replies in English, Traditional and Simplified Chinese, Spanish, and mixed-language threads — common across HK and Shenzhen trade.',
      '它能閱讀並以英文、繁體及簡體中文、西班牙文回覆，也能處理混合語言的對話——這在香港與深圳貿易中十分常見。',
    ],
  },
  {
    q: ['Who controls what actually gets sent?', '由誰決定實際送出的內容？'],
    a: [
      'You do. Every reply and every quote is a draft until you approve it. Sailwise cites where each number came from so you can verify fast.',
      '由您決定。每則回覆與每份報價在您批准前都是草稿。Sailwise 會標明每個數字的來源，讓您快速核對。',
    ],
  },
  {
    q: ['How does the WhatsApp feature work?', 'WhatsApp 功能如何運作？'],
    a: [
      'WhatsApp is how Sailwise reaches you, not a channel your customers talk to. When a thread needs a decision — a discount request, a large order — you get an alert with the sender, product and quantity. Replies and quotes always send as normal email from your own mailbox, so your customers see the address they already know.',
      'WhatsApp 是 Sailwise 聯絡您的方式，並非客戶洽談的渠道。當對話需要決定——例如折扣請求或大額訂單——您會收到附有寄件人、產品與數量的提示。回覆與報價一律以您自己信箱的一般電郵寄出，客戶看到的仍是他們熟悉的地址。',
    ],
  },
  {
    q: ['Do I need to be technical to set it up?', '設定需要技術背景嗎？'],
    a: [
      'No. Guided setup connects your mailbox, imports your products and gets you approving your first draft the same day.',
      '不需要。引導式設定會連接您的信箱、匯入產品，讓您當天就能批准第一份草稿。',
    ],
  },
  {
    q: ['Is my product and pricing data safe?', '我的產品與價格資料安全嗎？'],
    a: [
      'Your knowledge base is private to your company, stored encrypted, and never used to train models shared with other customers.',
      '您的知識庫專屬於您的公司，以加密方式儲存，絕不會用於訓練與其他客戶共用的模型。',
    ],
  },
];

/* ── Shared ──────────────────────────────────────────────────────────────── */

function SectionHead({
  label,
  title,
  sub,
  size = 'default',
  align = 'left',
}: {
  label: string;
  title: ReactNode;
  sub?: ReactNode;
  /** 'major' promotes a section so the page reads with a hierarchy instead of
      eight identical headings. */
  size?: 'default' | 'major';
  align?: 'left' | 'center';
}) {
  const titleSize =
    size === 'major'
      ? 'text-[clamp(2.2rem,4.4vw,3.5rem)]'
      : 'text-[clamp(1.9rem,3.6vw,2.9rem)]';
  return (
    <Reveal className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className="eyebrow">{label}</p>
      <h2 className={`display mt-4 text-balance ${titleSize}`}>{title}</h2>
      {sub && (
        <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--ink-2)]">{sub}</p>
      )}
    </Reveal>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-[15px] leading-relaxed text-[var(--ink-2)]">
      <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-[var(--pine)]" />
      {children}
    </li>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const { t } = useLang();

  return (
    <div className="landing min-h-screen">
      {/* Paper tooth + two slow washes. Fixed, click-through, and switched off
          entirely under prefers-reduced-motion. */}
      <div className="landing-ambience" aria-hidden="true">
        <span className="landing-blob landing-blob-peach" />
        <span className="landing-blob landing-blob-pine" />
      </div>

      <SiteHeader />

      {/* ── Hero ── */}
      <section className="hero-wash px-6 pt-32 pb-16 md:pt-40 md:pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">{t('For HK & Shenzhen trading companies', '專為香港及深圳貿易公司而設')}</p>
            <h1 className="display mt-6 text-[clamp(2.5rem,6.4vw,4.5rem)]">
              {t('Chase the specs.', '規格，追到齊。')}
              <br />
              <em>{t('Clear the reply debt.', '回覆債，清零。')}</em>
            </h1>
            <p className="mx-auto mt-7 max-w-xl text-balance text-[1.0625rem] leading-[1.75] text-[var(--ink-2)]">
              {t(
                'Sailwise reads every buyer email, pulls out the specs, chases what is still missing, and drafts the reply you owe — so no inquiry sits unanswered. You approve every word before it sends.',
                'Sailwise 讀遍每封買家來信，擷取規格、追齊缺漏，並草擬您該回的那一封——讓每封詢盤都不再懸而未決。每個字都由您批准後才送出。'
              )}
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="group btn-primary w-full px-6 py-3 sm:w-auto">
                {t('Start free trial', '開始免費試用')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="#product" className="btn-ghost w-full px-6 py-3 sm:w-auto">
                {t('See the product', '查看產品')}
              </Link>
            </div>
            <p className="mt-5 text-[13px] text-[var(--ink-3)]">
              {t('14-day free trial · Card required · Cancel anytime', '14 天免費試用 · 需綁定信用卡 · 隨時取消')}
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-5xl md:mt-20">
            <HeroProduct />
          </div>
        </div>
      </section>

      {/* ── Product facts ── */}
      <section className="border-y border-[var(--hairline)] px-6 py-14">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--hairline)] sm:grid-cols-4">
          {FACTS.map((f, i) => (
            <Reveal key={i} delay={i * 70} className="bg-[var(--paper)] px-5 py-7 text-center">
              <div className="display text-[1.55rem] leading-tight">{t(f.value[0], f.value[1])}</div>
              <div className="mt-2 text-[12.5px] leading-snug text-[var(--ink-3)]">
                {t(f.label[0], f.label[1])}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Statement ── */}
      <section className="band-terra px-6 py-24 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <p className="display text-[clamp(1.7rem,3.8vw,2.9rem)] leading-[1.22]">
            {t('While you sleep, customers message three suppliers at once.', '當您在休息，客戶同時向三家供應商詢價。')}
            <br className="hidden sm:block" />
            {t(' Sailwise replies ', ' Sailwise 率先回覆')}
            <em>{t('first', '')}</em>
            {t('.', '。')}
          </p>
          <p className="mx-auto mt-7 max-w-lg text-[15px] leading-relaxed text-[rgba(244,241,236,0.68)]">
            {t(
              'In seconds, in their language, with pricing pulled from your own data.',
              '數秒內，以客戶的語言回覆，價格全部取自您自己的資料。'
            )}
          </p>
        </div>
      </section>

      {/* ── Proof trio ── */}
      <section className="border-b border-[var(--hairline)] bg-[var(--paper-2)] px-6 py-16 md:py-20">
        <div className="mx-auto grid max-w-6xl gap-px overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--hairline)] md:grid-cols-3">
          {PROOF.map((p, i) => (
            <Reveal key={i} delay={i * 80} className="bg-[var(--paper-2)] px-7 py-8">
              <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--ink-3)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="display mt-4 text-[1.3rem]">{t(p.title[0], p.title[1])}</h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--ink-2)]">
                {t(p.body[0], p.body[1])}
              </p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Extraction ── */}
      <section id="extraction" className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            size="major"
            label={t('Extraction', '擷取')}
            title={t('Specs, pinned to the source', '規格，釘在來源那一行')}
            sub={t(
              'Quantities, materials, certifications and lead times are pulled from the thread and tied to source lines — nothing is inferred.',
              '數量、材質、認證與交期都從對話中擷取，並綁定到來源行——絕不憑空推測。'
            )}
          />
          <div className="mt-14 grid gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-16">
            <div className="order-2 min-w-0 lg:order-1">
              <ExtractionMock />
            </div>
            <div className="order-1 space-y-11 lg:order-2">
              {EXTRACTION.map((b, i) => (
                <Reveal key={b.label[0]} delay={i * 110}>
                  <p className="eyebrow">{t(b.label[0], b.label[1])}</p>
                  <h3 className="display mt-3 text-[1.45rem]">{t(b.title[0], b.title[1])}</h3>
                  <p className="mt-3 text-[15.5px] leading-[1.75] text-[var(--ink-2)]">
                    {t(b.body[0], b.body[1])}
                  </p>
                  <ul className="mt-5 space-y-3">
                    {b.points.map((p, j) => (
                      <Bullet key={j}>{t(p[0], p[1])}</Bullet>
                    ))}
                  </ul>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Product: the inbox as a work queue ── */}
      <section
        id="product"
        className="border-y border-[var(--hairline)] bg-[var(--pine-wash)] px-6 py-24 md:py-32"
      >
        <div className="mx-auto max-w-6xl">
          <SectionHead
            size="major"
            label={t('One inbox', '單一收件匣')}
            title={t('Your mailbox, turned into a work queue', '把您的信箱變成工作佇列')}
          />
          <div className="mt-14 grid gap-14 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-center lg:gap-16">
            <div>
              <p className="max-w-lg text-[17px] leading-[1.75] text-[var(--ink-2)]">
                {t(
                  'Inquiries land in the mailbox you already use — Gmail or Outlook, connected in one click. Sailwise extracts the specs, flags what is missing, and sorts every thread by what it needs from you next.',
                  '詢盤落入您現用的信箱——Gmail 或 Outlook，一鍵連接。Sailwise 擷取規格、標示缺漏，並依每條對話下一步的需要排序。'
                )}
              </p>
              <ul className="mt-7 space-y-3.5">
                <Bullet>{t('Works over the Gmail or Outlook mailbox you already use', '直接運作於您現用的 Gmail 或 Outlook 信箱')}</Bullet>
                <Bullet>{t('Specs, quantities and gaps pulled from the thread and its attachments', '從對話與附件擷取規格、數量與缺漏')}</Bullet>
                <Bullet>{t('Replies drafted in the customer’s own language', '以客戶的語言草擬回覆')}</Bullet>
              </ul>
            </div>
            <div className="min-w-0">
              <InboxMock />
            </div>
          </div>

          {/* The three states every thread gets sorted into. */}
          <div className="mt-20 grid gap-10 border-t border-[var(--hairline-2)] pt-14 md:grid-cols-3 md:gap-14">
            {QUEUE.map((q, i) => (
              <Reveal key={i} delay={i * 90}>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: q.tone }} />
                  <span
                    className="font-mono text-[11px] tracking-[0.18em] uppercase"
                    style={{ color: q.tone }}
                  >
                    {t(q.label[0], q.label[1])}
                  </span>
                </div>
                <h3 className="display mt-4 text-[1.35rem]">{t(q.title[0], q.title[1])}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink-2)]">
                  {t(q.body[0], q.body[1])}
                </p>
              </Reveal>
            ))}
          </div>
          <p className="mt-10 max-w-2xl text-[14px] leading-relaxed text-[var(--ink-3)]">
            {t(
              'Each thread’s state is derived from the conversation itself — who spoke last, what is still missing, how many chases have gone unanswered — so the queue stays current without anyone maintaining it.',
              '每條對話的狀態由對話本身推導——誰最後發言、還缺什麼、追問了幾次未回——佇列無需人手維護，始終保持最新。'
            )}
          </p>
        </div>
      </section>

      {/* ── Control (dark) ── */}
      <section className="band-dark px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16">
            <div>
              <p className="eyebrow">{t('Built-in control', '內建掌控')}</p>
              <h2 className="display mt-4 text-[clamp(1.9rem,3.6vw,2.9rem)]">
                {t('AI does the legwork.', 'AI 負責苦工。')}
                <br />
                {t('You stay in ', '主導權在')}
                <em>{t('control', '您手中')}</em>
                {t('.', '。')}
              </h2>
              <p className="mt-6 max-w-lg text-[16px] leading-[1.75] text-[rgba(244,241,236,0.7)]">
                {t(
                  'Nothing is sent on your behalf without a decision. Every message is a draft, every number is traceable, and you can take over any thread mid-conversation.',
                  '未經您決定，不會代您發送任何內容。每則訊息都是草稿，每個數字都可溯源，您可隨時接手任何對話。'
                )}
              </p>
              <ul className="mt-9 space-y-7">
                {GATES.map((g, i) => (
                  <li key={i}>
                    <p className="font-mono text-[11px] tracking-[0.2em] text-[rgba(244,241,236,0.5)] uppercase">
                      {t(g.label[0], g.label[1])}
                    </p>
                    <p className="display mt-2 text-[1.25rem]">{t(g.title[0], g.title[1])}</p>
                    <p className="mt-1.5 max-w-md text-[14.5px] leading-relaxed text-[rgba(244,241,236,0.62)]">
                      {t(g.body[0], g.body[1])}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="min-w-0">
              <HandoffMock />
            </div>
          </div>
        </div>
      </section>

      {/* ── Quotes ── */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            size="major"
            label={t('Quotes', '報價')}
            title={t('Quotes in seconds, priced from your data', '數秒完成報價，價格取自您的資料')}
          />
          <div className="mt-6 grid gap-14 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-center lg:gap-16">
            <div>
              <p className="max-w-lg text-[17px] leading-[1.75] text-[var(--ink-2)]">
                {t(
                  'Every line is priced from your own product list and your margin rules, and shown on the quote so you can check it in seconds. You approve it before it sends as a normal email.',
                  '每一行都由您自己的產品清單與利潤規則定價，並顯示於報價單上，讓您數秒內核對。送出前由您批准，以一般電郵寄出。'
                )}
              </p>
              <ul className="mt-7 space-y-3.5">
                <Bullet>{t('Priced from your product list and margin rules', '依產品清單與利潤規則定價')}</Bullet>
                <Bullet>{t('Lines that cannot be matched confidently are flagged, not guessed', '無法確信匹配的行會被標示，而非臆測')}</Bullet>
                <Bullet>{t('One click to send from your own mailbox', '一按即從您的信箱寄出')}</Bullet>
              </ul>
            </div>
            <div className="min-w-0">
              <QuoteMock />
            </div>
          </div>
        </div>
      </section>

      {/* ── Mid-page CTA ── */}
      <section className="px-6 pb-4">
        <div className="mx-auto max-w-6xl">
          <Reveal className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-[var(--hairline)] bg-[var(--paper-2)] px-8 py-7 sm:flex-row sm:items-center">
            <div>
              <p className="display text-[1.4rem]">
                {t('See it on your own inquiries.', '用您自己的詢盤試一次。')}
              </p>
              <p className="mt-1.5 text-[14.5px] text-[var(--ink-2)]">
                {t('Connect a mailbox, approve your first draft the same day.', '連接信箱，當天就能批准第一份草稿。')}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row sm:items-center">
              <Link href="/signup" className="group btn-primary px-5 py-2.5 text-[14px]">
                {t('Start free trial', '開始免費試用')}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="mailto:tradeflow.hk@gmail.com?subject=Demo%20request"
                className="btn-ghost px-5 py-2.5 text-[14px]"
              >
                {t('Book a demo', '預約示範')}
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── WhatsApp ── */}
      <section className="border-t border-[var(--hairline)] bg-[var(--paper-2)] px-6 py-24 md:py-28">
        <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-20">
          <div className="order-2 lg:order-1">
            <WhatsAppMock />
          </div>
          <div className="order-1 lg:order-2">
            <p className="eyebrow">{t('Alerts', '提示')}</p>
            <h2 className="display mt-4 text-[clamp(1.9rem,3.6vw,2.7rem)]">
              {t('Know the moment', '一有需要您的事，')}
              <br />
              {t('something needs you.', '立即知道。')}
            </h2>
            <p className="mt-6 max-w-lg text-[16px] leading-[1.75] text-[var(--ink-2)]">
              {t(
                'When a thread needs a decision, Sailwise sends a WhatsApp alert with the sender, the product and the quantity — so a deal never goes cold while you are away from your desk. Replies and quotes still go out as normal email from your own address.',
                '當對話需要決定，Sailwise 會發送 WhatsApp 提示，附上寄件人、產品與數量——讓商機在您離開座位時不會冷掉。回覆與報價仍以您自己的地址、一般電郵寄出。'
              )}
            </p>
            <ul className="mt-7 space-y-3.5">
              <Bullet>{t('WhatsApp alert when a thread needs a decision', '對話需要決定時發出 WhatsApp 提示')}</Bullet>
              <Bullet>{t('Sender, product, quantity and status at a glance', '寄件人、產品、數量與狀態一目了然')}</Bullet>
              <Bullet>{t('Replies and quotes always sent from your own mailbox', '回覆與報價一律從您的信箱寄出')}</Bullet>
            </ul>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl">
          <SectionHead
            label={t('How it works', '運作方式')}
            title={t('From inquiry to quote, end to end', '從詢盤到報價，端到端')}
            sub={t('The whole pipeline, with you approving every message.', '完整流程，每則訊息都由您批准。')}
          />
          {/* The same four stages the STEPS copy described, but played out —
              the demo advances itself and pauses when you interact with it. */}
          <div className="mt-12">
            <HeroDemo />
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section
        id="pricing"
        className="border-y border-[var(--hairline)] bg-[var(--paper-2)] px-6 py-24 md:py-32"
      >
        <div className="mx-auto max-w-2xl text-center">
          <SectionHead
            label={t('Pricing', '價格')}
            title={t('One plan. Everything included.', '單一方案，全部包含。')}
            align="center"
          />
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-[var(--ink-2)]">
            {t(
              '14-day free trial, then HK$1,880 per month. Cancel anytime.',
              '14 天免費試用，其後每月 HK$1,880。隨時取消。'
            )}
          </p>

          <div className="plan-card mx-auto mt-12 max-w-[460px] p-8 text-left md:p-9">
            <div className="flex items-baseline justify-between">
              <span className="display text-[1.35rem]">{t(PLANS[0].name[0], PLANS[0].name[1])}</span>
              <span className="font-mono text-[10px] tracking-[0.16em] text-[var(--pine)] uppercase">
                {t('everything included', '全部包含')}
              </span>
            </div>
            <PricingPrice monthly={PLANS[0].price} annual="HK$1,504" period={PLANS[0].period} />
            <div className="mt-6 mb-6 h-px bg-[var(--hairline)]" />
            <ul className="space-y-3">
              {PLANS[0].features.map((f, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-[14.5px] leading-snug text-[var(--ink-2)]"
                >
                  <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[var(--pine)]" strokeWidth={2.5} />
                  {t(f[0], f[1])}
                </li>
              ))}
            </ul>
            <div className="mt-8 border-t border-[var(--hairline)] pt-6">
              <Link href="/signup" className="group btn-primary w-full py-3">
                {t('Start free trial', '開始免費試用')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <p className="mt-3 text-center text-[12px] text-[var(--ink-3)]">
                {t('14-day free trial · Card required · Cancel anytime', '14 天免費試用 · 需綁定信用卡 · 隨時取消')}
              </p>
            </div>
          </div>

          <p className="mx-auto mt-8 max-w-md text-[13.5px] leading-relaxed text-[var(--ink-3)]">
            {t('Annual billing is HK$1,504/month. Need a bigger team or custom workflows? ', '年繳為每月 HK$1,504。需要更大團隊或自訂流程？')}
            <a
              href="mailto:tradeflow.hk@gmail.com"
              className="text-[var(--pine)] underline underline-offset-4"
            >
              {t('Talk to us', '聯絡我們')}
            </a>
            {t('.', '。')}
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-3xl">
          <SectionHead
            label={t('FAQ', '常見問題')}
            title={t('Questions, answered', '疑問解答')}
            sub={t('Everything traders ask us before starting.', '貿易商在開始前最常問的問題。')}
          />
          <div className="mt-12">
            {FAQS.map((f, i) => (
              <Reveal key={i} delay={Math.min(i, 5) * 60}>
                <details className="faq-item group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-left">
                  <span className="display text-[1.15rem] md:text-[1.3rem]">{t(f.q[0], f.q[1])}</span>
                  <svg
                    className="h-4 w-4 shrink-0 text-[var(--ink-3)] transition-transform duration-300 group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </summary>
                <p className="-mt-1 max-w-2xl pb-7 text-[15.5px] leading-[1.75] text-[var(--ink-2)]">
                  {t(f.a[0], f.a[1])}
                </p>
              </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="band-dark px-6 py-24 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="display text-[clamp(2rem,4.4vw,3.25rem)]">
            {t('Stop copy-pasting quotes.', '別再複製貼上報價。')}
          </h2>
          <p className="mx-auto mt-6 max-w-md text-[16px] leading-relaxed text-[rgba(244,241,236,0.7)]">
            {t('Let Sailwise answer first — then close the deal.', '讓 Sailwise 先回覆——然後成交。')}
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="group inline-flex w-full items-center justify-center gap-1.5 rounded-[9px] bg-[#faf7f2] px-6 py-3 text-[14px] font-medium text-[var(--pine-deep)] transition hover:-translate-y-px sm:w-auto"
            >
              {t('Start free trial', '開始免費試用')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="mailto:tradeflow.hk@gmail.com?subject=Demo%20request"
              className="inline-flex w-full items-center justify-center rounded-[9px] border border-[rgba(244,241,236,0.28)] px-6 py-3 text-[14px] font-medium text-[#f4f1ec] transition hover:border-[rgba(244,241,236,0.6)] sm:w-auto"
            >
              {t('Book a demo', '預約示範')}
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--hairline)] px-6 py-16">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <img
                src="/brand/sailwise-logo.png"
                alt=""
                aria-hidden="true"
                className="h-7 w-auto object-contain"
              />
              <span className="display text-[1.05rem]">Sailwise</span>
            </div>
            <p className="mt-4 max-w-[300px] text-[14px] leading-relaxed text-[var(--ink-2)]">
              {t(
                'The AI sales assistant for HK and Shenzhen trading companies — from inquiry to sent quote, with you approving every message.',
                '專為香港及深圳貿易公司而設的 AI 銷售助理——從詢盤到寄出報價，每則訊息都由您批准。'
              )}
            </p>
            <p className="mt-8 text-[12px] text-[var(--ink-3)]">
              {t('© 2026 Sailwise. All rights reserved.', '© 2026 Sailwise。版權所有。')}
            </p>
          </div>
          <div>
            <p className="eyebrow">{t('Product', '產品')}</p>
            <ul className="mt-5 space-y-3 text-[14px]">
              <li>
                <a href="#product" className="footer-link">
                  {t('One inbox', '單一收件匣')}
                </a>
              </li>
              <li>
                <a href="#extraction" className="footer-link">
                  {t('Extraction', '擷取')}
                </a>
              </li>
              <li>
                <a href="#pricing" className="footer-link">
                  {t('Pricing', '價格')}
                </a>
              </li>
              <li>
                <a href="#faq" className="footer-link">
                  {t('FAQ', '常見問題')}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="eyebrow">{t('Company', '公司')}</p>
            <ul className="mt-5 space-y-3 text-[14px]">
              <li>
                <Link href="/login" className="footer-link">
                  {t('Log in', '登入')}
                </Link>
              </li>
              <li>
                <Link href="/signup" className="footer-link">
                  {t('Start free', '免費試用')}
                </Link>
              </li>
              <li>
                <a href="/privacy" className="footer-link">
                  {t('Privacy', '私隱')}
                </a>
              </li>
              <li>
                <a href="mailto:tradeflow.hk@gmail.com" className="footer-link">
                  {t('Contact', '聯絡')}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
