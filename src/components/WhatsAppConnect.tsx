'use client';

import { useState, useEffect } from 'react';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { authFetch } from '@/lib/auth-fetch';

type Step = 'setup' | 'connected';

export default function WhatsAppConnect() {
  const { t } = useLang();
  const { companyId } = useCompany();

  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [savedPhoneNumberId, setSavedPhoneNumberId] = useState('');
  const [displayPhone, setDisplayPhone] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const connected = !!savedPhoneNumberId;

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    authFetch(`/api/admin/settings?company_id=${companyId}`)
      .then(r => r.json())
      .then(data => {
        const pid = data.company?.whatsapp_phone_number_id ?? '';
        const token = data.company?.whatsapp_access_token ?? '';
        const verify = data.company?.whatsapp_verify_token ?? '';
        const phone = data.company?.whatsapp_display_phone ?? '';
        if (pid) {
          setPhoneNumberId(pid);
          setSavedPhoneNumberId(pid);
        }
        if (token) setAccessToken(token);
        if (verify) setVerifyToken(verify);
        if (phone) setDisplayPhone(phone);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [companyId]);

  const handleSaveCredentials = async () => {
    if (!companyId) return;
    setSaving(true);
    setError('');
    try {
      const res = await authFetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          whatsapp_phone_number_id: phoneNumberId.trim(),
          whatsapp_access_token: accessToken.trim(),
          whatsapp_verify_token: verifyToken.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? t('Failed to save', '儲存失敗'));
      }
      setSavedPhoneNumberId(phoneNumberId.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Failed to save', '儲存失敗'));
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!phoneNumberId.trim() || !accessToken.trim()) return;
    setTestStatus('testing');
    setTestMessage('');
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${phoneNumberId.trim()}?access_token=${accessToken.trim()}`
      );
      const data = await res.json();
      if (res.ok && data.id) {
        setTestStatus('success');
        setTestMessage(t('Connected successfully', '連接成功'));
        if (data.display_phone_number) setDisplayPhone(data.display_phone_number);
      } else {
        setTestStatus('error');
        setTestMessage(data.error?.message ?? t('Invalid credentials', '憑證無效'));
      }
    } catch {
      setTestStatus('error');
      setTestMessage(t('Network error — please check your connection', '網路錯誤——請檢查您的連接'));
    }
  };

  const handleDisconnect = async () => {
    if (!companyId) return;
    setSaving(true);
    setError('');
    try {
      const res = await authFetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          whatsapp_phone_number_id: '',
          whatsapp_access_token: '',
          whatsapp_verify_token: '',
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? t('Failed to disconnect', '斷開失敗'));
      }
      setPhoneNumberId('');
      setAccessToken('');
      setVerifyToken('');
      setSavedPhoneNumberId('');
      setDisplayPhone('');
      setTestStatus('idle');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Failed to disconnect', '斷開失敗'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        {t('Loading…', '載入中…')}
      </div>
    );
  }

  if (connected) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#25D366' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 1.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div>
            <p className="text-[14px] font-medium">{t('WhatsApp Connected', 'WhatsApp 已連接')}</p>
            <p className="text-[13px] font-mono" style={{ color: 'var(--text-muted)' }}>
              {displayPhone || savedPhoneNumberId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDisconnect}
            disabled={saving}
            className="text-[13px] px-3 py-1.5 rounded-[4px] border font-medium"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            {saving ? t('Disconnecting…', '斷開中…') : t('Disconnect', '斷開連接')}
          </button>
          {error && <p className="text-[13px]" style={{ color: 'var(--error, #ef4444)' }}>{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Setup Guide */}
      <div className="border rounded-[4px] p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-semibold text-white" style={{ background: '#25D366' }}>1</div>
          <p className="text-[14px] font-medium">{t('Setup Guide', '設定指南')}</p>
        </div>
        
        <div className="space-y-3 text-[13px]" style={{ color: 'var(--text-muted)' }}>
          <p>{t('Follow these steps to connect your WhatsApp Business account:', '按照以下步驟連接您的 WhatsApp 商業帳戶：')}</p>
          
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="font-semibold text-[var(--text)]">1.</span>
              <p>{t('Create a Meta Developer account at', '在以下網址建立 Meta 開發者帳戶：')} <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--accent)' }}>developers.facebook.com</a></p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-[var(--text)]">2.</span>
              <p>{t('Create a new app → Select "Business" type → Add WhatsApp product', '建立新應用程式 → 選擇「商業」類型 → 新增 WhatsApp 產品')}</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-[var(--text)]">3.</span>
              <p>{t('Go to WhatsApp → API Setup → Copy your Phone Number ID and Access Token', '前往 WhatsApp → API Setup → 複製您的電話號碼 ID 和 Access Token')}</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-[var(--text)]">4.</span>
              <p>{t('Paste them below and click Save', '將它們貼到下方並點擊儲存')}</p>
            </div>
          </div>

          <a
            href="https://www.youtube.com/watch?v=tQFuDvv-krk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[13px] font-medium mt-2 px-3 py-1.5 rounded-[4px] border no-underline"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            {t('Watch video tutorial', '觀看影片教程')} (13 {t('min', '分鐘')})
          </a>
        </div>
      </div>

      {/* Credentials Form */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-semibold text-white" style={{ background: 'var(--accent)' }}>2</div>
          <p className="text-[14px] font-medium">{t('Enter Credentials', '輸入憑證')}</p>
        </div>

        {/* Quick Connect with Facebook */}
        <a
          href="https://developers.facebook.com/apps/create/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-[14px] font-medium px-4 py-2.5 rounded-[4px] text-white w-full justify-center no-underline mb-3"
          style={{ background: '#1877F2' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          {t('Open Meta Developer Console', '開啟 Meta 開發者主控台')}
        </a>

        <div className="space-y-3">
          <div>
            <label className="block text-[13px] font-medium mb-1">{t('Phone Number ID', '電話號碼 ID')}</label>
            <input
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="e.g. 1234567890"
              disabled={saving}
              className="w-full border rounded-[4px] px-3 py-2 text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium mb-1">{t('Access Token', 'Access Token')}</label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder={t('System user access token', '系統用戶 access token')}
              disabled={saving}
              className="w-full border rounded-[4px] px-3 py-2 text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium mb-1">{t('Verify Token', '驗證 Token')}</label>
            <input
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
              placeholder="your-custom-verify-token"
              disabled={saving}
              className="w-full border rounded-[4px] px-3 py-2 text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>
              {t('Choose a secret token and enter it in Meta App Dashboard → Webhook Configuration', '選擇一個密鑰 token 並輸入到 Meta App Dashboard → Webhook Configuration 中')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveCredentials}
              disabled={saving || !phoneNumberId.trim()}
              className="text-[14px] font-medium px-4 py-2 rounded-[4px] text-white whitespace-nowrap"
              style={{ background: saved ? 'var(--success)' : 'var(--accent)', opacity: saving || !phoneNumberId.trim() ? 0.6 : 1 }}
            >
              {saving ? t('Saving…', '儲存中…') : saved ? t('Saved', '已儲存') : t('Save credentials', '儲存憑證')}
            </button>
            <button
              onClick={handleTestConnection}
              disabled={testStatus === 'testing' || !phoneNumberId.trim() || !accessToken.trim()}
              className="text-[14px] font-medium px-4 py-2 rounded-[4px] border whitespace-nowrap"
              style={{ borderColor: 'var(--border)', opacity: testStatus === 'testing' || !phoneNumberId.trim() || !accessToken.trim() ? 0.6 : 1 }}
            >
              {testStatus === 'testing' ? t('Testing…', '測試中…') : t('Test Connection', '測試連接')}
            </button>
          </div>

          {testStatus !== 'idle' && testStatus !== 'testing' && (
            <div
              className="flex items-center gap-2 text-[13px] rounded-[4px] px-3 py-2"
              style={{
                background: testStatus === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                color: testStatus === 'success' ? 'var(--success)' : 'var(--error, #ef4444)',
              }}
            >
              <span>{testStatus === 'success' ? '✓' : '✕'}</span>
              <span>{testMessage}</span>
            </div>
          )}

          {error && <p className="text-[13px]" style={{ color: 'var(--error, #ef4444)' }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}
