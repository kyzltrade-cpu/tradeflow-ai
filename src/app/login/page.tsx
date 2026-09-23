'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { supabaseBrowser } from '@/lib/auth';
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
            const res = await fetch(`/api/admin/company?user_id=${userId}`);
            const data = await res.json();
            if (data.id) {
              router.push('/admin');
            } else {
              router.push('/onboarding');
            }
          } catch {
            router.push('/onboarding');
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
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-[400px]">
        {/* Back to home */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px]"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {t('Back to home', '返回首頁')}
          </Link>
        </div>

        <div className="text-center mb-8">
          <Link href="/" className="text-[20px] font-semibold tracking-[-0.3px]" style={{ color: 'var(--accent)' }}>
            Backtide
          </Link>
          <h1 className="text-[24px] font-semibold tracking-[-0.5px] mb-2 mt-4">{t('Sign in', '登入')}</h1>
          <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
            {t('Access your dashboard', '存取您的控制台')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-[13px] px-4 py-3 rounded-[4px]" style={{ background: '#FEE8EA', color: 'var(--error)' }}>
              {error}
            </div>
          )}

          <div>
            <label className="block text-[13px] font-medium mb-1.5">{t('Email', '電郵')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded-[4px] px-3 py-2.5 text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium mb-1.5">{t('Password', '密碼')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border rounded-[4px] px-3 py-2.5 text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full text-[14px] font-medium py-3 rounded-[4px] text-white disabled:opacity-50"
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
              <span className="px-3" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
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
              className="flex items-center justify-center gap-2 border rounded-[4px] py-2.5 text-[13px] font-medium hover:opacity-80 transition"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
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
              className="flex items-center justify-center gap-2 border rounded-[4px] py-2.5 text-[13px] font-medium hover:opacity-80 transition"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              <svg width="18" height="18" viewBox="0 0 23 23">
                <path fill="#F35325" d="M1 1h10v10H1z"/>
                <path fill="#81BC06" d="M12 1h10v10H12z"/>
                <path fill="#05A6F0" d="M1 12h10v10H1z"/>
                <path fill="#FFBA08" d="M12 12h10v10H12z"/>
              </svg>
              Microsoft
            </button>
          </div>
        </div>

        <p className="text-[13px] text-center mt-6" style={{ color: 'var(--text-muted)' }}>
          {t("Don't have an account?", '沒有帳戶？')}{' '}
          <Link href="/signup" className="font-medium" style={{ color: 'var(--accent)' }}>
            {t('Sign up', '註冊')}
          </Link>
        </p>
      </div>
    </div>
  );
}
