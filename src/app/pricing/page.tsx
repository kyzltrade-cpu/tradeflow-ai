'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/lang';
import { supabaseBrowser } from '@/lib/auth';
import { PLANS, currencySymbol, formatPrice } from '@/lib/billing-plans';

const SETUP_FEE = 1000;
const PLAN_ORDER = ['starter', 'growth', 'enterprise'] as const;
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
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <Link href="/" className="flex items-center gap-2">
          <img src="/brand/sailwise-mark.png" alt="Sailwise" className="h-8 rounded-lg" />
        </Link>
        <div className="flex items-center gap-4">
          <a href="#pricing" className="text-[14px] font-medium" style={{ color: 'var(--text-muted)' }}>
            {t('Pricing', '定價')}
          </a>
          <Link href="/login" className="text-[14px] font-medium" style={{ color: 'var(--text-muted)' }}>
            {t('Log in', '登入')}
          </Link>
        </div>
      </header>

      {/* Pricing */}
      <section id="pricing" className="max-w-[1100px] mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-10 md:mb-14">
          <p className="text-[12px] font-medium uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--accent)' }}>
            {t('Pricing', '定價')}
          </p>
          <h1 className="text-[28px] md:text-[36px] font-semibold tracking-[-1px] mb-4">
            {t('Simple pricing', '簡單定價')}
          </h1>
          <p className="text-[16px] max-w-[600px] mx-auto mb-8" style={{ color: 'var(--text-muted)' }}>
            {t(
              `Start free, pay ${formatPrice(PLANS.starter.monthly)}/month when ready. Self-serve setup is free (optional done-for-you setup +${formatPrice(SETUP_FEE)}).`,
              `免費開始，準備好再按每月 ${formatPrice(PLANS.starter.monthly)} 付費。自行設定免費（可選 +${formatPrice(SETUP_FEE)} 專人設定）。`,
            )}
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 p-1 rounded-full" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setAnnual(false)}
              className="px-4 py-1.5 rounded-full text-[13px] font-medium transition-all"
              style={{
                background: !annual ? 'var(--accent)' : 'transparent',
                color: !annual ? '#fff' : 'var(--text-muted)',
              }}
            >
              {t('Monthly', '月付')}
            </button>
            <button
              onClick={() => setAnnual(true)}
              className="px-4 py-1.5 rounded-full text-[13px] font-medium transition-all"
              style={{
                background: annual ? 'var(--accent)' : 'transparent',
                color: annual ? '#fff' : 'var(--text-muted)',
              }}
            >
              {t('Annual (save 20%)', '年付（省 20%）')}
            </button>
          </div>
        </div>

        <div className="max-w-[440px] mx-auto">
          {PLAN_ORDER.map((planId) => {
            const plan = PLANS[planId];
            const copy = PLAN_COPY[planId];
            return (
              <div
              key={planId}
              className="border rounded-[8px] p-8 flex flex-col relative overflow-hidden"
              style={{
                borderColor: 'var(--accent)',
                background: 'var(--surface)',
                boxShadow: '0 24px 60px -24px rgba(10,110,92,0.25)',
              }}
            >

              <div className="mb-3">
                <h2 className="text-[18px] font-semibold">{plan.name}</h2>
              </div>

              <p className="text-[12px] mb-4" style={{ color: 'var(--text-muted)' }}>
                {copy.blurb[0]}
              </p>

              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-[14px] font-medium" style={{ color: 'var(--text-muted)' }}>{currencySymbol()}</span>
                <span className="text-[40px] font-semibold tracking-[-1.5px] leading-none">
                  {(annual ? plan.annual : plan.monthly).toLocaleString('en-US')}
                </span>
                <span className="text-[14px]" style={{ color: 'var(--text-muted)' }}>/mo</span>
              </div>

              <p className="text-[12px] font-medium uppercase tracking-[0.08em] mb-3" style={{ color: 'var(--text-muted)' }}>
                {t("What's included", '包含內容')}
              </p>

              <div className="space-y-3 mb-8 flex-1">
                {copy.features.map(([en, zh]) => (
                  <div key={en} className="flex items-center gap-3">
                    <div className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--accent-light)' }}>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span className="text-[13px]">{t(en, zh)}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleCheckout(planId)}
                disabled={loadingTier === planId}
                className="w-full text-center text-[14px] font-medium py-3 rounded-[4px] transition-opacity"
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  opacity: loadingTier === planId ? 0.7 : 1,
                }}
              >
                {loadingTier === planId
                  ? t('Redirecting…', '跳轉中…')
                  : isLoggedIn
                    ? t('Go to billing', '前往帳單')
                    : t('Get started', '立即開始')}
              </button>
            </div>
            );
          })}
        </div>

        {error && (
          <p className="text-[13px] mt-4 text-center" style={{ color: 'var(--error)' }}>{error}</p>
        )}

        <p className="text-[13px] text-center mt-8" style={{ color: 'var(--text-muted)' }}>
          {t('14-day free trial · Card required · 50 AI responses included · Cancel anytime.', '14 天免費試用 · 需要信用卡 · 包含 50 次 AI 回覆 · 隨時取消。')}
        </p>
      </section>

      {/* Setup Service */}
      <section className="border-y" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="max-w-[600px] mx-auto px-6 py-12 text-center">
          <h2 className="text-[22px] font-semibold mb-3">{t('Need help getting started?', '需要幫助開始？')}</h2>
          <p className="text-[14px] mb-6" style={{ color: 'var(--text-muted)' }}>
            {t('Let our team set up Sailwise for you. We\'ll connect your inbox, upload your products, and configure the AI.', '讓我們的團隊為您設定 Sailwise。我們會連接您的電郵信箱、上傳產品並配置 AI。')}
          </p>
          <div className="inline-block p-5 rounded-[4px] border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            <p className="text-[14px] font-medium mb-1">{t('Done-for-you setup', '代客設定')}</p>
            <p className="text-[24px] font-semibold mb-2">{formatPrice(SETUP_FEE)} <span className="text-[13px] font-normal" style={{ color: 'var(--text-muted)' }}>{t('one-time', '一次性')}</span></p>
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {t('Contact us to arrange: tradeflow.hk@gmail.com', '聯繫我們安排：tradeflow.hk@gmail.com')}
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="max-w-[1100px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            © 2026 Sailwise
          </p>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {t('Home', '首頁')}
            </Link>
            <Link href="/login" className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {t('Log in', '登入')}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
