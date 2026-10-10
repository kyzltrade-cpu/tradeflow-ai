'use client';

import Link from 'next/link';
import { ArrowRight, CircleCheck } from 'lucide-react';
import SiteHeader from '@/components/landing/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';
import { ClosingCTA } from '@/components/site/Section';
import { useLang } from '@/lib/lang';
import { FAQS } from '@/lib/landing-content';

export default function FaqPage() {
  const { t } = useLang();

  return (
    <div className="landing min-h-screen">
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="band-dark band-glow">
        <div className="shell pt-[116px] pb-16 lg:pt-[148px] lg:pb-20">
        <p className="eyebrow" style={{ color: 'var(--accent)' }}>{t('FAQ', '常見問題')}</p>
        <h1 className="display h-section mt-5 max-w-4xl text-balance">
          {t('Questions, answered.', '疑問解答。')}
        </h1>
        <p className="lede mt-5 max-w-2xl">
          {t(
            'Everything traders ask us before starting. If yours is not here, the answer is one message away.',
            '貿易商在開始前最常問的問題。如果這裡沒有您的問題，一則訊息就能得到答案。'
          )}
        </p>

        <ul className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-[13.5px]">
          {[
            t('Answered by the people who build it', '由打造產品的人親自回答'),
            t('No sales script', '沒有推銷話術'),
            t('We will say if it is not a fit', '不合適我們會直說'),
          ].map((label) => (
            <li key={label} className="inline-flex items-center gap-2" style={{ color: 'var(--on-dark-2)' }}>
              <CircleCheck className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
              {label}
            </li>
          ))}
        </ul>
      </div>
      </section>

      {/* ── The questions ────────────────────────────────────────────────── */}
      <section className="shell pt-16 pb-16">
        <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
          {/* The ask sits after the answers on phones; leading with "Still unsure?"
              before a single question has been read is pushy. */}
          {/* Stretches to the height of the questions beside it, so the left
              side is a filled panel rather than a short card with a void under
              it. */}
          <aside className="order-last flex flex-col lg:order-none">
            <div className="card flex flex-1 flex-col p-6" style={{ background: 'var(--paper-2)' }}>
              <p className="eyebrow">{t('Still unsure?', '仍有疑問？')}</p>
              <p className="mt-4 text-[14px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                {t(
                  'Ask us directly — we answer every message ourselves, and we will tell you if Sailwise is not a fit.',
                  '直接問我們——每則訊息都由我們親自回覆，如果不適合，我們也會如實告訴您。'
                )}
              </p>
              <a
                href="mailto:tradeflow.hk@gmail.com?subject=Sailwise%20question"
                className="btn btn-primary mt-6 w-full"
              >
                {t('Ask a question', '提出問題')}
                <ArrowRight className="h-4 w-4" />
              </a>

              {/* The card stretched to the height of the questions beside it, so
                  it needs content rather than a void. These are the four things
                  that actually come up. */}
              <div className="mt-8 border-t pt-6" style={{ borderColor: 'var(--hairline)' }}>
                <p className="eyebrow">{t('Often asked', '常被問到')}</p>
                <ul className="mt-4 space-y-2.5">
                  {[
                    t('Whether it fits your product range', '是否適合您的產品類型'),
                    t('How pricing and the trial work', '價格與試用如何運作'),
                    t('What it needs from your inbox', '需要您信箱的哪些權限'),
                    t('How your data is handled', '您的資料如何處理'),
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2.5 text-[13.5px] leading-snug" style={{ color: 'var(--ink-2)' }}>
                      <CircleCheck className="mt-[2px] h-3.5 w-3.5 shrink-0" style={{ color: 'var(--pine)' }} />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 border-t pt-6" style={{ borderColor: 'var(--hairline)' }}>
                <p className="text-[13px]" style={{ color: 'var(--ink-3)' }}>
                  {t('We reply within one working day.', '我們會在一個工作天內回覆。')}
                </p>
                <a
                  href="mailto:tradeflow.hk@gmail.com"
                  className="link-quiet mt-1.5 inline-block text-[13.5px]"
                >
                  tradeflow.hk@gmail.com
                </a>
              </div>
            </div>
              <p className="mt-auto pt-8 text-[13.5px] leading-relaxed" style={{ color: 'var(--ink-3)' }}>
                {t('Prefer to read first?', '想先閱讀？')}{' '}
                <Link href="/trust" className="link-quiet">
                  {t('How we handle your data', '我們如何處理您的資料')}
                </Link>
              </p>
          </aside>

          <div>
            {FAQS.map((f, i) => (
              <details key={i} className="faq-item group">
                <summary className="flex list-none items-center justify-between gap-6 py-6 text-left">
                  <span className="display text-[1.1rem] md:text-[1.25rem]">{t(f.q[0], f.q[1])}</span>
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
        eyebrow={t('Ready when you are', '準備好就開始')}
        title={t('Start with your own inquiries.', '用您自己的詢盤開始。')}
        sub={t(
          '14-day free trial. Connect a mailbox and answer your first inquiry the same day.',
          '14 天免費試用。連接信箱，當天就能回覆第一封詢盤。'
        )}
        t={t}
      />

      <SiteFooter />
    </div>
  );
}
