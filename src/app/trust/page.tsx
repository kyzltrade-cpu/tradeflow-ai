'use client';

import Link from 'next/link';
import { ArrowRight, CircleCheck, Lock, Trash2 } from 'lucide-react';
import SiteHeader from '@/components/landing/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { Chapter, SectionHead, MockFrame, ClosingCTA } from '@/components/site/Section';
import { HandoffMock } from '@/components/landing/ProductMocks';
import { useLang } from '@/lib/lang';
import { GATES, TRUST } from '@/lib/landing-content';

export default function TrustPage() {
  const { t } = useLang();

  return (
    <div className="landing min-h-screen">
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="band-dark band-glow">
        <div className="shell pt-[116px] pb-16 lg:pt-[148px] lg:pb-20">
        <p className="eyebrow" style={{ color: 'var(--accent)' }}>{t('Trust', '信任')}</p>
        <h1 className="display h-section mt-5 max-w-4xl text-balance">
          {t('Trust you can check, not trust you have to take.', '可以被檢驗的信任，而不是只能相信的承諾。')}
        </h1>
        <p className="lede mt-5 max-w-2xl">
          {t(
            'You are being asked to point an AI at your inbox and your price list. Everything below is either enforced by the product or published in plain language — not asserted on a badge.',
            '您被要求讓 AI 接入您的信箱與價格表。以下每一項都由產品本身執行，或以淺白文字公開——而不是印在標章上的口號。'
          )}
        </p>

        {/* The three that matter most, stated before the detail — a trust page
            that opens with a wall of policy asks the reader to take it on
            faith, which is the opposite of the point. */}
        <ul className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-[13.5px]">
          {[
            [t('Encrypted in transit and at rest', '傳輸與靜態皆加密'), Lock],
            [t('Nothing sends without you', '未經您核准不會送出'), CircleCheck],
            [t('Delete your data any time', '隨時可刪除您的資料'), Trash2],
          ].map(([label, Icon]) => {
            const I = Icon as typeof Lock;
            return (
              <li key={label as string} className="inline-flex items-center gap-2" style={{ color: 'var(--on-dark-2)' }}>
                <I className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
                {label as string}
              </li>
            );
          })}
        </ul>
      </div>
      </section>

      {/* ── 08 · Control ─────────────────────────────────────────────────── */}
      <section
        className="band-dark band-glow band-xl"
        style={{ paddingTop: 'clamp(3.5rem, 5vw, 5rem)' }}
      >
        <div className="shell">
          <Chapter n="08" label={t('Before you decide', '決定之前')} />
          <div className="grid gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
            <div>
              <p className="eyebrow" style={{ color: 'var(--accent)' }}>
                {t('Built-in control', '內建掌控')}
              </p>
              <h2 className="display h-section mt-5 text-balance">
                {t('AI does the legwork. ', 'AI 負責苦工。')}
                <span style={{ color: 'var(--accent)' }}>{t('You stay in control.', '主導權在您手中。')}</span>
              </h2>
              <p className="lede mt-6 max-w-lg">
                {t(
                  'Nothing sends without your decision. Every message is a draft, every number traces to its source, and you can take over any thread mid-conversation — hand over the busywork without handing over your judgement.',
                  '未經您決定，不會代您發送任何內容。每則訊息都是草稿，每個數字都可溯源，您可隨時接手任何對話——把雜事交出去，但不必交出您的判斷。'
                )}
              </p>
            </div>

            <ul className="space-y-9 lg:pt-2">
              {GATES.map((g) => (
                <li key={g.label[0]}>
                  <p className="eyebrow" style={{ color: 'var(--accent)' }}>
                    {t(g.label[0], g.label[1])}
                  </p>
                  <p className="display mt-3 text-[1.35rem]">{t(g.title[0], g.title[1])}</p>
                  <p className="mt-2 max-w-md text-[15px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                    {t(g.body[0], g.body[1])}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* The handover surface itself — "take over any thread" is easier to
              believe with the control in front of you. This is the one mock on
              the site that keeps rounded corners (`demo-round`). */}
          <div className="mt-14">
            <MockFrame
              className="demo-round"
              label="A thread flagged for human handover, showing the discount request that triggered it and the take-over control."
            >
              <HandoffMock />
            </MockFrame>
            <p className="mt-4 text-[13px]" style={{ color: 'var(--on-dark-2)' }}>
              {t(
                'Hand over, step in, hand it back — the thread keeps its full history either way.',
                '交棒、接手、再交回——無論哪一種，對話紀錄都完整保留。'
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ── 09 · Guarantees ──────────────────────────────────────────────── */}
      <section
        className="band"
        style={{ background: 'var(--paper-2)', borderBlock: '1px solid var(--hairline)' }}
      >
        <div className="shell">
          <Chapter n="09" label={t('Trust', '信任')} />
          <SectionHead
            label={t('Before you hand it the inbox', '在把信箱交給它之前')}
            title={t('What we guarantee, specifically.', '我們具體保證什麼。')}
          />

          <div
            className="mt-14 grid gap-px overflow-hidden rounded-[6px] md:grid-cols-2 lg:grid-cols-3"
            style={{ background: 'var(--hairline)' }}
          >
            {TRUST.map((item) => (
              <div key={item.title[0]} className="px-6 py-7" style={{ background: 'var(--paper)' }}>
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-[4px]"
                  style={{ background: 'var(--accent-light)', color: 'var(--pine)' }}
                >
                  <item.icon className="h-4 w-4" />
                </span>
                <h3 className="h-sub mt-5 font-medium text-balance">{t(item.title[0], item.title[1])}</h3>
                <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                  {t(item.body[0], item.body[1])}
                </p>
              </div>
            ))}
          </div>

          {/* Named in full, because "we take privacy seriously" is not a disclosure. */}
          <p className="mt-8 max-w-3xl text-[13.5px] leading-relaxed" style={{ color: 'var(--ink-3)' }}>
            {t(
              'Processors we use, in full: Google and Microsoft for your connected mailbox, OpenAI for drafting, Supabase for storage, PostHog for setup analytics. Each is bound by a data processing agreement. ',
              '我們使用的處理者全部列出：Google 與 Microsoft 用於連接信箱、OpenAI 用於草擬、Supabase 用於儲存、PostHog 用於設定流程分析，各自受資料處理協議約束。'
            )}
            <Link href="/privacy" className="link-quiet">
              {t('Read the privacy policy', '閱讀私隱政策')}
            </Link>
            {t('.', '。')}
          </p>
        </div>
      </section>

      <ClosingCTA
        eyebrow={t('Still deciding?', '還在考慮？')}
        title={t('Ask us anything before you connect.', '在連接之前，歡迎問我們任何問題。')}
        sub={t(
          'We will walk you through exactly what Sailwise can see, what it stores, and what it never does.',
          '我們會逐項說明 Sailwise 能看到什麼、儲存什麼，以及絕不會做什麼。'
        )}
        t={t}
      />

      <SiteFooter />
    </div>
  );
}
