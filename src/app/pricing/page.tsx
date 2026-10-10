'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, CircleCheck, Lock, Trash2 } from 'lucide-react';
import { useLang } from '@/lib/lang';
import { supabaseBrowser } from '@/lib/auth';
import { PLANS, formatPrice } from '@/lib/billing-plans';
import { HeroProduct } from '@/components/landing/ProductMocks';
import { MockFrame } from '@/components/site/Section';
import SiteHeader from '@/components/landing/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

const SETUP_FEE = 1000;
const PLAN_COPY: Record<string, { blurb: [string, string]; features: [string, string][] }> = {
  starter: {
    blurb: [
      'Google & Microsoft email inbox (1 account)',
      'Google 或 Microsoft 電郵收件匣（1 個帳戶）',
    ],
    features: [
      ['Unlimited AI conversations', '無限 AI 對話'],
      ['Unlimited products & FAQ rules', '無限產品與 FAQ 規則'],
      ['English, Mandarin, Cantonese, Spanish', '英文、普通話、粵語、西班牙文'],
      ['Human override & takeover anytime', '隨時由真人接手'],
      ['Knowledge base & website sync', '知識庫與網站同步'],
      ['Custom AI personality', '自訂 AI 個性'],
    ],
  },
  growth: {
    blurb: ['Multiple inboxes, multi-user dashboard, analytics', '多個信箱、多用戶儀表板、分析報表'],
    features: [
      ['Everything in Starter', '包含 Starter 全部功能'],
      ['Multiple email accounts', '多個電郵帳戶'],
      ['Multi-user dashboard', '多用戶儀表板'],
      ['Analytics & reporting', '分析與報表'],
      ['Priority support', '優先支援'],
    ],
  },
  enterprise: {
    blurb: ['Unlimited AI, dedicated manager, custom integrations', '無限 AI、專屬客戶經理、自訂整合'],
    features: [
      ['Everything in Growth', '包含 Growth 全部功能'],
      ['Automated quote generation', '自動報價生成'],
      ['Dedicated account manager', '專屬客戶經理'],
      ['Custom integrations', '自訂整合'],
    ],
  },
};

export default function PricingPage() {
  const { t } = useLang();
  const router = useRouter();
  const [annual, setAnnual] = useState(false);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
  }, []);

  const handleCheckout = async (tier: string) => {
    if (isLoggedIn) {
      // Logged in → billing lives in Settings
      router.push('/admin/settings');
      return;
    }
    // Not logged in → go to signup
    setLoadingTier(tier);
    router.push(`/signup?plan=${tier}`);
  };

  return (
    <div className="landing min-h-screen">
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="band-dark band-glow">
        <div className="shell pt-[116px] pb-16 lg:pt-[148px] lg:pb-20">
        <p className="eyebrow" style={{ color: 'var(--accent)' }}>{t('Pricing', '定價')}</p>
        <h1 className="display h-section mt-5 max-w-3xl text-balance">
          {t('Simple, transparent pricing.', '簡單、透明的定價。')}
        </h1>
        <p className="lede mt-5 max-w-2xl">
          {t(
            `Start free, pay ${formatPrice(PLANS.starter.monthly)}/month when ready. Self-serve setup is free — optional done-for-you setup is ${formatPrice(SETUP_FEE)} one-time.`,
            `免費開始，準備好再按每月 ${formatPrice(PLANS.starter.monthly)} 付費。自行設定免費——可選專人設定為 ${formatPrice(SETUP_FEE)} 一次性。`
          )}
        </p>

      </div>
      </section>

      {/* ── Plans ────────────────────────────────────────────────────────── */}
      <section className="shell pt-16 pb-16">
        {/* One plan. The tiers that used to sit here differed only on seats and
            volume, which is a conversation, not a price list. */}
        <div className="mx-auto max-w-[520px]">
          <div className="mb-7 flex justify-center">
            <div
              className="inline-flex items-center gap-0.5 p-0.5"
              style={{ border: '1px solid var(--hairline)' }}
            >
              {([false, true] as const).map((isAnnual) => (
                <button
                  key={String(isAnnual)}
                  type="button"
                  onClick={() => setAnnual(isAnnual)}
                  aria-pressed={annual === isAnnual}
                  className="cursor-pointer px-4 py-2 text-[13px] font-medium transition-colors"
                  style={
                    annual === isAnnual
                      ? { background: 'var(--ink)', color: 'var(--paper)' }
                      : { color: 'var(--ink-2)' }
                  }
                >
                  {isAnnual ? t('Annual · save 20%', '年付 · 省 20%') : t('Monthly', '月付')}
                </button>
              ))}
            </div>
          </div>

          <div
            className="card flex flex-col p-7 md:p-9"
            style={{
              background: 'var(--paper)',
              borderColor: 'var(--pine)',
              boxShadow: '0 30px 60px -42px rgba(10,13,11,0.38)',
            }}
          >
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="display text-[1.4rem]">{t('Sailwise Starter', 'Sailwise 入門')}</h2>
              <span className="eyebrow" style={{ color: 'var(--pine)' }}>
                {t('everything included', '全部包含')}
              </span>
            </div>
            <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: 'var(--ink-3)' }}>
              {t('Google & Microsoft email inbox · one account', 'Google 或 Microsoft 電郵收件匣 · 一個帳戶')}
            </p>

            <div className="mt-7 flex items-baseline gap-1.5">
              <span className="display text-[2.8rem] leading-none tabular-nums">
                {formatPrice(annual ? PLANS.starter.annual : PLANS.starter.monthly)}
              </span>
              <span className="text-[14px]" style={{ color: 'var(--ink-3)' }}>/mo</span>
            </div>
            <p className="mt-2 text-[12.5px]" style={{ color: 'var(--ink-3)' }}>
              {annual
                ? t(`Billed annually · ${formatPrice(PLANS.starter.monthly * 12 - PLANS.starter.annual * 12)} saved a year`, `按年收費 · 每年省 ${formatPrice(PLANS.starter.monthly * 12 - PLANS.starter.annual * 12)}`)
                : t('Billed monthly · cancel anytime', '按月收費 · 隨時取消')}
            </p>

            <div className="my-7 h-px" style={{ background: 'var(--hairline)' }} />

            <ul className="space-y-3">
              {PLAN_COPY.starter.features.map(([en, zh]) => (
                <li key={en} className="flex items-start gap-2.5 text-[14.5px] leading-snug" style={{ color: 'var(--ink-2)' }}>
                  <Check className="mt-[3px] h-3.5 w-3.5 shrink-0" style={{ color: 'var(--pine)' }} strokeWidth={2.5} />
                  {t(en, zh)}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout('starter')}
              disabled={loadingTier === 'starter'}
              className="btn btn-primary mt-8 w-full"
            >
              {loadingTier === 'starter'
                ? t('Redirecting…', '跳轉中…')
                : isLoggedIn
                  ? t('Go to billing', '前往帳單')
                  : t('Get started', '立即開始')}
            </button>

            <p className="mt-3 text-center text-[12px]" style={{ color: 'var(--ink-3)' }}>
              {t(
                '14-day free trial · Card required · Cancel anytime',
                '14 天免費試用 · 需要信用卡 · 隨時取消'
              )}
            </p>
            <p className="mt-4 text-center text-[12.5px] leading-relaxed" style={{ color: 'var(--ink-3)' }}>
              {t('Need multiple inboxes, more seats or custom work? ', '需要多個信箱、更多席位或自訂功能？')}
              <a href="mailto:tradeflow.hk@gmail.com" className="link-quiet">{t('Talk to us', '聯絡我們')}</a>
              {t('.', '。')}
            </p>
          </div>
        </div>
        {error && (
          <p className="mt-5 text-[13px]" style={{ color: 'var(--peach)' }}>
            {error}
          </p>
        )}

        <p className="mt-8 text-[13px]" style={{ color: 'var(--ink-3)' }}>
          {t(
            '14-day free trial · Card required · Cancel anytime.',
            '14 天免費試用 · 需要信用卡 · 隨時取消。'
          )}
        </p>
      </section>

      {/* ── What you get ─────────────────────────────────────────────────── */}
      <section
        className="band"
        style={{ background: 'var(--cyan)', borderTop: '1px solid var(--hairline)' }}
      >
        <div className="shell">
          <p className="eyebrow">{t('What you get', '您會得到什麼')}</p>
          <h2 className="display h-section mt-5 max-w-3xl text-balance">
            {t('The whole desk, on one screen.', '整張工作桌，都在同一個畫面裡。')}
          </h2>
          <p className="lede mt-5 max-w-2xl">
            {t(
              'Every tier includes the full product — the inbox, the extraction, the quote draft and the alerts. Tiers differ on inboxes, seats and volume, not on the features you need to do the job.',
              '每個方案都包含完整產品——收件匣、擷取、報價草稿與提示。方案差異在於信箱數、席位與用量，而不是您完成工作所需的功能。'
            )}
          </p>
          {/* Full shell width, so the sidebar, thread and buyer rail all render. */}
          <MockFrame
            className="mt-12"
            label="The Sailwise inbox: a buyer enquiry with the extracted spec rail and an AI-drafted reply awaiting approval."
          >
            <HeroProduct />
          </MockFrame>
        </div>
      </section>

      {/* ── Done-for-you setup ───────────────────────────────────────────── */}
      <section
        className="band"
        style={{ background: 'var(--paper-2)', borderBlock: '1px solid var(--hairline)' }}
      >
        <div className="shell grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
          <div>
            <p className="eyebrow">{t('Optional', '可選')}</p>
            <h2 className="display h-section mt-5 max-w-xl text-balance">
              {t('Done-for-you setup.', '代客設定。')}
            </h2>
            <p className="lede mt-5 max-w-xl">
              {t(
                'Let our team connect your inbox, upload your products and configure the AI with you. Most teams are answering live inquiries the same day.',
                '讓我們為您連接信箱、上傳產品，並與您一起配置 AI。大多數團隊當天就能開始回覆真實詢盤。'
              )}
            </p>
          </div>
          <div className="card p-7" style={{ background: 'var(--paper)' }}>
            <p className="eyebrow">{t('One-time', '一次性')}</p>
            <p className="display mt-3 text-[2.2rem] leading-none">{formatPrice(SETUP_FEE)}</p>
            <div className="my-6 h-px" style={{ background: 'var(--hairline)' }} />
            <a
              href="mailto:tradeflow.hk@gmail.com?subject=Done-for-you%20setup"
              className="btn btn-primary w-full"
            >
              {t('Arrange setup', '安排設定')}
              <ArrowRight className="h-4 w-4" />
            </a>
            <p className="mt-3 text-center text-[12px]" style={{ color: 'var(--ink-3)' }}>
              tradeflow.hk@gmail.com
            </p>
          </div>
        </div>
      </section>

      {/* ── Reassurance ──────────────────────────────────────────────────── */}
      <section className="shell py-12">
        <ul className="flex flex-wrap gap-x-8 gap-y-3 text-[13.5px]" style={{ color: 'var(--ink-2)' }}>
          {[
            [t('Encrypted in transit and at rest', '傳輸與靜態皆加密'), Lock],
            [t('Nothing sends without you', '未經您核准不會送出'), CircleCheck],
            [t('Cancel any time', '隨時取消'), Trash2],
          ].map(([label, Icon]) => {
            const I = Icon as typeof Lock;
            return (
              <li key={label as string} className="inline-flex items-center gap-2">
                <I className="h-3.5 w-3.5" style={{ color: 'var(--pine)' }} />
                {label as string}
              </li>
            );
          })}
        </ul>
      </section>

      <SiteFooter />
    </div>
  );
}
