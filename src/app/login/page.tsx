'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { supabaseBrowser } from '@/lib/auth';
import { authFetch } from '@/lib/auth-fetch';
import { useLang } from '@/lib/lang';

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
    <div className="auth-bg min-h-screen lg:flex">
      <main className="flex w-full flex-col px-6 py-10 sm:px-10 lg:w-[56%] lg:justify-center lg:px-16 lg:py-16">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="auth-rise mb-10 flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-2">
              <Image
                src="/brand/sailwise-mark.png"
                alt=""
                aria-hidden="true"
                width={360}
                height={378}
                className="h-6 w-auto object-contain"
              />
              <span className="text-[15px] font-semibold tracking-[-0.2px]" style={{ color: 'var(--accent)' }}>
                Sailwise
              </span>
            </Link>
            <Link
              href="/"
              className="auth-press -mr-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13.5px] font-medium transition-colors hover:bg-[#EFE9DE]"
              style={{ color: 'var(--text)' }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              {t('Back to site', '返回網站')}
            </Link>
          </div>

          <h1
            className="auth-rise text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] sm:text-[32px]"
            style={{ animationDelay: '70ms' }}
          >
            {t('Welcome back', '歡迎回來')}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {t('Sign in to pick up where your last inquiry left off.', '登入以繼續處理上一封詢盤。')}
          </p>

          <form
          onSubmit={handleSubmit}
          className="auth-rise mt-8 space-y-4"
          style={{ animationDelay: '140ms' }}
        >
            {error && (
              <div
                role="alert"
                className="text-[13px] px-3.5 py-2.5 rounded-lg"
                style={{ background: '#FEE8EA', color: 'var(--error)' }}
              >
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-[13px] font-medium mb-1.5">{t('Email', '電郵')}</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input w-full border rounded-lg px-3 h-11 text-[14px]"
                style={{ borderColor: 'var(--border)' }}
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label htmlFor="password" className="block text-[13px] font-medium">{t('Password', '密碼')}</label>
                <Link
                  href="/forgot-password"
                  className="text-[12.5px] font-medium hover:underline"
                  style={{ color: 'var(--accent)' }}
                >
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
                className="auth-input w-full border rounded-lg px-3 h-11 text-[14px]"
                style={{ borderColor: 'var(--border)' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="auth-press w-full text-[14px] font-medium h-11 rounded-lg text-white disabled:opacity-60 transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              {loading ? t('Signing in...', '登入中...') : t('Sign in', '登入')}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" style={{ borderColor: 'var(--border)' }} />
              </div>
              <div className="relative flex justify-center text-[12px]">
                <span className="px-3" style={{ background: 'var(--paper)', color: 'var(--text-muted)' }}>
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
                className="auth-press flex h-11 items-center justify-center gap-2 border rounded-lg text-[13px] font-medium transition-colors hover:bg-[#F7F5F1]"
                style={{ borderColor: 'var(--border)', color: 'var(--text)', background: '#FFFFFF' }}
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
                className="auth-press flex h-11 items-center justify-center gap-2 border rounded-lg text-[13px] font-medium transition-colors hover:bg-[#F7F5F1]"
                style={{ borderColor: 'var(--border)', color: 'var(--text)', background: '#FFFFFF' }}
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

          <p className="text-[13px] mt-8" style={{ color: 'var(--text-muted)' }}>
            {t("Don't have an account?", '沒有帳戶？')}{' '}
            <Link href="/signup" className="font-medium hover:underline" style={{ color: 'var(--accent)' }}>
              {t('Sign up', '註冊')}
            </Link>
          </p>
        </div>
      </main>

      <aside className="auth-split-panel hidden lg:flex lg:w-[44%] flex-col justify-center px-14 xl:px-20">
        <div className="max-w-[380px]">
          <div className="auth-rise" style={{ animationDelay: '90ms' }}>
          <p
            className="font-mono text-[10px] uppercase tracking-[0.18em]"
            style={{ color: 'rgba(250, 247, 242, 0.5)' }}
          >
            {t('Why Sailwise', '為什麼選擇 Sailwise')}
          </p>
          <p className="mt-5 text-[26px] font-medium leading-[1.25] tracking-[-0.015em] xl:text-[29px]" style={{ color: '#FAF7F2' }}>
            {t('One email in. Every spec out.', '一封郵件進來，完整規格出去。')}
          </p>
          <ul className="mt-8 space-y-4">
            {[
              ['Specifications pulled from the email and every attachment.', '從郵件與所有附件中擷取規格。'],
              ['Notifies you when something important arrives and tracks your follow-ups.', '重要訊息抵達時立即通知，並自動追蹤待辦後續。'],
              ['Replies drafted in your voice, ready to review.', '以您的語氣草擬回覆，隨時可審閱。'],
            ].map(([en, zh]) => (
              <li key={en} className="flex gap-3 text-[14px] leading-relaxed" style={{ color: 'rgba(250, 247, 242, 0.72)' }}>
                <span
                  className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: '#C96A44' }}
                />
                <span>{t(en, zh)}</span>
              </li>
            ))}
          </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}
