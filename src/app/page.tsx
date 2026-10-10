'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Check, Inbox, Lock } from 'lucide-react';
import SiteHeader from '@/components/landing/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import HeroDashboardScroll from '@/components/landing/HeroDashboardScroll';
import PricingPrice from '@/components/landing/PricingPrice';
import PilotCTA, { PILOT_WHATSAPP_HREF } from '@/components/landing/PilotCTA';
import { Chapter, SectionHead, Bullet, ClosingCTA } from '@/components/site/Section';
import { useLang } from '@/lib/lang';
import { PLANS as PLANS_CATALOG, formatPrice } from '@/lib/billing-plans';
import {
  BENEFITS,
  FACTS,
  FAQS,
  FOUNDERS,
  INTEGRATIONS,
  PLANS,
  PROBLEM,
  TRUST,
} from '@/lib/landing-content';

/* The product tour lives at /product. These four are the chapters that make it
   up, so the home page can point at them by name rather than repeating them. */
const TOUR = [
  {
    n: '03',
    href: '/product#extraction',
    label: ['Extraction', '擷取'],
    title: ['Every spec, with the line it came from', '每個規格，都附上它來自哪一行'],
  },
  {
    n: '04',
    href: '/product#queue',
    label: ['Work queue', '工作佇列'],
    title: ['One queue that tells you what needs you next', '一個佇列，告訴您下一步要處理什麼'],
  },
  {
    n: '05',
    href: '/product#quotes',
    label: ['Quotes', '報價'],
    title: ['Quotes priced from your list, not from memory', '報價取自您的清單，不是憑記憶'],
  },
  {
    n: '06',
    href: '/product#alerts',
    label: ['Alerts', '提示'],
    title: ['Know the moment a deal needs you', '商機需要您的當下，立即知道'],
  },
];

export default function HomePage() {
  const { t } = useLang();

  return (
    <div className="landing min-h-screen">
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="band-dark band-glow relative">
        <div className="shell pt-[104px] pb-14 lg:pt-[132px] lg:pb-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
            <div>
              <p className="eyebrow">{t('AI for trade operations', '貿易營運 AI')}</p>
              <h1 className="display h-hero mt-6 text-balance">
                {t('The autonomous back office', '自動化的貿易後勤')}
                <br />
                <span style={{ color: 'var(--accent)' }}>
                  {t('for trading companies.', '為貿易公司而設。')}
                </span>
              </h1>
              {/* Benefit first, control last — the two things the page is selling. */}
              <p className="lede mt-7 max-w-xl">
                {t(
                  'Every inquiry answered completely: specs pulled from the email and its attachments, gaps filled from your own catalogue, prices taken from your own list. Drafted in the buyer’s language, sent from your address, and never sent without your approval.',
                  '每封詢盤都得到完整回覆：規格擷取自郵件與附件，缺項由您自己的目錄補齊，價格取自您的清單。以買方語言草擬、由您的地址寄出，未經您核准絕不發送。'
                )}
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <PilotCTA className="btn btn-primary" />
                <a href={PILOT_WHATSAPP_HREF} className="btn btn-outline">
                  {t('Talk to us', '聯絡我們')}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
              <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-[13px]" style={{ color: 'var(--ink-2)' }}>
                {[
                  [t('Encrypted in transit and at rest', '傳輸與靜態皆加密'), Lock],
                  [t('Works inside your own mailbox', '在您自己的信箱內運作'), Inbox],
                  [t('Nothing sends without you', '未經您核准不會送出'), Check],
                ].map(([label, Icon], i) => {
                  const I = Icon as typeof Lock;
                  return (
                    <li key={i} className="inline-flex items-center gap-2">
                      <I className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
                      {label as string}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Editorial photograph rather than a screenshot, with the numbers
                overlaid on it the way the reference does. The product itself
                appears immediately below in the demo. */}
            <div className="hero-bleed relative">
              <div
                className="relative overflow-hidden rounded-[6px] border lg:aspect-[3/2] lg:rounded-r-none lg:border-r-0"
                style={{ borderColor: 'var(--hairline-2)' }}
              >
                <div className="relative aspect-[4/3] lg:absolute lg:inset-0">
                  <Image
                    src="https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=1600&q=80"
                    alt={t('Container port at work', '運作中的貨櫃碼頭')}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 620px"
                    className="object-cover"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(10,13,11,0.20) 0%, rgba(10,13,11,0.10) 42%, rgba(10,13,11,0.72) 100%)',
                    }}
                  />
                </div>

                {/* On desktop the numbers sit on the photograph, the way the
                    reference does it. On phones they run beneath it as rows:
                    three columns of two-line labels at 390px was a smear, and
                    the overlay ate most of the picture. */}
                <div
                  className="grid grid-cols-1 lg:absolute lg:inset-x-0 lg:bottom-0 lg:grid-cols-3"
                  style={{
                    background: 'rgba(10,13,11,0.42)',
                    backdropFilter: 'blur(10px)',
                    borderTop: '1px solid rgba(247,244,237,0.18)',
                  }}
                >
                  {FACTS.map((f, i) => (
                    <div
                      key={i}
                      className={`flex items-baseline gap-3 px-5 py-3.5 lg:block lg:py-4 ${
                        i ? 'border-t lg:border-t-0 lg:border-l' : ''
                      }`}
                      style={{ borderColor: 'rgba(247,244,237,0.18)' }}
                    >
                      <span className="display shrink-0 text-[1.35rem] lg:text-[1.6rem]" style={{ color: 'var(--on-dark)' }}>
                        {t(f.value[0], f.value[1])}
                      </span>
                      <span
                        className="text-[12.5px] leading-snug lg:mt-1 lg:block"
                        style={{ color: 'rgba(247,244,237,0.72)' }}
                      >
                        {t(f.label[0], f.label[1])}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ── Works with ───────────────────────────────────────────────────── */}
      <section style={{ borderBottom: '1px solid var(--hairline)' }}>
        <div className="shell flex flex-col gap-5 py-7 lg:flex-row lg:items-center lg:gap-12">
          <p className="eyebrow shrink-0">{t('Works with', '相容於')}</p>
          <ul className="flex flex-wrap items-center gap-x-8 gap-y-3">
            {INTEGRATIONS.map((tag) => (
              <li key={tag[0]} className="text-[14px]" style={{ color: 'var(--ink-2)' }}>
                {t(tag[0], tag[1])}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── The product, in motion ───────────────────────────────────────── */}
      {/* Unnumbered, the way the reference handles its dark product movement:
          the demo is the reveal, and the numbered chapters start after it.

          The right column is the live site's scroll-driven animation, unchanged.
          The left is a static explanation that pins alongside it — the four
          stages used to scroll past as separate blocks, which meant the reader
          was chasing the demo instead of reading it. Now nothing moves but the
          screenshot, and every stage is legible at once.

          No `band-glow` here: it sets `overflow: hidden`, which makes the
          section a scroll container and stops both columns sticking. */}
      {/* The band had no padding of its own — it relied on the columns inside it,
          which only produce spacing once they are side by side. On a phone that
          left the eyebrow flush against the strip above and the preview butted
          onto the section below. */}
      <section className="band-dark pt-14 pb-16 lg:pt-20 lg:pb-24">
        <div className="shell">
          <div className="grid gap-12 lg:grid-cols-[0.34fr_0.66fr] lg:gap-12">
            {/* ── Left: the explanation ─────────────────────────────────── */}
            {/* Sized to fit the pinned column: at 0.34fr the full section
                heading wrapped to four lines and pushed the last stage out of
                a short viewport, which is the opposite of helpful on a block
                that is meant to be read at a glance while the demo plays. */}
            <div className="lg:sticky lg:top-[104px] lg:self-start">
              <p className="eyebrow" style={{ color: 'var(--accent)' }}>
                {t('See it run', '實際運作')}
              </p>
              <h2 className="display mt-5 text-balance text-[clamp(1.65rem,2.2vw,2rem)] leading-[1.12]">
                {t('Watch one inquiry run end to end.', '看一封詢盤如何端到端跑完。')}
              </h2>
              <p className="mt-5 text-[15px] leading-relaxed" style={{ color: 'var(--on-dark-2)' }}>
                {t(
                  'One buyer, one thread. Nothing is re-typed, no tool is switched, and nothing sends without your approval.',
                  '一位買方、一條對話。不必重複輸入、不必切換工具，未經您核准不會送出。'
                )}
              </p>

              <ul className="mt-7 space-y-4">
                {[
                  {
                    n: '01',
                    name: t('Intake', '接收'),
                    body: t(
                      'The inquiry and its attachment land in your mailbox.',
                      '詢盤與附件落入您的信箱。'
                    ),
                  },
                  {
                    n: '02',
                    name: t('Extract', '擷取'),
                    body: t(
                      'Every spec is read and tied to its source line.',
                      '每個規格都被讀出並綁定來源行。'
                    ),
                  },
                  {
                    n: '03',
                    name: t('Price', '定價'),
                    body: t(
                      'Priced from your list and margin rules.',
                      '依您的清單與利潤規則定價。'
                    ),
                  },
                  {
                    n: '04',
                    name: t('Close', '成交'),
                    body: t(
                      'Approved, sent, tracked as an opportunity.',
                      '核准、寄出，並成為商機追蹤。'
                    ),
                  },
                ].map((st) => (
                  <li key={st.n} className="flex gap-3.5">
                    <span className="eyebrow shrink-0 pt-[2px]" style={{ color: 'var(--accent)' }}>
                      {st.n}
                    </span>
                    <div>
                      <p className="display text-[1rem]" style={{ color: 'var(--on-dark)' }}>
                        {st.name}
                      </p>
                      <p className="mt-1 text-[13.5px] leading-snug" style={{ color: 'var(--on-dark-2)' }}>
                        {st.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <p className="mt-7 text-[12.5px]" style={{ color: 'var(--on-dark-3)' }}>
                {t('Scroll to play', '捲動即可播放')}
              </p>
              <Link
                href="/product"
                className="mt-3 inline-flex items-center gap-1.5 text-[14px]"
                style={{ color: 'var(--accent)' }}
              >
                {t('Walk through the full pipeline', '看完整條流程')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* ── Right: the demo, exactly as it runs on the live site ──── */}
            <div className="bleed-right demo-square min-w-0">
              <HeroDashboardScroll />
            </div>
          </div>
        </div>
      </section>

      {/* ── 01 · The problem ─────────────────────────────────────────────── */}
      <section className="band">
        <div className="shell">
          <Chapter n="01" label={t('The problem', '問題')} />
          <SectionHead
            label={t('What slow answers cost', '慢回覆的代價')}
            title={t('Slow, incomplete answers lose winnable deals.', '回覆又慢又不完整，會輸掉本可贏的訂單。')}
          />
          <div className="mt-14 grid gap-px overflow-hidden rounded-[6px] md:grid-cols-3" style={{ background: 'var(--hairline)' }}>
            {PROBLEM.map((b) => (
              <div key={b.label[0]} className="px-6 py-8" style={{ background: 'var(--paper)' }}>
                <p className="eyebrow" style={{ color: 'var(--peach)' }}>
                  {t(b.label[0], b.label[1])}
                </p>
                <h3 className="display h-card mt-4 text-balance">{t(b.title[0], b.title[1])}</h3>
                <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                  {t(b.body[0], b.body[1])}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The turn ─────────────────────────────────────────────────────── */}
      <section className="band-dark band-glow band-xl">
        <div className="shell">
          <p className="eyebrow" style={{ color: 'var(--accent)' }}>
            {t('The turn', '轉折')}
          </p>
          <h2 className="display h-section mt-6 max-w-4xl text-balance">
            {t('One inbox. Every missing spec, ', '一個信箱。每一項缺漏，')}
            <span style={{ color: 'var(--accent)' }}>{t('filled in.', '自動補齊。')}</span>
          </h2>
          <p className="lede mt-6 max-w-xl">
            {t(
              'This is what an autonomous back office looks like: by the time you sit down, the specs are read, the gaps are filled and the reply is already drafted in the buyer’s language.',
              '這就是自動化後勤的樣子：您坐下來的時候，規格已讀完、缺項已補齊，回覆也已用買方的語言草擬好。'
            )}
          </p>
        </div>

      </section>

      {/* ── 02 · How it works ────────────────────────────────────────────── */}
      <section id="how" className="band scroll-mt-20">
        <div className="shell">
          <Chapter n="02" label={t('How it works', '運作方式')} />
          <SectionHead
            label={t('The whole pipeline', '完整流程')}
            title={t('From inquiry to a quote your buyer trusts', '從詢盤，到買方信得過的報價')}
            sub={t(
              'Extract, clarify, price, quote — one sequence on one thread, stopping wherever you want to decide.',
              '擷取、釐清、定價、報價——同一條對話上的一條流程，在您想決定的任何一步停下來。'
            )}
          />
          {/* What the pipeline produces, in the three terms a buyer cares about. */}
          <div className="mt-16 grid gap-px overflow-hidden rounded-[6px] md:grid-cols-3" style={{ background: 'var(--hairline)' }}>
            {BENEFITS.map((b) => (
              <div key={b.label[0]} className="px-6 py-8" style={{ background: 'var(--paper)' }}>
                <p className="eyebrow" style={{ color: 'var(--pine)' }}>
                  {t(b.label[0], b.label[1])}
                </p>
                <h3 className="h-sub mt-4 font-medium text-balance">{t(b.title[0], b.title[1])}</h3>
                <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                  {t(b.body[0], b.body[1])}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap gap-3">
            <Link href="/product" className="btn btn-primary">
              {t('See the full product', '查看完整產品')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── The tour, by chapter ─────────────────────────────────────────── */}
      <section className="band" style={{ background: 'var(--paper-2)', borderBlock: '1px solid var(--hairline)' }}>
        <div className="shell">
          <p className="eyebrow">{t('The tour', '產品導覽')}</p>
          <h2 className="display h-section mt-5 max-w-3xl text-balance">
            {t('Four steps, each with its own screen.', '四個步驟，各有自己的畫面。')}
          </h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-[6px] md:grid-cols-2 lg:grid-cols-4" style={{ background: 'var(--hairline)' }}>
            {TOUR.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="group flex flex-col px-6 py-7 transition-colors"
                style={{ background: 'var(--paper)' }}
              >
                <span className="eyebrow" style={{ color: 'var(--pine)' }}>
                  {c.n}
                </span>
                <span className="h-sub mt-2 font-medium text-balance">{t(c.title[0], c.title[1])}</span>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-[13.5px]" style={{ color: 'var(--ink-2)' }}>
                  {t(c.label[0], c.label[1])}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust teaser ─────────────────────────────────────────────────── */}
      <section className="band">
        <div className="shell grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <p className="eyebrow">{t('Trust', '信任')}</p>
            <h2 className="display h-section mt-5 text-balance">
              {t('Trust you can check, not trust you have to take.', '可以被檢驗的信任，而不是只能相信的承諾。')}
            </h2>
            <p className="lede mt-5 max-w-lg">
              {t(
                'Each of these is enforced by the product or published in plain language — not asserted on a badge.',
                '以下每一項都由產品本身執行，或以淺白文字公開——而不是印在標章上的口號。'
              )}
            </p>
            <Link href="/trust" className="btn btn-outline mt-8">
              {t('How we handle your data', '我們如何處理您的資料')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ul className="grid gap-px overflow-hidden rounded-[6px] sm:grid-cols-2" style={{ background: 'var(--hairline)' }}>
            {TRUST.slice(0, 4).map((item) => (
              <li key={item.title[0]} className="px-6 py-6" style={{ background: 'var(--paper)' }}>
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-[4px]"
                  style={{ background: 'var(--accent-light)', color: 'var(--pine)' }}
                >
                  <item.icon className="h-4 w-4" />
                </span>
                <h3 className="h-sub mt-4 font-medium text-balance">{t(item.title[0], item.title[1])}</h3>
                <p className="mt-2.5 text-[14px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                  {t(item.body[0], item.body[1])}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Founders ─────────────────────────────────────────────────────── */}
      {/* `band-dark` only sets colours; it carries no padding of its own, so
          this band ran straight into the one below it. */}
      <section className="band-dark pt-20 pb-24 lg:pt-24 lg:pb-28">
        <div className="shell">
          <div className="max-w-3xl">
            <p className="eyebrow" style={{ color: 'var(--accent)' }}>{t('Founders', '創辦人')}</p>
            <h2 className="display h-section mt-5 text-balance">
              {t('The same complaint, heard twice.', '同一個抱怨，我們聽了兩次。')}
            </h2>
            <p className="lede mt-5">
              {t(
                'Sailwise did not begin as a product idea. It began as one recurring conversation — first at Neel’s dinner table, then across fifty-odd owner meetings — and the realisation that nobody with serious AI capability was paying this industry any attention.',
                'Sailwise 一開始並不是一個產品構想。它始於一段反覆出現的對話——先是 Neel 家的餐桌，然後是五十多場與老闆的會面——以及一個認知：沒有任何具備真正 AI 實力的人，正在關注這個產業。'
              )}
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-2 lg:gap-7">
            {FOUNDERS.map((f) => (
              <article
                key={f.initials}
                className="card flex flex-col p-7 md:p-8"
                style={{ background: 'var(--paper-2)' }}
              >
                <div className="flex items-center gap-4">
                  {/* A real photograph where we have one; initials otherwise.
                      Decorative — the name sits beside it — so it is hidden from
                      assistive tech rather than announced twice. */}
                  {f.photo ? (
                    <img
                      src={f.photo}
                      alt=""
                      aria-hidden="true"
                      width={112}
                      height={112}
                      className="h-40 w-40 shrink-0 object-cover sm:h-52 sm:w-52"
                    />
                  ) : (
                    <span
                      className="display flex h-40 w-40 shrink-0 items-center justify-center text-[2.6rem] sm:h-52 sm:w-52"
                      style={{ background: 'var(--accent-light)', color: 'var(--pine)' }}
                      aria-hidden="true"
                    >
                      {f.initials}
                    </span>
                  )}
                  <div>
                    <p className="display text-[1.25rem]">{t(f.name[0], f.name[1])}</p>
                    <p className="mt-0.5 text-[13px]" style={{ color: 'var(--ink-3)' }}>
                      {t(f.role[0], f.role[1])}
                    </p>
                  </div>
                </div>

                <h3 className="h-sub mt-7 font-medium text-balance">{t(f.headline[0], f.headline[1])}</h3>
                <p className="mt-3 text-[15px] leading-[1.7]" style={{ color: 'var(--ink-2)' }}>
                  {t(f.body[0], f.body[1])}
                </p>
              </article>
            ))}
          </div>

          <Link href="/founders" className="btn btn-outline mt-12">
            {t('Read the full story', '看完整個故事')}
            <ArrowRight className="h-4 w-4" />
          </Link>

          {/* The mission, stated once, in the section that explains why we are here. */}
          <p className="mt-10 max-w-3xl text-[15px] leading-[1.75]" style={{ color: 'var(--ink-2)' }}>
            {t(
              'Our mission is to make the industry the big labs overlook measurably faster. Sourcing and trading moves the physical world and still runs on email, spreadsheets and memory — we bring real AI engineering to a trade that has been passed over, starting with the job that eats the most hours: answering an inquiry completely, with every number traceable, before the buyer moves on.',
              '我們的使命，是讓大型實驗室所忽略的產業實實在在地更快。採購與貿易推動著實體世界，卻仍靠電郵、試算表和記憶在運作——我們把真正的 AI 工程帶進這個被忽略的行業，從最耗時的那件事開始：在買方失去耐心之前，完整回答一封詢盤，而且每個數字都可追溯。'
            )}
          </p>
        </div>
      </section>

      {/* ── Pricing teaser ───────────────────────────────────────────────── */}
      <section
        className="band"
        style={{ background: 'var(--paper-2)', borderBlock: '1px solid var(--hairline)' }}
      >
        {/* The plan stands on its own here: the heading that used to sit
            beside it only repeated what /pricing says in full. */}
        <div className="shell">
          <div
            className="card mx-auto max-w-[460px] p-8 md:p-9"
            style={{
              background: 'var(--paper)',
              boxShadow: '0 1px 2px rgba(10,13,11,0.04), 0 30px 60px -42px rgba(10,13,11,0.38)',
            }}
          >
            <div className="flex items-baseline justify-between">
              <span className="display text-[1.35rem]">{t(PLANS[0].name[0], PLANS[0].name[1])}</span>
              <span className="eyebrow" style={{ color: 'var(--pine)' }}>
                {t('everything included', '全部包含')}
              </span>
            </div>
            <PricingPrice
              monthly={PLANS[0].price}
              annual={formatPrice(PLANS_CATALOG.starter.annual)}
              annualTotal={PLANS_CATALOG.starter.monthly * 12 - PLANS_CATALOG.starter.annual * 12}
              period={PLANS[0].period}
            />
            <div className="mb-6 h-px" style={{ background: 'var(--hairline)' }} />
            <ul className="space-y-3">
              {PLANS[0].features.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[14.5px] leading-snug" style={{ color: 'var(--ink-2)' }}>
                  <Check className="mt-[3px] h-3.5 w-3.5 shrink-0" style={{ color: 'var(--pine)' }} strokeWidth={2.5} />
                  {t(f[0], f[1])}
                </li>
              ))}
            </ul>
            <div className="mt-8 border-t pt-6" style={{ borderColor: 'var(--hairline)' }}>
              <PilotCTA className="btn btn-primary w-full" />
              <p className="mt-3 text-center text-[12px]" style={{ color: 'var(--ink-3)' }}>
                {t('14-day free trial · Card required · Cancel anytime', '14 天免費試用 · 需綁定信用卡 · 隨時取消')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ teaser ───────────────────────────────────────────────────── */}
      <section className="band">
        <div className="shell grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="eyebrow">{t('FAQ', '常見問題')}</p>
            <h2 className="display h-section mt-5 text-balance">
              {t('Questions, answered', '疑問解答')}
            </h2>
            <p className="lede mt-5 max-w-lg">
              {t('Everything traders ask us before starting.', '貿易商在開始前最常問的問題。')}
            </p>
            <Link href="/faq" className="btn btn-outline mt-8">
              {t('Read all questions', '查看所有問題')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div>
            {FAQS.slice(0, 3).map((f, i) => (
              <details key={i} className="faq-item group">
                <summary className="flex list-none items-center justify-between gap-6 py-6 text-left">
                  <span className="display text-[1.1rem] md:text-[1.2rem]">{t(f.q[0], f.q[1])}</span>
                  <svg
                    className="h-4 w-4 shrink-0 transition-transform duration-300 group-open:rotate-180"
                    style={{ color: 'var(--ink-3)' }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </summary>
                <p className="max-w-2xl pb-7 text-[15px] leading-[1.7]" style={{ color: 'var(--ink-2)' }}>
                  {t(f.a[0], f.a[1])}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <ClosingCTA
        eyebrow={t('Design partners', '設計夥伴')}
        title={t('Stop losing deals to missing specs.', '別再因為缺了規格而輸掉訂單。')}
        sub={t(
          'Build the back office that answers first — then spend your day closing. Founding pilot: 5 HK trading firms, onboarded personally.',
          '建立一個先替您回覆的後勤團隊——然後把時間花在成交上。創始試用計劃：5 間香港貿易公司，由本人親自導入。'
        )}
        image="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2000&q=80"
        t={t}
      />

      <SiteFooter />
    </div>
  );
}
