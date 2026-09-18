'use client';

import { useState, useEffect } from 'react';
import { useLang } from '@/lib/lang';
import { useCompany } from '@/lib/company';
import { authFetch } from '@/lib/auth-fetch';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export default function EmailConnect() {
  const { t } = useLang();
  const { companyId } = useCompany();

  const [apiKey, setApiKey] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [testEmail, setTestEmail] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const configured = !!fromEmail && !!fromName;

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    authFetch(`/api/admin/settings?company_id=${companyId}`)
      .then(r => r.json())
      .then(data => {
        const s = data.settings || {};
        if (s.email_api_key) setApiKey(s.email_api_key);
        if (s.email_from_email) setFromEmail(s.email_from_email);
        if (s.email_from_name) setFromName(s.email_from_name);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [companyId]);

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
          email_api_key: apiKey.trim(),
          email_from_email: fromEmail.trim(),
          email_from_name: fromName.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? t('Failed to save', '儲存失敗'));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('Failed to save', '儲存失敗'));
    } finally {
      setSaving(false);
    }
  };

  const handleTestSend = async () => {
    if (!testEmail.trim() || !fromEmail.trim() || !apiKey.trim()) return;
    setTestStatus('testing');
    setTestMessage('');
    try {
      const res = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey.trim(),
          from_email: fromEmail.trim(),
          from_name: fromName.trim(),
          to_email: testEmail.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestStatus('success');
        setTestMessage(t('Test email sent successfully', '測試電郵已成功發送'));
      } else {
        setTestStatus('error');
        setTestMessage(data.error ?? t('Failed to send test email', '發送測試電郵失敗'));
      }
    } catch {
      setTestStatus('error');
      setTestMessage(t('Network error — please check your connection', '網路錯誤——請檢查您的連接'));
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

  if (configured) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#7C3AED' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          </div>
          <div>
            <p className="text-[14px] font-medium">{t('Email Configured', '電郵已配置')}</p>
            <p className="text-[13px] font-mono" style={{ color: 'var(--text-muted)' }}>
              {fromName} &lt;{fromEmail}&gt;
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-[13px] font-medium mb-1">{t('Send test email to', '發送測試電郵至')}</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                disabled={testStatus === 'testing'}
                className="flex-1 border rounded-[4px] px-3 py-2 text-[14px] focus:outline-none"
                style={{ borderColor: 'var(--border)' }}
              />
              <button
                onClick={handleTestSend}
                disabled={testStatus === 'testing' || !testEmail.trim() || !apiKey.trim()}
                className="text-[13px] font-medium px-4 py-2 rounded-[4px] border whitespace-nowrap"
                style={{ borderColor: 'var(--border)', opacity: testStatus === 'testing' || !testEmail.trim() || !apiKey.trim() ? 0.6 : 1 }}
              >
                {testStatus === 'testing' ? t('Sending…', '發送中…') : t('Send Test', '發送測試')}
              </button>
            </div>
            {testStatus !== 'idle' && testStatus !== 'testing' && (
              <div
                className="flex items-center gap-2 text-[13px] rounded-[4px] px-3 py-2 mt-2"
                style={{
                  background: testStatus === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  color: testStatus === 'success' ? 'var(--success)' : 'var(--error, #ef4444)',
                }}
              >
                <span>{testStatus === 'success' ? '✓' : '✕'}</span>
                <span>{testMessage}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-[13px] px-3 py-1.5 rounded-[4px] font-medium"
            style={{ background: saved ? 'var(--success)' : 'var(--accent)', color: '#fff' }}
          >
            {saving ? t('Saving…', '儲存中…') : saved ? t('Saved', '已儲存') : t('Save', '儲存')}
          </button>
          {error && <p className="text-[13px]" style={{ color: 'var(--error, #ef4444)' }}>{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-[4px] p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-semibold text-white" style={{ background: '#7C3AED' }}>1</div>
          <p className="text-[14px] font-medium">{t('Setup Guide', '設定指南')}</p>
        </div>
        <div className="space-y-3 text-[13px]" style={{ color: 'var(--text-muted)' }}>
          <p>{t('Connect your Resend account to send transactional emails (quotes, follow-ups, invoices).', '連接您的 Resend 帳戶以發送交易電郵（報價、跟進、發票）。')}</p>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="font-semibold text-[var(--text)]">1.</span>
              <p>{t('Sign up at', '註冊於')} <a href="https://resend.com/" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--accent)' }}>resend.com</a> {t('and get your API key', '並取得您的 API Key')}</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-[var(--text)]">2.</span>
              <p>{t('Verify your sender domain (e.g. mail.yourdomain.com)', '驗證您的寄件網域（例如 mail.yourdomain.com）')}</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-[var(--text)]">3.</span>
              <p>{t('Enter your API key and sender details below', '在下方輸入您的 API Key 和寄件人資訊')}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-semibold text-white" style={{ background: 'var(--accent)' }}>2</div>
          <p className="text-[14px] font-medium">{t('Enter Credentials', '輸入憑證')}</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-[13px] font-medium mb-1">Resend API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="re_xxxxxxxxxxxxxxxxxxxx"
              disabled={saving}
              className="w-full border rounded-[4px] px-3 py-2 text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium mb-1">{t('Sender Name', '寄件人名稱')}</label>
            <input
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Pacific Trading Co."
              disabled={saving}
              className="w-full border rounded-[4px] px-3 py-2 text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium mb-1">{t('Sender Email', '寄件人電郵')}</label>
            <input
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="quotes@yourdomain.com"
              disabled={saving}
              className="w-full border rounded-[4px] px-3 py-2 text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !fromEmail.trim() || !fromName.trim()}
              className="text-[14px] font-medium px-4 py-2 rounded-[4px] text-white whitespace-nowrap"
              style={{ background: saved ? 'var(--success)' : 'var(--accent)', opacity: saving || !fromEmail.trim() || !fromName.trim() ? 0.6 : 1 }}
            >
              {saving ? t('Saving…', '儲存中…') : saved ? t('Saved', '已儲存') : t('Save credentials', '儲存憑證')}
            </button>
          </div>
          {error && <p className="text-[13px]" style={{ color: 'var(--error, #ef4444)' }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}
