'use client';

import { useState, useEffect } from 'react';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { authFetch } from '@/lib/auth-fetch';
import WhatsAppConnect from '@/components/WhatsAppConnect';
import OAuthConnections from '@/components/OAuthConnections';

const ADMIN_EMAIL = 'tradeflow.hk@gmail.com';

export default function SettingsPage() {
  const { t } = useLang();
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
  const [pendingCompanies, setPendingCompanies] = useState<Array<{ id: string; name: string; created_at: string }>>([]);
  const [demoRequests, setDemoRequests] = useState<Array<{ id: string; name: string; email: string; company: string; phone: string; status: string; created_at: string }>>([]);

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
        }
        if (data.company) {
          setCompanyName(data.company.name ?? '');
          setSubscriptionStatus(data.company.subscription_status ?? 'none');
        }
      })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, [companyId]);

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

      {/* Integrations */}
      <section className="border rounded-[4px] p-5 mb-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <h2 className="text-[15px] font-semibold mb-4">{t('Integrations', '整合')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* WhatsApp */}
          <div className="border rounded-[4px] p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#25D366' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <div>
                <p className="text-[13px] font-medium">WhatsApp Business</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Meta Cloud API</p>
              </div>
            </div>
            <WhatsAppConnect />
          </div>

          {/* WeChat Work */}
          <div className="border rounded-[4px] p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#07C160' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.045c.134 0 .24-.108.24-.243 0-.06-.024-.12-.04-.178l-.325-1.233a.49.49 0 0 1 .177-.553C23.41 18.308 24 16.926 24 15.402c0-3.372-3.28-6.077-7.062-6.544zm-2.007 2.77c.535 0 .969.44.969.983a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.983a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982z"/></svg>
              </div>
              <div>
                <p className="text-[13px] font-medium">WeChat Work</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Enterprise API</p>
              </div>
            </div>
            <p className="text-[12px] mb-2" style={{ color: 'var(--text-muted)' }}>
              {t('Configure WeChat Work bot for customer messaging', '設定企業微信機器人用於客戶訊息')}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#FEF3C7', color: '#92400E' }}>
                {t('Coming Soon', '即將推出')}
              </span>
            </div>
          </div>

          {/* Email */}
          <div className="border rounded-[4px] p-4" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#7C3AED' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>
              <div>
                <p className="text-[13px] font-medium">{t('Email inbox', '電郵收件匣')}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>1-click Google / Microsoft OAuth</p>
              </div>
            </div>
            <OAuthConnections />
          </div>
        </div>
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

      {/* WhatsApp */}
      <section className="border rounded-[4px] p-5 mb-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <h2 className="text-[15px] font-semibold mb-1">WhatsApp Business API</h2>
        <p className="text-[13px] mb-4" style={{ color: 'var(--text-muted)' }}>
          {t('Connect via Meta Cloud API to send and receive WhatsApp messages.', '透過 Meta Cloud API 連接以收發 WhatsApp 訊息。')}
        </p>
        <WhatsAppConnect />
        <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <label className="block text-[13px] font-medium mb-1">Webhook URL</label>
          <div className="border rounded-[4px] px-3 py-2 text-[13px] font-mono" style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text-muted)' }}>
            {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/whatsapp` : '/api/webhooks/whatsapp'}
          </div>
          <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {t('Set this in your Meta App Dashboard → WhatsApp → Configuration → Webhook', '在 Meta App Dashboard → WhatsApp → Configuration → Webhook 中設定此 URL')}
          </p>
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
          {t('Let our team set up Sailwise for you. We\'ll connect WhatsApp, upload your products, and configure the AI. This is a one-time fee on top of your subscription plan.', '讓我們的團隊為您設定 Sailwise。我們會連接 WhatsApp、上傳產品並配置 AI。此為訂閱方案外的一次性費用。')}
        </p>
        <div className="flex items-center justify-between p-3 rounded-[4px]" style={{ background: 'var(--bg)' }}>
          <div>
            <p className="text-[13px] font-medium">{t('WhatsApp connection + Product upload + AI config', 'WhatsApp 連接 + 產品上傳 + AI 配置')}</p>
          </div>
          <span className="text-[18px] font-semibold">HK$1,000</span>
        </div>
        <p className="text-[12px] mt-3" style={{ color: 'var(--text-muted)' }}>
          {t('Contact us: tradeflow.hk@gmail.com', '聯繫我們：tradeflow.hk@gmail.com')}
        </p>
      </section>

      {/* Billing */}
      <section className="border rounded-[4px] p-5 mb-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <h2 className="text-[15px] font-semibold mb-2">{t('Billing', '帳單')}</h2>
        <p className="text-[13px] mb-3" style={{ color: 'var(--text-muted)' }}>
          {t('Manage your subscription, view plans, and update payment.', '管理您的訂閱、查看方案及更新付款。')}
        </p>
        <div className="flex items-center justify-between p-3 rounded-[4px] mb-3" style={{ background: 'var(--bg)' }}>
          <div>
            <p className="text-[12px] uppercase tracking-[0.05em] font-medium" style={{ color: 'var(--text-muted)' }}>
              {t('Current plan', '目前方案')}
            </p>
            {subscriptionStatus === 'active' ? (
              <p className="text-[15px] font-semibold mt-0.5">Starter SDR · HK$1,580/mo</p>
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
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
              {t('Active', '啟用中')}
            </span>
          ) : (
            <span className="text-[15px] font-semibold">HK$1,580/mo</span>
          )}
        </div>
        <a
          href="/admin/billing"
          className="inline-flex items-center gap-1 text-[13px] font-medium px-4 py-2 rounded-[4px] text-white"
          style={{ background: 'var(--accent)' }}
        >
          {t('Go to billing', '前往帳單')}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
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
