'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CircleCheck } from 'lucide-react';
import { supabaseBrowser } from '@/lib/auth';
import { useLang } from '@/lib/lang';
import AuthShell from '@/components/site/AuthShell';

type Status = 'checking' | 'ready' | 'invalid' | 'done';

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

export default function ResetPasswordPage() {
  const { t } = useLang();
  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Supabase parses the recovery token out of the URL hash and establishes the
  // session on the client. Until that has happened there is no way to know
  // whether the link is valid, so the form stays disabled rather than flashing
  // a "link expired" error at a user whose link is still loading.
  useEffect(() => {
    let cancelled = false;

    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setStatus(data.session ? 'ready' : 'invalid');
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('Passwords do not match', '密碼不匹配'));
      return;
    }

    if (password.length < 6) {
      setError(t('Password must be at least 6 characters', '密碼至少需要 6 個字符'));
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabaseBrowser.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      // The recovery session is a one-time elevated grant. Drop it before
      // handing the user back to the login page so the new password is not
      // entered while still authenticated as the recovery session.
      await supabaseBrowser.auth.signOut();
      setStatus('done');
    } catch {
      setError(t('Something went wrong. Please try again.', '出了問題，請重試。'));
      setLoading(false);
    }
  };

  if (status === 'checking') {
    return (
      <AuthShell
        eyebrow={PANEL.eyebrow}
        panelTitle={PANEL.panelTitle}
        panelPoints={PANEL.panelPoints}
        title={['Verifying your link', '正在驗證連結']}
        subtitle={['This takes a moment.', '請稍候。']}
      >
        <p className="field-hint" role="status" aria-live="polite">
          {t('Checking your reset link…', '正在檢查您的重設連結…')}
        </p>
      </AuthShell>
    );
  }

  if (status === 'invalid') {
    return (
      <AuthShell
        eyebrow={PANEL.eyebrow}
        panelTitle={PANEL.panelTitle}
        panelPoints={PANEL.panelPoints}
        title={['Reset link expired', '重設連結已過期']}
        subtitle={[
          'This link is invalid or has expired. Request a new one to continue.',
          '此連結無效或已過期。請重新索取連結。',
        ]}
      >
        <Link href="/forgot-password" className="btn btn-primary w-full">
          {t('Request a new link', '重新索取連結')}
        </Link>
      </AuthShell>
    );
  }

  if (status === 'done') {
    return (
      <AuthShell
        eyebrow={PANEL.eyebrow}
        panelTitle={PANEL.panelTitle}
        panelPoints={PANEL.panelPoints}
        title={['Password updated', '密碼已更新']}
        subtitle={[
          'You can now sign in with your new password.',
          '您現在可以使用新密碼登入。',
        ]}
      >
        <div className="card flex items-start gap-4 p-5" style={{ background: 'var(--paper-2)' }}>
          <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--pine)' }} />
          <p className="text-[14px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            {t(
              'Your recovery session has been closed for safety.',
              '為安全起見，您的一次性復原工作階段已關閉。'
            )}
          </p>
        </div>
        <Link href="/login" className="btn btn-primary mt-6 w-full">
          {t('Go to sign in', '前往登入')}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow={PANEL.eyebrow}
      panelTitle={PANEL.panelTitle}
      panelPoints={PANEL.panelPoints}
      title={['Choose a new password', '設定新密碼']}
      subtitle={['Use at least 6 characters.', '至少需要 6 個字符。']}
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
          <label htmlFor="password" className="field-label">
            {t('New password', '新密碼')}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="field-input"
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="field-label">
            {t('Confirm new password', '確認新密碼')}
          </label>
          <input
            id="confirm-password"
            name="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="field-input"
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? t('Updating…', '更新中…') : t('Update password', '更新密碼')}
        </button>
      </form>
    </AuthShell>
  );
}
