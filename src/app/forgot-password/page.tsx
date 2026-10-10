'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CircleCheck } from 'lucide-react';
import { supabaseBrowser } from '@/lib/auth';
import { useLang } from '@/lib/lang';
import AuthShell from '@/components/site/AuthShell';

const PANEL = {
  eyebrow: ['Account recovery', '帳戶復原'] as [string, string],
  panelTitle: ['Get back to your inquiries.', '回到您的詢盤。'] as [string, string],
  panelPoints: [
    [
      'Your mailbox, catalogue and conversations stay encrypted in transit and at rest.',
      '您的信箱、目錄與對話在傳輸與靜態時均保持加密。',
    ],
    [
      'Nothing sends without your approval — every reply stays a draft.',
      '未經您核准不會送出——每則回覆都保持草稿狀態。',
    ],
    [
      'Your data is never used to train third-party models.',
      '您的資料絕不用於訓練第三方模型。',
    ],
  ] as [string, string][],
};

export default function ForgotPasswordPage() {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: resetError } = await supabaseBrowser.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(t('Something went wrong. Please try again.', '出了問題，請重試。'));
        return;
      }

      setSent(true);
    } catch {
      setError(t('Something went wrong. Please try again.', '出了問題，請重試。'));
    } finally {
      setLoading(false);
    }
  };

  // Always show the confirmation state regardless of whether the address
  // exists: telling an anonymous visitor whether an account is registered is
  // an account-enumeration oracle.
  if (sent) {
    return (
      <AuthShell
        eyebrow={PANEL.eyebrow}
        panelTitle={PANEL.panelTitle}
        panelPoints={PANEL.panelPoints}
        title={['Check your email', '請檢查您的電郵']}
        subtitle={[
          'If an account exists for that address, we have sent a link to reset your password.',
          '如果該電郵地址存在帳戶，我們已發送重設密碼連結。',
        ]}
      >
        <div className="card flex items-start gap-4 p-5" style={{ background: 'var(--paper-2)' }}>
          <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--pine)' }} />
          <p className="text-[14px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            {t(
              'Check your spam folder if it has not arrived within a few minutes.',
              '如果幾分鐘內仍未收到，請檢查垃圾郵件資料夾。'
            )}
          </p>
        </div>
        <Link href="/login" className="btn btn-primary mt-6 w-full">
          {t('Back to sign in', '返回登入')}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow={PANEL.eyebrow}
      panelTitle={PANEL.panelTitle}
      panelPoints={PANEL.panelPoints}
      title={['Reset password', '重設密碼']}
      subtitle={[
        'Enter your email and we will send you a reset link.',
        '輸入您的電郵，我們會發送重設連結。',
      ]}
      footer={
        <Link href="/login" className="link-quiet">
          {t('Back to sign in', '返回登入')}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div role="alert" className="field-error">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="field-label">
            {t('Email', '電郵')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="field-input"
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? t('Sending…', '發送中…') : t('Send reset link', '發送重設連結')}
        </button>
      </form>
    </AuthShell>
  );
}
