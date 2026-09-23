'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/lang';
import { supabaseBrowser } from '@/lib/auth';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter SDR',
    monthly: 1580,
    annual: 1264,
    features: [
      '1 WhatsApp number & email inbox',
      '1,000 AI conversations a month',
      'Unlimited products & FAQ rules',
      'English, Mandarin, Cantonese, Spanish',
      'Human override & takeover anytime',
      'Knowledge base & website sync',
      'Custom AI personality',
    ],
  },
];

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
      // Logged in → go to billing page
      router.push('/admin/billing');
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
          <img src="/logo.svg" alt="Backtide" className="h-7" />
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
            {t('Start free, pay HK$1,580/month when ready. No setup fee.', '免費開始，準備好再按每月 HK$1,580 付費。無設置費。')}
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
          {PLANS.map((plan) => (
              <div
              key={plan.id}
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

              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-[14px] font-medium" style={{ color: 'var(--text-muted)' }}>HK$</span>
                <span className="text-[40px] font-semibold tracking-[-1.5px] leading-none">
                  {annual ? plan.annual : plan.monthly}
                </span>
                <span className="text-[14px]" style={{ color: 'var(--text-muted)' }}>/mo</span>
              </div>

              <p className="text-[12px] font-medium uppercase tracking-[0.08em] mb-3" style={{ color: 'var(--text-muted)' }}>
                {t("What's included", '包含內容')}
              </p>

              <div className="space-y-3 mb-8 flex-1">
                {plan.features.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--accent-light)' }}>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span className="text-[13px]">{item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loadingTier === plan.id}
                className="w-full text-center text-[14px] font-medium py-3 rounded-[4px] transition-opacity"
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  opacity: loadingTier === plan.id ? 0.7 : 1,
                }}
              >
                {loadingTier === plan.id
                  ? t('Redirecting…', '跳轉中…')
                  : isLoggedIn
                    ? t('Go to billing', '前往帳單')
                    : t('Get started', '立即開始')}
              </button>
            </div>
          ))}
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
            {t('Let our team set up Backtide for you. We\'ll connect WhatsApp, upload your products, and configure the AI.', '讓我們的團隊為您設定 Backtide。我們會連接 WhatsApp、上傳產品並配置 AI。')}
          </p>
          <div className="inline-block p-5 rounded-[4px] border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            <p className="text-[14px] font-medium mb-1">{t('Done-for-you setup', '代客設定')}</p>
            <p className="text-[24px] font-semibold mb-2">HK$1,288 <span className="text-[13px] font-normal" style={{ color: 'var(--text-muted)' }}>{t('one-time', '一次性')}</span></p>
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
            © 2026 Backtide
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
