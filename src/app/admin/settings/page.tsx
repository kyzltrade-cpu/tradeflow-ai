'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';
import ComposioConnections from '@/components/ComposioConnections';

const ADMIN_EMAIL = 'tradeflow.hk@gmail.com';

const BILLING_PLANS = [
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
      'Automated quote generation',
      'Dedicated account manager',
      'Custom integrations',
    ],
    comingSoon: true,
  },
];

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const { t } = useLang();
  const searchParams = useSearchParams();
  const { companyId } = useCompany();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('General Trading');
  const [responseDelay, setResponseDelay] = useState(3);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatWidgetEnabled, setChatWidgetEnabled] = useState(true);
  const [imageResponsePrompt, setImageResponsePrompt] = useState(
    "Thanks for the photo! To help me check our catalog immediately, do you have a model number, material preference, or target specs?"
  );
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('none');
  const [subscriptionPeriodEnd, setSubscriptionPeriodEnd] = useState<string>('');
  const [annual, setAnnual] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [pendingCompanies, setPendingCompanies] = useState<Array<{ id: string; name: string; created_at: string }>>([]);
  const [demoRequests, setDemoRequests] = useState<Array<{ id: string; name: string; email: string; company: string; phone: string; status: string; created_at: string }>>([]);
  const [currency, setCurrency] = useState('USD');
  const [fxRate, setFxRate] = useState('7.82');
  const [fxPair, setFxPair] = useState('USD → HKD');
  const [marginRules, setMarginRules] = useState<Array<{ name: string; product_category: string; margin_pct: string }>>([]);

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
        if (data.settings) {
          setSystemPrompt(data.settings.system_prompt ?? '');
          setIndustry(data.settings.industry ?? 'General Trading');
          setResponseDelay(data.settings.response_delay_seconds ?? 2);
          setChatWidgetEnabled(data.settings.chat_widget_enabled ?? true);
          if (data.settings.image_response_prompt) {
            setImageResponsePrompt(data.settings.image_response_prompt);
          }
          if (data.settings.pricing && typeof data.settings.pricing === 'object') {
            const p = data.settings.pricing as Record<string, unknown>;
            if (p.currency) setCurrency(String(p.currency));
            if (p.fx_rate) setFxRate(String(p.fx_rate));
            if (p.fx_pair) setFxPair(String(p.fx_pair));
            if (Array.isArray(p.margin_rules)) {
              setMarginRules(
                (p.margin_rules as Array<{ name: string; product_category?: string; margin_pct: number }>).map((r) => ({
                  name: r.name,
                  product_category: r.product_category || '',
                  margin_pct: String(r.margin_pct),
                }))
              );
            }
          }
        }
        if (data.company) {
          setCompanyName(data.company.name ?? '');
          setSubscriptionStatus(data.company.subscription_status ?? 'none');
          setSubscriptionPeriodEnd(data.company.subscription_current_period_end ?? '');
        }
      })
      .catch(() => setError('Failed to load settings'))
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

  // Fetch pending companies and demo requests for admin
  useEffect(() => {
    if (!isAdmin) return;

    authFetch('/api/admin/pending-companies')
      .then(r => r.json())
      .then(data => {
        if (data.companies) setPendingCompanies(data.companies);
        if (data.demoRequests) setDemoRequests(data.demoRequests);
      })
      .catch(() => {});
  }, [isAdmin]);

  const handleApproveCompany = async (companyId: string) => {
    try {
      await authFetch('/api/admin/pending-companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, action: 'approve' }),
      });
      setPendingCompanies(prev => prev.filter(c => c.id !== companyId));
      showToast(t('Company approved', '公司已批准'), 'success');
    } catch {
      showToast(t('Failed to approve', '批准失敗'), 'error');
    }
  };

  const handleRejectCompany = async (companyId: string) => {
    try {
      await authFetch('/api/admin/pending-companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, action: 'reject' }),
      });
      setPendingCompanies(prev => prev.filter(c => c.id !== companyId));
      showToast(t('Company rejected', '公司已拒絕'), 'success');
    } catch {
      showToast(t('Failed to reject', '拒絕失敗'), 'error');
    }
  };

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);
    setError('');
    try {
      const res = await authFetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          system_prompt: systemPrompt,
          industry,
          response_delay_seconds: responseDelay,
          chat_widget_enabled: chatWidgetEnabled,
          image_response_prompt: imageResponsePrompt,
          company_name: companyName,
          pricing: {
            currency,
            fx_rate: parseFloat(fxRate) || 7.82,
            fx_pair: fxPair,
            margin_rules: marginRules
              .filter((r) => r.name.trim() && r.margin_pct)
              .map((r) => ({ name: r.name.trim(), product_category: r.product_category.trim() || null, margin_pct: parseFloat(r.margin_pct) || 0 })),
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to save');
      }
      setSaved(true);
      showToast(t('Settings saved', '設定已儲存'), 'success');
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('[settings] save error:', e);
      const msg = e instanceof Error ? e.message : t('Failed to save settings', '儲存設定失敗');
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[960px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[20px] md:text-[24px] font-semibold tracking-[-0.5px]">{t('Settings', '設定')}</h1>
        <p className="text-[14px] mt-1" style={{ color: 'var(--text-muted)' }}>
          {t('Configure your AI assistant and connected channels', '設定您的 AI 助手及已連接的渠道')}
        </p>
      </div>

      {/* Connections */}
      <section className="border rounded-[4px] p-5 mb-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <h2 className="text-[15px] font-semibold mb-1">
          {t('Connections', '連接')}
        </h2>
        <p className="text-[13px] mb-4" style={{ color: 'var(--text-muted)' }}>
          {t(
            'Connect the apps your business runs on. Your AI inbox and company brain are built from email, spreadsheets, and documents — Gmail, Outlook, Excel, Google Sheets, OneDrive, and more.',
            '連接您業務所使用的應用程式。您的 AI 收件匣和公司知識庫由電郵、試算表和文件建立 — 包括 Gmail、Outlook、Excel、Google Sheets、OneDrive 等。'
          )}
        </p>
        <ComposioConnections />
      </section>

      

      {/* Company */}
      <section className="border rounded-[4px] p-5 mb-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <h2 className="text-[15px] font-semibold mb-4">{t('Company', '公司')}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-[13px] font-medium mb-1">{t('Company name', '公司名稱')}</label>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={loading}
              className="w-full border rounded-[4px] px-3 py-2 text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium mb-1">{t('Industry', '行業')}</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              disabled={loading}
              className="w-full border rounded-[4px] px-3 py-2 text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            >
              <option>{t('General Trading', '綜合貿易')}</option>
              <option>{t('Electronics', '電子')}</option>
              <option>{t('Drinkware', '飲品容器')}</option>
              <option>{t('Accessories', '配件')}</option>
              <option>{t('Home & Kitchen', '家居與廚房')}</option>
              <option>{t('Apparel', '服裝')}</option>
              <option>{t('Industrial', '工業')}</option>
            </select>
          </div>
        </div>
      </section>

      {/* System Prompt */}
      <section className="border rounded-[4px] p-5 mb-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <h2 className="text-[15px] font-semibold mb-1">{t('System Prompt', '系統提示詞')}</h2>
        <p className="text-[13px] mb-4" style={{ color: 'var(--text-muted)' }}>
          {t('Customize how your AI assistant behaves and responds', '自訂 AI 助手的行為和回覆方式')}
        </p>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          disabled={loading}
          className="w-full border rounded-[4px] px-3 py-2 text-[13px] font-mono h-32 focus:outline-none"
          style={{ borderColor: 'var(--border)' }}
        />
        <p className="text-[12px] mt-2" style={{ color: 'var(--text-muted)' }}>
          {t('This defines the AI personality, tone, and knowledge boundaries', '這定義了 AI 的個性、語氣和知識範圍')}
        </p>
      </section>

      {/* Chat Widget Toggle */}
      <section className="border rounded-[4px] p-5 mb-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold">{t('Website Chat Widget', '網站聊天元件')}</h2>
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {t('Show or hide the AI chat button on your website', '在您的網站上顯示或隱藏 AI 聊天按鈕')}
            </p>
          </div>
          <button
            onClick={() => setChatWidgetEnabled(!chatWidgetEnabled)}
            className="relative w-11 h-6 rounded-full transition-colors shrink-0"
            style={{ background: chatWidgetEnabled ? 'var(--accent)' : 'var(--border)' }}
          >
            <div
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
              style={{ left: chatWidgetEnabled ? '22px' : '2px' }}
            />
          </button>
        </div>
        <p className="text-[12px] mt-2" style={{ color: 'var(--text-muted)' }}>
          {chatWidgetEnabled
            ? t('Chat widget is active — visitors can message your AI', '聊天元件已啟用——訪客可以向您的 AI 發送訊息')
            : t('Chat widget is hidden — visitors cannot see the chat button', '聊天元件已隱藏——訪客看不到聊天按鈕')}
        </p>
      </section>

      {/* Quote Pricing */}
      <section className="border rounded-[4px] p-5 mb-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <h2 className="text-[15px] font-semibold mb-1">{t('Quote Pricing', '報價定價')}</h2>
        <p className="text-[13px] mb-4" style={{ color: 'var(--text-muted)' }}>
          {t('Margin rules and FX used by the suggested quotes in your inbox. Every figure is cited back to these rules.', '收件匣建議報價所使用的利潤規則與匯率。每個數字都會引述回這些規則。')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-[13px] font-medium mb-1">{t('Currency', '貨幣')}</label>
            <input
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={loading}
              className="w-full border rounded-[4px] px-3 py-2 text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium mb-1">{t('FX rate', '匯率')}</label>
            <input
              value={fxRate}
              onChange={(e) => setFxRate(e.target.value)}
              disabled={loading}
              className="w-full border rounded-[4px] px-3 py-2 text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium mb-1">{t('FX pair', '匯率對')}</label>
            <input
              value={fxPair}
              onChange={(e) => setFxPair(e.target.value)}
              disabled={loading}
              className="w-full border rounded-[4px] px-3 py-2 text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
        </div>
        <p className="text-[12px] font-medium mb-2">
          {t('Margin rules', '利潤規則')} <span className="font-normal" style={{ color: 'var(--text-muted)' }}>
            {t('(leave category empty to apply to all products)', '（類別留空即套用於所有產品）')}
          </span>
        </p>
        <div className="space-y-2 mb-3">
          {marginRules.map((r, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={r.name}
                onChange={(e) => setMarginRules((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                placeholder={t('Rule name (e.g. Bottle margin rule)', '規則名稱（例如：瓶類利潤規則）')}
                className="flex-1 border rounded-[4px] px-3 py-2 text-[13px] focus:outline-none"
                style={{ borderColor: 'var(--border)' }}
                disabled={loading}
              />
              <input
                value={r.product_category}
                onChange={(e) => setMarginRules((prev) => prev.map((x, j) => (j === i ? { ...x, product_category: e.target.value } : x)))}
                placeholder={t('Category (e.g. bottle)', '類別（例如：瓶子）')}
                className="w-40 border rounded-[4px] px-3 py-2 text-[13px] focus:outline-none"
                style={{ borderColor: 'var(--border)' }}
                disabled={loading}
              />
              <input
                value={r.margin_pct}
                onChange={(e) => setMarginRules((prev) => prev.map((x, j) => (j === i ? { ...x, margin_pct: e.target.value } : x)))}
                type="number"
                placeholder="20"
                className="w-20 border rounded-[4px] px-3 py-2 text-[13px] focus:outline-none"
                style={{ borderColor: 'var(--border)' }}
                disabled={loading}
              />
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>%</span>
              <button
                onClick={() => setMarginRules((prev) => prev.filter((_, j) => j !== i))}
                className="text-[12px] px-2 py-1 rounded-[4px] border"
                style={{ borderColor: 'var(--border)', color: 'var(--error)' }}
                disabled={loading}
              >
                {t('Remove', '移除')}
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => setMarginRules((prev) => [...prev, { name: '', product_category: '', margin_pct: '' }])}
          className="text-[12px] font-medium px-3 py-1.5 rounded-[4px] border"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          disabled={loading}
        >
          + {t('Add margin rule', '新增利潤規則')}
        </button>
        <p className="text-[12px] mt-3" style={{ color: 'var(--text-muted)' }}>
          {t('Example: 20% on bottles, 10% on accessories — products without a matching rule are quoted at cost.', '例如：瓶類 20%、配件 10%——沒有匹配規則的產品會按成本價報出。')}
        </p>
      </section>

      {/* Response Delay */}
      <section className="border rounded-[4px] p-5 mb-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <h2 className="text-[15px] font-semibold mb-1">{t('Response Delay', '回覆延遲')}</h2>
        <p className="text-[13px] mb-4" style={{ color: 'var(--text-muted)' }}>
          {t('Simulate human typing by delaying AI responses', '透過延遲 AI 回覆來模擬人手打字')}
        </p>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="range"
              min="0"
              max="120"
              step="1"
              value={responseDelay}
              onChange={(e) => setResponseDelay(Number(e.target.value))}
              disabled={loading}
              className="w-full"
            />
          </div>
          <div className="w-[80px] text-center">
            <span className="text-[20px] font-semibold">{responseDelay}</span>
            <span className="text-[13px] ml-1" style={{ color: 'var(--text-muted)' }}>
              {responseDelay === 1 ? t('sec', '秒') : t('sec', '秒')}
            </span>
          </div>
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {t('Instant (0s)', '即時 (0s)')}
          </span>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {t('2 minutes', '2 分鐘')}
          </span>
        </div>
        <p className="text-[12px] mt-3" style={{ color: 'var(--text-muted)' }}>
          {responseDelay === 0
            ? t('AI replies instantly — may feel robotic', 'AI 即時回覆 — 可能感覺機械化')
            : responseDelay <= 3
            ? t('Quick reply — feels like a fast typer', '快速回覆 — 感覺像打字快的人')
            : responseDelay <= 8
            ? t('Natural pace — feels like a real person', '自然節奏 — 感覺像真人')
            : responseDelay <= 30
            ? t('Slow reply — thoughtful pace', '慢速回覆 — 深思熟慮的節奏')
            : t('Very slow — may frustrate customers', '非常慢 — 可能令客戶不耐煩')}
        </p>
      </section>

      {/* Image Detection Auto-Response */}
      <section className="border rounded-[4px] p-5 mb-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <h2 className="text-[15px] font-semibold mb-1">{t('Image Detection Auto-Response', '圖片偵測自動回覆')}</h2>
        <p className="text-[13px] mb-4" style={{ color: 'var(--text-muted)' }}>
          {t('When a buyer sends an image, AI will automatically reply with a customizable message to gather more details', '當買家發送圖片時，AI 會自動回覆可自訂的訊息以收集更多細節')}
        </p>
        <textarea
          value={imageResponsePrompt}
          onChange={(e) => setImageResponsePrompt(e.target.value)}
          disabled={loading}
          className="w-full border rounded-[4px] px-3 py-2 text-[13px] h-24 focus:outline-none"
          style={{ borderColor: 'var(--border)' }}
        />
        <p className="text-[12px] mt-2" style={{ color: 'var(--text-muted)' }}>
          {t('Customize the message AI sends when it detects an image. Ask for model number, material, size, or other specs to search your catalog.', '自訂 AI 偵測到圖片時發送的訊息。要求提供型號、材料、尺寸或其他規格以搜尋您的產品目錄。')}
        </p>
      </section>

      {/* Setup Service */}
      <section className="border rounded-[4px] p-5 mb-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-[15px] font-semibold">{t('Done-for-you Setup', '代客設定')}</h2>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            +HK$1,000
          </span>
        </div>
        <p className="text-[13px] mb-3" style={{ color: 'var(--text-muted)' }}>
          {t('Let our team set up Sailwise for you. We\'ll connect your email inbox, upload your products, and configure the AI. This is a one-time fee on top of your subscription plan.', '讓我們的團隊為您設定 Sailwise。我們會連接您的電郵收件匣、上傳產品並配置 AI。此為訂閱方案外的一次性費用。')}
        </p>
        <div className="flex items-center justify-between p-3 rounded-[4px]" style={{ background: 'var(--bg)' }}>
          <div>
            <p className="text-[13px] font-medium">{t('Email inbox connection + Product upload + AI config', '電郵收件匣連接 + 產品上傳 + AI 配置')}</p>
          </div>
          <span className="text-[18px] font-semibold">HK$1,000</span>
        </div>
        <p className="text-[12px] mt-3" style={{ color: 'var(--text-muted)' }}>
          {t('Contact us: tradeflow.hk@gmail.com', '聯繫我們：tradeflow.hk@gmail.com')}
        </p>
      </section>

      {/* Billing */}
      <section className="border rounded-[4px] p-5 mb-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <h2 className="text-[15px] font-semibold mb-1">{t('Billing', '帳單')}</h2>
        <p className="text-[13px] mb-4" style={{ color: 'var(--text-muted)' }}>
          {t('Manage your subscription and payment', '管理您的訂閱和付款')}
        </p>

        {/* Current plan */}
        <div className="flex items-center justify-between p-3 rounded-[4px] mb-4" style={{ background: 'var(--bg)' }}>
          <div>
            <p className="text-[12px] uppercase tracking-[0.05em] font-medium" style={{ color: 'var(--text-muted)' }}>
              {t('Current plan', '目前方案')}
            </p>
            {subscriptionStatus === 'active' ? (
              <>
                <p className="text-[15px] font-semibold mt-0.5">Starter SDR · HK$1,880/mo</p>
                {subscriptionPeriodEnd && (
                  <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {t('Next billing', '下次扣費')}: {new Date(subscriptionPeriodEnd).toLocaleDateString()}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-[15px] font-semibold mt-0.5">{t('Free trial', '免費試用')}</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {t('14-day free trial included', '包含 14 天免費試用')}
                </p>
              </>
            )}
          </div>
          {subscriptionStatus === 'active' ? (
            <button
              onClick={handlePortal}
              disabled={checkoutLoading}
              className="text-[12px] font-medium px-3 py-1.5 rounded-[4px] border"
              style={{ borderColor: 'var(--border)' }}
            >
              {t('Manage subscription', '管理訂閱')}
            </button>
          ) : (
            <div className="text-right">
              <span className="text-[18px] font-semibold">HK$1,880</span>
              <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>/mo</span>
            </div>
          )}
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-5">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {BILLING_PLANS.map((plan) => {
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

        <p className="text-[12px] text-center mt-4" style={{ color: 'var(--text-muted)' }}>
          {t('All plans include 14-day free trial. No setup fees. Annual billing saves 20%.', '所有方案包含 14 天免費試用。無設置費。年付可節省 20%。')}
        </p>
      </section>

      {/* Admin Panel - Only visible to admin */}
      {isAdmin && (
        <section className="border rounded-[4px] p-5 mb-6" style={{ borderColor: 'var(--accent)', background: 'var(--surface)' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)', color: '#fff' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h2 className="text-[15px] font-semibold">{t('Admin Panel', '管理面板')}</h2>
          </div>

          {/* Pending Companies */}
          <div className="mb-6">
            <h3 className="text-[13px] font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
              {t('Pending Approvals', '待審批')} ({pendingCompanies.length})
            </h3>
            {pendingCompanies.length === 0 ? (
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {t('No pending companies', '沒有待審批公司')}
              </p>
            ) : (
              <div className="space-y-2">
                {pendingCompanies.map((company) => (
                  <div key={company.id} className="flex items-center justify-between p-3 rounded-[4px] border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                    <div>
                      <p className="text-[13px] font-medium">{company.name}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {t('Created', '建立於')}: {new Date(company.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveCompany(company.id)}
                        className="text-[12px] font-medium px-3 py-1.5 rounded-[4px] text-white"
                        style={{ background: 'var(--success, #22c55e)' }}
                      >
                        {t('Approve', '批准')}
                      </button>
                      <button
                        onClick={() => handleRejectCompany(company.id)}
                        className="text-[12px] font-medium px-3 py-1.5 rounded-[4px] border"
                        style={{ borderColor: 'var(--error, #ef4444)', color: 'var(--error, #ef4444)' }}
                      >
                        {t('Reject', '拒絕')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Demo Requests */}
          <div>
            <h3 className="text-[13px] font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
              {t('Demo Requests', '演示請求')} ({demoRequests.length})
            </h3>
            {demoRequests.length === 0 ? (
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {t('No demo requests', '沒有演示請求')}
              </p>
            ) : (
              <div className="space-y-2">
                {demoRequests.map((request) => (
                  <div key={request.id} className="p-3 rounded-[4px] border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-medium">{request.name}</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {request.email} · {request.company}
                        </p>
                        {request.phone && (
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {request.phone}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#FEF3C7', color: '#92400E' }}>
                        {request.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Save */}
      <div className="flex items-center justify-end gap-3">
        {error && (
          <p className="text-[13px]" style={{ color: 'var(--error, #ef4444)' }}>{error}</p>
        )}
        <button
          onClick={handleSave}
          disabled={loading || saving || !companyId}
          className="text-[14px] font-medium px-6 py-2 rounded-[4px] text-white"
          style={{ background: saved ? 'var(--success)' : 'var(--accent)' }}
        >
          {saving ? t('Saving…', '儲存中…') : saved ? t('Saved', '已儲存') : t('Save changes', '儲存變更')}
        </button>
      </div>
    </div>
  );
}
