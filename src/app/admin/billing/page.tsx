'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter SDR',
    price: 1880,
    annualPrice: 1504,
    features: [
      'Email inbox (Google or Microsoft)',
      'Unlimited AI conversations',
      'Unlimited products & FAQ rules',
      'EN / ZH / Cantonese support',
      'Human override & takeovers',
      'Knowledge base & website sync',
      'Custom AI personality',
    ],
  },
  {
    id: 'growth',
    name: 'Growth Trading Desk',
    price: 2480,
    annualPrice: 1984,
    features: [
      'Multiple email inbox accounts',
      'Multi-user dashboard',
      'Analytics & reporting',
      'Priority support',
    ],
    comingSoon: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 4880,
    annualPrice: 3904,
    features: [
      'AI sourcing & supplier matching',
      'Automated quote generation',
      'Dedicated account manager',
      'Custom integrations',
    ],
    comingSoon: true,
  },
];

export default function BillingPage() {
  return (
    <Suspense>
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const { t } = useLang();
  const searchParams = useSearchParams();
  const { companyId } = useCompany();
  const { showToast } = useToast();
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('none');
  const [subscriptionPeriodEnd, setSubscriptionPeriodEnd] = useState<string>('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    const billing = searchParams.get('billing');
    if (billing === 'success') {
      showToast(t('Subscription activated! Your account is now on the paid plan.', '訂閱已啟用！您的帳戶現在是付費方案。'), 'success');
    } else if (billing === 'cancelled') {
      showToast(t('Checkout was cancelled.', '結帳已取消。'));
    }
  }, [searchParams, showToast, t]);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    authFetch(`/api/admin/settings?company_id=${companyId}`)
      .then(r => r.json())
      .then(data => {
        if (data.company) {
          setSubscriptionStatus(data.company.subscription_status ?? 'none');
          setSubscriptionPeriodEnd(data.company.subscription_current_period_end ?? '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [companyId]);

  const handleCheckout = async (tier: string) => {
    setCheckoutLoading(true);
    try {
      const res = await authFetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, interval: annual ? 'year' : 'month' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create checkout');
      if (data.url) window.location.href = data.url;
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Checkout failed', 'error');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePortal = async () => {
    setCheckoutLoading(true);
    try {
      const res = await authFetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to open portal');
      if (data.url) window.location.href = data.url;
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Portal failed', 'error');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="max-w-[960px] mx-auto">
      <a
        href="/admin/settings"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium mb-5 px-3 py-1.5 rounded-[4px] border hover:bg-black/5 transition-colors"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        {t('Back to Settings', '返回設定')}
      </a>

      <div className="mb-6">
        <h1 className="text-[20px] md:text-[24px] font-semibold tracking-[-0.5px]">{t('Billing', '帳單')}</h1>
        <p className="text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
          {t('Manage your subscription and payment', '管理您的訂閱和付款')}
        </p>
      </div>

      {/* Current plan card */}
      <div className="border rounded-[4px] p-5 mb-6" style={{ borderColor: subscriptionStatus === 'active' ? '#22c55e' : 'var(--border)', background: subscriptionStatus === 'active' ? 'rgba(34,197,94,0.05)' : 'var(--surface)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] uppercase tracking-[0.05em] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              {t('Current plan', '目前方案')}
            </p>
            <p className="text-[18px] font-semibold">
              {subscriptionStatus === 'active' ? 'Sailwise' : t('Free trial', '免費試用')}
            </p>
            {subscriptionStatus === 'active' && subscriptionPeriodEnd && (
              <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {t('Next billing', '下次扣費')}: {new Date(subscriptionPeriodEnd).toLocaleDateString()}
              </p>
            )}
            {subscriptionStatus !== 'active' && (
              <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
                {t('14-day free trial included', '包含 14 天免費試用')}
              </p>
            )}
          </div>
          {subscriptionStatus === 'active' ? (
            <button
              onClick={handlePortal}
              disabled={checkoutLoading}
              className="text-[13px] font-medium px-4 py-2 rounded-[4px] border"
              style={{ borderColor: 'var(--border)' }}
            >
              {t('Manage subscription', '管理訂閱')}
            </button>
          ) : (
            <div className="text-right">
              <span className="text-[20px] font-semibold">HK$1,880</span>
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>/mo</span>
            </div>
          )}
        </div>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <span className="text-[13px]" style={{ color: !annual ? 'var(--text)' : 'var(--text-muted)', fontWeight: !annual ? 500 : 400 }}>
          {t('Monthly', '每月')}
        </span>
        <button
          onClick={() => setAnnual(!annual)}
          className="relative w-11 h-6 rounded-full transition-colors shrink-0"
          style={{ background: annual ? 'var(--accent)' : 'var(--border)' }}
        >
          <div
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
            style={{ left: annual ? '22px' : '2px' }}
          />
        </button>
        <span className="text-[13px]" style={{ color: annual ? 'var(--text)' : 'var(--text-muted)', fontWeight: annual ? 500 : 400 }}>
          {t('Annual', '每年')} <span className="text-[11px]" style={{ color: 'var(--accent)' }}>−20%</span>
        </span>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {PLANS.map((plan) => {
          const price = annual ? plan.annualPrice : plan.price;
          const isActive = subscriptionStatus === 'active' && plan.id === 'starter';

          return (
            <div
              key={plan.id}
              className="relative border rounded-[4px] p-5 flex flex-col"
              style={{
                borderColor: plan.id === 'starter' ? 'var(--accent)' : 'var(--border)',
                background: 'var(--surface)',
              }}
            >
              {plan.comingSoon && (
                <span className="absolute -top-2.5 right-3 px-2 py-0.5 text-[10px] font-semibold rounded-full" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  {t('Coming Soon', '即將推出')}
                </span>
              )}
              {plan.id === 'starter' && (
                <span className="absolute -top-2.5 right-3 px-2 py-0.5 text-[10px] font-semibold text-white rounded-full" style={{ background: 'var(--accent)' }}>
                  {t('POPULAR', '熱門')}
                </span>
              )}
              <p className="text-[15px] font-semibold">{plan.name}</p>
              <div className="mt-3 mb-4">
                <span className="text-[28px] font-bold">HK${price}</span>
                <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>/{t('mo', '月')}</span>
                {annual && (
                  <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    HK${plan.price}/mo {t('billed annually', '年付')}
                  </p>
                )}
              </div>
              <ul className="space-y-2 mb-5 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" className="shrink-0 mt-0.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              {plan.comingSoon ? (
                <button
                  disabled
                  className="w-full text-[13px] font-medium py-2.5 rounded-[4px] opacity-50 cursor-not-allowed"
                  style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  {t('Coming Soon', '即將推出')}
                </button>
              ) : isActive ? (
                <button
                  onClick={handlePortal}
                  disabled={checkoutLoading}
                  className="w-full text-[13px] font-medium py-2.5 rounded-[4px] border"
                  style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
                >
                  {t('Current plan', '目前方案')}
                </button>
              ) : (
                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={checkoutLoading}
                  className="w-full text-[13px] font-medium py-2.5 rounded-[4px] text-white"
                  style={{ background: 'var(--accent)' }}
                >
                  {checkoutLoading ? t('Redirecting…', '跳轉中…') : t('Subscribe now', '立即訂閱')}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Setup service */}
      <div className="border rounded-[4px] p-5 mb-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-[15px] font-semibold">{t('Done-for-you Setup', '代客設定')}</h2>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            +$150
          </span>
        </div>
        <p className="text-[13px] mb-3" style={{ color: 'var(--text-muted)' }}>
          {t('Let our team set up Sailwise for you. We\'ll connect WhatsApp, upload your products, and configure the AI. This is a one-time fee on top of your subscription plan.', '讓我們的團隊為您設定 Sailwise。我們會連接 WhatsApp、上傳產品並配置 AI。此為訂閱方案外的一次性費用。')}
        </p>
        <div className="flex items-center justify-between p-3 rounded-[4px]" style={{ background: 'var(--bg)' }}>
          <div>
            <p className="text-[13px] font-medium">{t('WhatsApp connection + Product upload + AI config', 'WhatsApp 連接 + 產品上傳 + AI 配置')}</p>
          </div>
          <span className="text-[18px] font-semibold">+$150</span>
        </div>
        <p className="text-[12px] mt-3" style={{ color: 'var(--text-muted)' }}>
          {t('Contact us: tradeflow.hk@gmail.com', '聯繫我們：tradeflow.hk@gmail.com')}
        </p>
      </div>

      <p className="text-[12px] text-center" style={{ color: 'var(--text-muted)' }}>
        {t('All plans include 14-day free trial. No setup fees. Annual billing saves 20%.', '所有方案包含 14 天免費試用。無設置費。年付可節省 20%。')}
      </p>
    </div>
  );
}
