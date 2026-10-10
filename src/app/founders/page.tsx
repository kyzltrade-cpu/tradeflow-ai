'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import SiteHeader from '@/components/landing/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { Chapter, SectionHead, ClosingCTA } from '@/components/site/Section';
import { useLang } from '@/lib/lang';
import { FOUNDERS } from '@/lib/landing-content';

/* The long version of the origin story.

   Everything here is either what Kyle and Neel actually did, or a problem the
   product pages already state in the same words. Nothing about their
   backgrounds is invented — no surnames, no employers, no credentials, no
   numbers beyond the fifty conversations they told us about. */

const STARTED: { n: string; title: [string, string]; body: [string, string] }[] = [
  {
    n: '01',
    title: ['It started at a dinner table.', '它從一張餐桌開始。'],
    body: [
      'Neel’s dad runs a sourcing business. Neel watched the job from the inside: an inquiry arriving half-finished, a spec sheet spread across three attachments, and an evening spent rebuilding a quote that had been quoted before.',
      'Neel 的父親經營採購生意。Neel 從內部看著這份工作：一封殘缺的詢盤、散落在三個附件裡的規格表，以及一個又一個用來重做「早就報過」的報價的夜晚。',
    ],
  },
  {
    n: '02',
    title: ['Then the same story, fifty more times.', '然後同一個故事，又聽了五十次。'],
    body: [
      'Kyle went out and asked. Over fifty sourcing and trading owners, across products, countries and sizes. Different businesses, the same afternoon described back to him: chasing what was missing, pricing from memory, and losing the order to whoever answered completely first.',
      'Kyle 走出去問。超過五十位採購與貿易公司的老闆，涵蓋不同產品、國家與規模。生意各不相同，但每個人描述的下午都一樣：追問缺漏、憑記憶定價，然後把訂單輸給最快給出完整答案的那一方。',
    ],
  },
  {
    n: '03',
    title: ['And nobody was building for them.', '而沒有人為他們打造工具。'],
    body: [
      'The companies with the best AI capability were pointed at software, finance, law and support desks. Sourcing and trading — which moves the physical world — was left running on email, spreadsheets and memory. That gap is the whole reason Sailwise exists.',
      '擁有最強 AI 能力的公司，把目光放在軟件、金融、法律與客服。而推動實體世界的採購與貿易，卻仍靠電郵、試算表和記憶運作。這個落差，就是 Sailwise 存在的全部理由。',
    ],
  },
];

const FINDINGS: { title: [string, string]; body: [string, string] }[] = [
  {
    title: ['The ask is never the brief', '詢價從來不是規格書'],
    body: [
      'A buyer writes what they want, not what you need. Quantity, material, certification, incoterm and date arrive scattered, or not at all.',
      '買方寫的是他們想要的，而不是您需要的。數量、材質、認證、貿易條件與日期，散落各處，甚至完全沒提。',
    ],
  },
  {
    title: ['Speed decides the order', '速度決定訂單'],
    body: [
      'Not price. The owner who answers completely first usually wins, and every round trip spent clarifying hands the advantage to someone else.',
      '不是價格。最快給出完整答案的人通常會贏，而每一次為了釐清而往返，都把優勢讓給了別人。',
    ],
  },
  {
    title: ['Pricing lives in one person’s head', '價格只存在一個人的腦裡'],
    body: [
      'Quotes get rebuilt from memory every time. Two answers for the same product can carry two numbers, and neither can be traced back.',
      '報價每次都得憑記憶重做。同一個產品的兩次回覆可能出現兩個數字，而且都無法追溯。',
    ],
  },
  {
    title: ['It is invisible to AI companies', 'AI 公司看不見它'],
    body: [
      'Sourcing and trading is fragmented, unglamorous and enormous. It does not look like a market from the outside, so it never got the tools.',
      '採購與貿易既分散、不耀眼，卻極其龐大。從外面看它不像一個市場，所以它始終沒有得到工具。',
    ],
  },
];

export default function FoundersPage() {
  const { t } = useLang();

  return (
    <div className="landing min-h-screen">
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="band-dark band-glow">
        <div className="shell pt-[116px] pb-16 lg:pt-[148px] lg:pb-20">
          <p className="eyebrow" style={{ color: 'var(--accent)' }}>
            {t('Founders', '創辦人')}
          </p>
          <h1 className="display h-section mt-5 max-w-4xl text-balance">
            {t('The same complaint, heard twice.', '同一個抱怨，我們聽了兩次。')}
          </h1>
          <p className="lede mt-5 max-w-2xl">
            {t(
              'Sailwise did not begin as a product idea. It began as one recurring conversation — first at Neel’s dinner table, then across fifty-odd owner meetings — and the realisation that nobody with serious AI capability was paying this industry any attention.',
              'Sailwise 一開始並不是一個產品構想。它始於一段反覆出現的對話——先是 Neel 家的餐桌，然後是五十多場與老闆的會面——以及一個認知：沒有任何具備真正 AI 實力的人，正在關注這個產業。'
            )}
          </p>
        </div>
      </section>

      {/* ── The two of them ──────────────────────────────────────────────── */}
      <section className="band-dark">
        <div className="shell">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-7">
            {FOUNDERS.map((f) => (
              <article
                key={f.initials}
                className="card flex flex-col p-7 md:p-8"
                style={{ background: 'var(--paper-2)', borderColor: 'var(--dark-hairline-2)' }}
              >
                {f.photo && (
                  /* Decorative: the name is directly below it, so a screen
                     reader would otherwise hear the person introduced twice. */
                  <img
                    src={f.photo}
                    alt=""
                    aria-hidden="true"
                    width={640}
                    height={640}
                    className="h-44 w-44 object-cover sm:h-60 sm:w-60"
                  />
                )}
                <p className="display mt-6 text-[1.4rem]">{t(f.name[0], f.name[1])}</p>
                <p className="mt-1 text-[13px]" style={{ color: 'var(--ink-3)' }}>
                  {t(f.role[0], f.role[1])}
                </p>
                <h2 className="h-sub mt-6 font-medium text-balance">{t(f.headline[0], f.headline[1])}</h2>
                <p className="mt-3 text-[15px] leading-[1.7]" style={{ color: 'var(--ink-2)' }}>
                  {t(f.body[0], f.body[1])}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it started ───────────────────────────────────────────────── */}
      <section className="band-dark" style={{ borderTop: '1px solid var(--dark-hairline)' }}>
        <div className="shell">
          <Chapter n="01" label={t('How this started', '這一切如何開始')} />
          <SectionHead
            label={t('The origin', '起點')}
            title={t('Two people, one repeated conversation.', '兩個人，一段反覆出現的對話。')}
          />
          <ol className="mt-14 grid gap-px overflow-hidden rounded-[6px] md:grid-cols-3" style={{ background: 'var(--hairline)' }}>
            {STARTED.map((step) => (
              <li key={step.n} className="px-6 py-8" style={{ background: 'var(--paper-2)' }}>
                <p className="eyebrow" style={{ color: 'var(--pine)' }}>
                  {step.n}
                </p>
                <h3 className="display h-card mt-4 text-balance">{t(step.title[0], step.title[1])}</h3>
                <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                  {t(step.body[0], step.body[1])}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── What the fifty conversations kept saying ─────────────────────── */}
      <section className="band-dark">
        <div className="shell">
          <Chapter n="02" label={t('What we heard', '我們聽到了什麼')} />
          <SectionHead
            label={t('The pattern', '共同的模式')}
            title={t('Fifty different businesses, four identical problems.', '五十間不同的公司，四個一模一樣的問題。')}
            sub={t(
              'These are the four things that came up in almost every conversation — and the four things the product is built around.',
              '這是在幾乎每一場對話中都會出現的四件事——也是產品圍繞著打造的四件事。'
            )}
          />
          <div className="mt-14 grid gap-px overflow-hidden rounded-[6px] sm:grid-cols-2" style={{ background: 'var(--hairline)' }}>
            {FINDINGS.map((f) => (
              <div key={f.title[0]} className="px-6 py-7" style={{ background: 'var(--paper-2)' }}>
                <h3 className="h-sub font-medium text-balance">{t(f.title[0], f.title[1])}</h3>
                <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                  {t(f.body[0], f.body[1])}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission ──────────────────────────────────────────────────────── */}
      <section className="band-dark band-glow band-xl">
        <div className="shell">
          <p className="eyebrow" style={{ color: 'var(--accent)' }}>
            {t('Our mission', '我們的使命')}
          </p>
          <h2 className="display h-section mt-6 max-w-4xl text-balance">
            {t('Make the industry the big labs overlook ', '讓大型實驗室所忽略的產業')}
            <span style={{ color: 'var(--accent)' }}>{t('measurably faster.', '實實在在地更快。')}</span>
          </h2>
          <p className="lede mt-6 max-w-2xl">
            {t(
              'Sourcing and trading moves the physical world and still runs on email, spreadsheets and memory. We bring real AI engineering to a trade that has been passed over — starting with the job that eats the most hours: answering an inquiry completely, with every number traceable, before the buyer moves on.',
              '採購與貿易推動著實體世界，卻仍靠電郵、試算表和記憶在運作。我們把真正的 AI 工程帶進這個被忽略的行業——從最耗時的那件事開始：在買方失去耐心之前，完整回答一封詢盤，而且每個數字都可追溯。'
            )}
          </p>

          <ul className="mt-14 grid gap-px overflow-hidden rounded-[6px] md:grid-cols-3" style={{ background: 'var(--dark-hairline)' }}>
            {[
              {
                k: t('From the trade', '來自業內'),
                v: t(
                  'One founder grew up inside it. The other interviewed fifty owners in it.',
                  '一位創辦人在其中長大；另一位訪談了其中五十位老闆。'
                ),
              },
              {
                k: t('Built by AI engineers', '由 AI 工程師打造'),
                v: t(
                  'The same techniques the big labs aim at other industries, pointed here.',
                  '把大型實驗室用於其他產業的同樣技術，對準這裡。'
                ),
              },
              {
                k: t('Measured by your time', '以您省下的時間衡量'),
                v: t(
                  'Success is an inquiry answered completely before the buyer looks elsewhere.',
                  '成功就是：在買方轉向他人之前，把一封詢盤完整回覆。'
                ),
              },
            ].map((item) => (
              <li key={item.k} className="px-6 py-7" style={{ background: 'rgba(10,13,11,0.55)' }}>
                <p className="eyebrow" style={{ color: 'var(--accent)' }}>
                  {item.k}
                </p>
                <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'var(--on-dark-2)' }}>
                  {item.v}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-12 flex flex-wrap gap-3">
            <Link href="/product" className="btn btn-primary">
              {t('See what we built', '看看我們打造了什麼')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="mailto:tradeflow.hk@gmail.com?subject=Hello%20from%20the%20site" className="btn btn-outline">
              {t('Talk to Kyle or Neel', '與 Kyle 或 Neel 談談')}
            </a>
          </div>
        </div>
      </section>

      <ClosingCTA
        eyebrow={t('Design partners', '設計夥伴')}
        title={t('Come build it with us.', '來和我們一起打造。')}
        sub={t(
          'We are onboarding a small founding group personally — five HK trading firms to start.',
          '我們正親自導入一小群創始夥伴——先從五間香港貿易公司開始。'
        )}
        t={t}
      />

      <SiteFooter />
    </div>
  );
}
