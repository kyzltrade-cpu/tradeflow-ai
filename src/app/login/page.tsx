'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { supabaseBrowser } from '@/lib/auth';
import { authFetch } from '@/lib/auth-fetch';
import { useLang } from '@/lib/lang';
import AuthShell, { AUTH_PANEL } from '@/components/site/AuthShell';

export default function LoginPage() {
  const { t } = useLang();
  const { signIn, signInWithGoogle, signInWithMicrosoft } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn(email, password);
      if (result.error) {
        setError(result.error);
      } else {
        // Check if user has a company — new users go to onboarding
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        const userId = session?.user?.id;
        if (userId) {
          try {
            // authFetch attaches the bearer token and retries once after a token
            // refresh. A bare fetch() 401s here, which used to read as "this user
            // has no company" and bounced every existing customer to onboarding.
            const res = await authFetch(`/api/admin/company?user_id=${userId}`);

            // 404 means genuinely no company yet. Anything else (401/5xx) is a
            // failed lookup, so let the admin shell resolve it instead of
            // sending a signed-in customer through onboarding.
            if (res.status === 404) {
              router.push('/onboarding');
              return;
            }
            if (!res.ok) {
              router.push('/admin');
              return;
            }

            const data = await res.json();
            if (data?.id) {
              router.push('/admin');
            } else {
              router.push('/onboarding');
            }
          } catch {
            router.push('/admin');
          }
        } else {
          router.push('/admin');
        }
      }
    } catch {
      setError(t('Something went wrong. Please try again.', '出了問題，請重試。'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow={AUTH_PANEL.eyebrow}
      panelTitle={AUTH_PANEL.panelTitle}
      panelPoints={AUTH_PANEL.panelPoints}
      title={['Welcome back', '歡迎回來']}
      subtitle={[
        'Sign in to pick up where your last inquiry left off.',
        '登入以繼續處理上一封詢盤。',
      ]}
      footer={
        <>
          {t('Don’t have an account?', '沒有帳戶？')}{' '}
          <Link href="/signup" className="link-quiet">
            {t('Start free trial', '開始免費試用')}
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
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="field-input"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label htmlFor="password" className="field-label mb-0">
              {t('Password', '密碼')}
            </label>
            <Link href="/forgot-password" className="link-quiet text-[12.5px]">
              {t('Forgot password?', '忘記密碼？')}
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="field-input"
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? t('Signing in…', '登入中…') : t('Sign in', '登入')}
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
