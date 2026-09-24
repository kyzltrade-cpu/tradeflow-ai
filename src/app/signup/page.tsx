'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/lang';

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
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-[400px] text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <img src="/brand/sailwise-mark.png" alt="Sailwise" className="h-9 w-9 rounded-lg object-cover transition-transform duration-200 group-hover:scale-105" />
            <span className="text-[20px] font-semibold tracking-[-0.3px]" style={{ color: 'var(--accent)' }}>Sailwise</span>
          </Link>
          <div className="mt-8 p-6 border rounded-lg" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--accent-light)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h1 className="text-[20px] font-semibold mb-2">{t('Check your email', '請檢查您的電郵')}</h1>
            <p className="text-[14px] mb-6" style={{ color: 'var(--text-muted)' }}>
              {t('We sent you a confirmation link. Click it to activate your account.', '我們已向您發送確認連結。點擊以啟動您的帳戶。')}
            </p>
            <Link
              href="/login"
              className="inline-block text-[14px] font-medium px-6 py-2.5 rounded-lg text-white transition-all hover:-translate-y-px active:translate-y-0"
              style={{ background: 'var(--accent)', boxShadow: 'inset 0 -2px 0 0 rgba(0,0,0,0.18)' }}
            >
              {t('Go to sign in', '前往登入')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <img src="/brand/sailwise-mark.png" alt="Sailwise" className="h-9 w-9 rounded-lg object-cover transition-transform duration-200 group-hover:scale-105" />
            <span className="text-[20px] font-semibold tracking-[-0.3px]" style={{ color: 'var(--accent)' }}>
              Sailwise
            </span>
          </Link>
          <h1 className="text-[24px] font-semibold tracking-[-0.5px] mb-2 mt-5">{t('Create account', '建立帳戶')}</h1>
          <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
            {t('Start your free trial', '開始免費試用')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-[13px] px-4 py-3 rounded-lg" style={{ background: '#FEE8EA', color: 'var(--error)' }}>
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
              className="w-full border rounded-lg px-3 py-2.5 text-[14px] focus:outline-none"
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
              minLength={6}
              className="w-full border rounded-lg px-3 py-2.5 text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium mb-1.5">{t('Confirm password', '確認密碼')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2.5 text-[14px] focus:outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full text-[14px] font-medium py-3 rounded-lg text-white disabled:opacity-50 transition-all hover:-translate-y-px active:translate-y-0 active:scale-[0.99]"
            style={{ background: 'var(--accent)', boxShadow: 'inset 0 -2px 0 0 rgba(0,0,0,0.18)' }}
          >
            {loading ? t('Creating account...', '建立中...') : t('Create account', '建立帳戶')}
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
              className="flex items-center justify-center gap-2 border rounded-lg py-2.5 text-[13px] font-medium transition-all hover:-translate-y-px active:translate-y-0 hover:opacity-90"
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
              className="flex items-center justify-center gap-2 border rounded-lg py-2.5 text-[13px] font-medium transition-all hover:-translate-y-px active:translate-y-0 hover:opacity-90"
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
          {t('Already have an account?', '已有帳戶？')}{' '}
          <Link href="/login" className="font-medium" style={{ color: 'var(--accent)' }}>
            {t('Sign in', '登入')}
          </Link>
        </p>
      </div>
    </div>
  );
}
