// Client component so the message can follow the language toggle like the rest of
// the public pages. A 404 that only spoke English would read as a broken build on
// a zh-Hant visit.
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLang, LangToggle } from '@/lib/lang';

export default function NotFound() {
  const { t } = useLang();

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
            {t('This page does not exist', '此頁面不存在')}
          </h1>
          <p
            className="mb-7 text-[15px] leading-relaxed"
            style={{ color: 'var(--text-muted)' }}
          >
            {t(
              'The link may be out of date, or the page may have moved.',
              '連結可能已過期，或頁面已移動。',
            )}
          </p>

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Link
              href="/"
              className="inline-flex flex-1 items-center justify-center rounded-[8px] px-4 py-2.5 text-[15px] font-medium transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent)', color: '#FFFFFF' }}
            >
              {t('Go to homepage', '前往首頁')}
            </Link>
            <Link
              href="/pricing"
              className="inline-flex flex-1 items-center justify-center rounded-[8px] border px-4 py-2.5 text-[15px] font-medium transition-opacity hover:opacity-70"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              {t('See pricing', '查看定價')}
            </Link>
          </div>
        </div>

        <div className="mt-5 flex justify-center">
          <LangToggle />
        </div>
      </div>
    </div>
  );
}
