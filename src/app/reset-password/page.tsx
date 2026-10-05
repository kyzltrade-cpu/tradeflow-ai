'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/auth';
import { useLang } from '@/lib/lang';

type Status = 'checking' | 'ready' | 'invalid' | 'done';

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

  const shell = (children: React.ReactNode) => (
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
        <div className="auth-card px-7 py-8 sm:px-8">{children}</div>
      </div>
    </div>
  );

  if (status === 'checking') {
    return shell(
      <div className="text-center py-6" role="status" aria-live="polite">
        <div
          className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'var(--accent-light)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" opacity="0.25" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </div>
        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
          {t('Verifying your reset link...', '正在驗證重設連結...')}
        </p>
      </div>
    );
  }

  if (status === 'invalid') {
    return shell(
      <div className="text-center">
        <div
          className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'var(--accent-light)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <h1 className="text-[20px] font-semibold mb-2">{t('Reset link expired', '重設連結已過期')}</h1>
        <p className="text-[13px] mb-6" style={{ color: 'var(--text-muted)' }}>
          {t(
            'This link is invalid or has expired. Request a new one to continue.',
            '此連結無效或已過期。請重新索取連結。'
          )}
        </p>
        <Link
          href="/forgot-password"
          className="inline-block text-[14px] font-medium px-6 py-2.5 rounded-lg text-white transition-all hover:-translate-y-px active:translate-y-0"
          style={{ background: 'var(--accent)', boxShadow: 'inset 0 -2px 0 0 rgba(0,0,0,0.18)' }}
        >
          {t('Request a new link', '重新索取連結')}
        </Link>
      </div>
    );
  }

  if (status === 'done') {
    return shell(
      <div className="text-center">
        <div
          className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'var(--accent-light)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h1 className="text-[20px] font-semibold mb-2">{t('Password updated', '密碼已更新')}</h1>
        <p className="text-[13px] mb-6" style={{ color: 'var(--text-muted)' }}>
          {t('You can now sign in with your new password.', '您現在可以使用新密碼登入。')}
        </p>
        <Link
          href="/login"
          className="inline-block text-[14px] font-medium px-6 py-2.5 rounded-lg text-white transition-all hover:-translate-y-px active:translate-y-0"
          style={{ background: 'var(--accent)', boxShadow: 'inset 0 -2px 0 0 rgba(0,0,0,0.18)' }}
        >
          {t('Go to sign in', '前往登入')}
        </Link>
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
              {t('Choose a new password', '設定新密碼')}
            </h1>
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {t('Use at least 6 characters', '至少需要 6 個字符')}
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
              <label htmlFor="password" className="block text-[13px] font-medium mb-1.5">{t('New password', '新密碼')}</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="auth-input w-full border rounded-lg px-3 py-2.5 text-[14px]"
                style={{ borderColor: 'var(--border)' }}
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-[13px] font-medium mb-1.5">
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
              {loading ? t('Updating...', '更新中...') : t('Update password', '更新密碼')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
