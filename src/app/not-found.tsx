// Client component so the message can follow the language toggle like the rest of
// the public pages. A 404 that only spoke English would read as a broken build on
// a zh-Hant visit.
'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLang, LangToggle } from '@/lib/lang';

export default function NotFound() {
  const { t } = useLang();

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
        {/* LangToggle reads --ink / --ink-2, so the wrapper re-points them. */}
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
          404
        </p>
        <h1 className="display h-hero mt-6 max-w-3xl text-balance">
          {t('This page does not exist.', '此頁面不存在。')}
        </h1>
        <p className="lede mt-6 max-w-xl">
          {t(
            'The link may be out of date, or the page may have moved.',
            '連結可能已過期，或頁面已移動。'
          )}
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/" className="btn btn-primary">
            {t('Go to homepage', '前往首頁')}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/pricing" className="btn btn-outline">
            {t('See pricing', '查看定價')}
          </Link>
        </div>
      </main>
    </div>
  );
}
