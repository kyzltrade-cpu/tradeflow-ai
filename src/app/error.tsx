'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
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
    <div className="landing band-dark band-glow flex min-h-screen flex-col">
      <header className="shell flex items-center justify-between py-6">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <img
            src="/brand/sailwise-mark.png"
            alt=""
            aria-hidden="true"
            className="h-6 w-auto object-contain"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          <span className="display text-[1.15rem]" style={{ color: 'var(--on-dark)' }}>
            Sailwise
          </span>
        </Link>
        <div
          style={
            {
              '--ink': 'var(--on-dark)',
              '--ink-2': 'rgba(247,244,237,0.72)',
            } as React.CSSProperties
          }
        >
          <LangToggle variant="quiet" />
        </div>
      </header>

      <main className="shell flex flex-1 flex-col justify-center py-16">
        <p className="eyebrow" style={{ color: 'var(--accent)' }}>
          {t('Error', '錯誤')}
        </p>
        <h1 className="display h-hero mt-6 max-w-3xl text-balance">
          {t('Something went wrong.', '發生錯誤。')}
        </h1>
        <p className="lede mt-6 max-w-xl">
          {t(
            'This page failed to load. Trying again often fixes it.',
            '此頁面載入失敗。重試通常可以解決。'
          )}
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="button" onClick={reset} className="btn btn-primary cursor-pointer">
            {t('Try again', '重試')}
            <ArrowRight className="h-4 w-4" />
          </button>
          <Link href="/" className="btn btn-outline">
            {t('Go to homepage', '前往首頁')}
          </Link>
        </div>

        {error.digest ? (
          <p className="mt-8 text-[12.5px]" style={{ color: 'var(--on-dark-3)' }}>
            {t('Reference', '參考編號')}: <code>{error.digest}</code>
          </p>
        ) : null}
      </main>
    </div>
  );
}
