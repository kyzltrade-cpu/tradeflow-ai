'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLang, LangToggle } from '@/lib/lang';

// Catches render and data errors in any route below the root layout. The default
// Next error page ships as an unstyled overlay with a stack trace in dev, which
// reads as "the app is broken" rather than "something failed" — and it offers no
// way out on a server error.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLang();

  useEffect(() => {
    // Surface the digest in the console so a support report can be traced to the
    // server log entry. No error message: it can carry tenant data.
    console.error('Unhandled route error', error.digest ?? '(no digest)');
  }, [error]);

  return (
    <div className="auth-bg min-h-screen flex flex-col items-center justify-center px-5 py-10 sm:px-6">
      <div className="w-full max-w-[420px]">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M10 3.5 5.5 8l4.5 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t('Back to home', '返回首頁')}
          </Link>
        </div>

        <div
          className="rounded-[12px] border p-7 sm:p-8"
          style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
        >
          <Image
            src="/brand/sailwise-logo.png"
            alt="Sailwise"
            width={132}
            height={108}
            priority
            className="mb-5 h-auto w-auto"
          />

          <h1 className="mb-2 text-[26px] font-semibold tracking-[-0.5px]">
            {t('Something went wrong', '發生錯誤')}
          </h1>
          <p className="mb-7 text-[15px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {t(
              'This page failed to load. Trying again often fixes it.',
              '此頁面載入失敗。重試通常可以解決。',
            )}
          </p>

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-[8px] px-4 py-2.5 text-[15px] font-medium transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)', color: '#FFFFFF' }}
            >
              {t('Try again', '重試')}
            </button>
            <Link
              href="/"
              className="inline-flex flex-1 items-center justify-center rounded-[8px] border px-4 py-2.5 text-[15px] font-medium transition-opacity hover:opacity-70"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              {t('Go to homepage', '前往首頁')}
            </Link>
          </div>

          {error.digest ? (
            <p className="mt-5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {t('Reference', '參考編號')}: <code>{error.digest}</code>
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex justify-center">
          <LangToggle />
        </div>
      </div>
    </div>
  );
}
