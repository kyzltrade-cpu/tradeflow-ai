'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CircleCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang';
import AuthShell, { AUTH_PANEL } from '@/components/site/AuthShell';

export default function SignupPage() {
  const { t } = useLang();
  const { signUp, signInWithGoogle, signInWithMicrosoft } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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

    const result = await signUp(email, password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <AuthShell
        eyebrow={AUTH_PANEL.eyebrow}
        panelTitle={AUTH_PANEL.panelTitle}
        panelPoints={AUTH_PANEL.panelPoints}
        title={['Check your email', '請檢查您的電郵']}
        subtitle={[
          'We sent you a confirmation link. Click it to activate your account.',
          '我們已向您發送確認連結。點擊以啟動您的帳戶。',
        ]}
      >
        <div className="card flex items-start gap-4 p-5" style={{ background: 'var(--paper-2)' }}>
          <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--pine)' }} />
          <p className="text-[14px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            {t(
              `Confirmation sent to ${email}. The link expires in 24 hours.`,
              `確認信已寄至 ${email}。連結將於 24 小時後失效。`
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
      eyebrow={AUTH_PANEL.eyebrow}
      panelTitle={AUTH_PANEL.panelTitle}
      panelPoints={AUTH_PANEL.panelPoints}
      title={['Create account', '建立帳戶']}
      subtitle={[
        '14-day free trial. Takes about a minute.',
        '14 天免費試用。約一分鐘即可完成。',
      ]}
      footer={
        <>
          {t('Already have an account?', '已有帳戶？')}{' '}
          <Link href="/login" className="link-quiet">
            {t('Sign in', '登入')}
          </Link>
        </>
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
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="field-input"
          />
        </div>

        <div>
          <label htmlFor="password" className="field-label">
            {t('Password', '密碼')}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="field-input"
          />
          <p className="field-hint mt-1.5">{t('At least 6 characters.', '至少 6 個字符。')}</p>
        </div>

        <div>
          <label htmlFor="confirm" className="field-label">
            {t('Confirm password', '確認密碼')}
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="field-input"
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? t('Creating account…', '建立中…') : t('Create account', '建立帳戶')}
        </button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" style={{ borderColor: 'var(--hairline)' }} />
          </div>
          <div className="relative flex justify-center text-[12px]">
            <span className="px-3" style={{ background: 'var(--paper)', color: 'var(--ink-3)' }}>
              {t('or continue with', '或使用')}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={async () => {
              const result = await signInWithGoogle();
              if (result.error) setError(result.error);
            }}
            className="oauth-btn"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>
          <button
            type="button"
            onClick={async () => {
              const result = await signInWithMicrosoft();
              if (result.error) setError(result.error);
            }}
            className="oauth-btn"
          >
            <svg width="17" height="17" viewBox="0 0 23 23" aria-hidden="true">
              <path fill="#F35325" d="M1 1h10v10H1z"/>
              <path fill="#81BC06" d="M12 1h10v10H12z"/>
              <path fill="#05A6F0" d="M1 12h10v10H1z"/>
              <path fill="#FFBA08" d="M12 12h10v10H12z"/>
            </svg>
            Microsoft
          </button>
        </div>
      </div>
    </AuthShell>
  );
}
