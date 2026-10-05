'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/auth';
import { useLang } from '@/lib/lang';

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
      <div className="auth-bg min-h-screen flex items-center justify-center px-5 py-10 sm:px-6">
        <div className="auth-card w-full max-w-[420px] px-7 py-8 sm:px-8 text-center">
          <div
            className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'var(--accent-light)' }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h1 className="text-[20px] font-semibold mb-2">{t('Check your email', '請檢查您的電郵')}</h1>
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            {t(
              'If an account exists for that address, we have sent a link to reset your password.',
              '如果該電郵地址存在帳戶，我們已發送重設密碼連結。'
            )}
          </p>
          <Link
            href="/login"
            className="inline-block text-[14px] font-medium px-6 py-2.5 rounded-lg text-white transition-all hover:-translate-y-px active:translate-y-0"
            style={{ background: 'var(--accent)', boxShadow: 'inset 0 -2px 0 0 rgba(0,0,0,0.18)' }}
          >
            {t('Back to sign in', '返回登入')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center px-5 py-10 sm:px-6">
      <div className="w-full max-w-[420px]">
        <div className="mb-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-[13px] transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {t('Back to sign in', '返回登入')}
          </Link>
        </div>

        <div className="auth-card px-7 py-8 sm:px-8">
          <div className="text-center">
            <Link href="/" className="inline-flex items-center gap-1.5 group">
              <Image
                src="/brand/sailwise-logo.png"
                alt=""
                aria-hidden="true"
                width={552}
                height={452}
                className="h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
              <span className="text-[24px] font-semibold tracking-[-0.3px]" style={{ color: 'var(--accent)' }}>
                Sailwise
              </span>
            </Link>
            <h1 className="text-[22px] font-semibold tracking-[-0.4px] mb-1.5 mt-5">
              {t('Reset password', '重設密碼')}
            </h1>
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {t('Enter your email and we will send you a reset link', '輸入您的電郵，我們會發送重設連結')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-7">
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
                className="auth-input w-full border rounded-lg px-3 py-2.5 text-[14px]"
                style={{ borderColor: 'var(--border)' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-[14px] font-medium py-2.5 rounded-lg text-white disabled:opacity-50 transition-all hover:-translate-y-px active:translate-y-0 active:scale-[0.99]"
              style={{ background: 'var(--accent)', boxShadow: 'inset 0 -2px 0 0 rgba(0,0,0,0.18)' }}
            >
              {loading ? t('Sending...', '發送中...') : t('Send reset link', '發送重設連結')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
