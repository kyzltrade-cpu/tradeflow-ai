'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import { useLang } from '@/lib/lang';

type Bi = [en: string, zh: string];

/**
 * The panel every auth page shows. Sign-in and sign-up make the same promise to
 * the same visitor at two moments, so they read the same words — the panel is
 * the product claim, not a summary of the page it sits beside.
 */
export const AUTH_PANEL = {
  eyebrow: ['The autonomous back office', '自動化貿易後勤'] as Bi,
  panelTitle: ['One email in. Every spec out.', '一封郵件進來，完整規格出去。'] as Bi,
  panelPoints: [
    [
      'Specs pulled from the email and every attachment, each cited to its source line.',
      '規格從郵件與每個附件中擷取，每項都標明來源行。',
    ],
    [
      'Gaps filled from your own catalogue; only what is genuinely unknown gets asked.',
      '缺項由您自己的目錄補齊，只有真正查不到的才追問。',
    ],
    [
      'Every reply stays a draft until you approve it — nothing sends on its own.',
      '每則回覆在您批准前都是草稿——不會自行送出。',
    ],
  ] as Bi[],
};

/**
 * Split shell for every auth surface (sign in, sign up, password reset).
 *
 * The form leads on the left — on an auth page the task is the point, and the
 * panel is supporting evidence. The panel is hidden below `lg` rather than
 * stacked: someone signing in on a phone wants the form, not the pitch.
 *
 * The panel's product frame runs to its own edge and is cropped by the bottom,
 * so the inbox reads as something already running rather than as a diagram.
 * `band-glow` supplies the `overflow: hidden` that clips it.
 */
export default function AuthShell({
  eyebrow,
  panelTitle,
  panelPoints,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: Bi;
  panelTitle: Bi;
  panelPoints: Bi[];
  title: Bi;
  subtitle: Bi;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useLang();

  return (
    /* At `lg` the shell is exactly one viewport tall so the product can be
       cropped by the panel edge. The form column scrolls on its own if the
       viewport is short; on phones the whole page scrolls normally. */
    <div className="landing min-h-screen lg:grid lg:h-screen lg:grid-cols-[1.06fr_0.94fr]">
      {/* ── Form ─────────────────────────────────────────────────────────── */}
      <main
        className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:overflow-y-auto lg:px-16"
        style={{ background: 'var(--paper)' }}
      >
        <div className="mx-auto w-full max-w-[400px]">
          {/* On phones the product panel is gone, so the mark lives here. */}
          <div className="mb-9 flex items-center justify-between lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <img
                src="/brand/sailwise-mark.png"
                alt=""
                aria-hidden="true"
                className="h-6 w-auto object-contain"
              />
              <span className="display text-[1.15rem]">Sailwise</span>
            </Link>
          </div>

          <div className="mb-8 hidden lg:block">
            <Link href="/" className="link-quiet inline-flex items-center gap-1.5 text-[13px]">
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('Back to site', '返回網站')}
            </Link>
          </div>

          <h1 className="display text-[2rem] leading-[1.1]">{t(title[0], title[1])}</h1>
          <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            {t(subtitle[0], subtitle[1])}
          </p>

          <div className="mt-8">{children}</div>

          {footer && (
            <div className="mt-8 text-[13.5px]" style={{ color: 'var(--ink-2)' }}>
              {footer}
            </div>
          )}
        </div>
      </main>

      {/* ── Product panel ────────────────────────────────────────────────── */}
      <aside className="auth-panel band-dark band-glow flex-col justify-between px-12 py-12 xl:px-16 xl:py-14">
        <div className="flex shrink-0 items-center justify-between">
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
          <span className="eyebrow" style={{ color: 'var(--on-dark-3)' }}>
            {t('Back office', '貿易後勤')}
          </span>
        </div>

        <div className="max-w-[440px]">
          <p className="eyebrow" style={{ color: 'var(--accent)' }}>
            {t(eyebrow[0], eyebrow[1])}
          </p>
          <p className="display mt-5 text-[1.5rem] leading-[1.18]" style={{ color: 'var(--on-dark)' }}>
            {t(panelTitle[0], panelTitle[1])}
          </p>
          <ul className="mt-7 space-y-3">
            {panelPoints.map((p) => (
              <li
                key={p[0]}
                className="flex gap-3 text-[13.5px] leading-relaxed"
                style={{ color: 'var(--on-dark-2)' }}
              >
                <Check className="mt-[3px] h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} strokeWidth={2.5} />
                <span>{t(p[0], p[1])}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="shrink-0 text-[12.5px] leading-relaxed" style={{ color: 'var(--on-dark-3)' }}>
          {t(
            'Encrypted in transit and at rest · Nothing sends without you',
            '傳輸與靜態皆加密 · 未經您核准不會送出'
          )}
        </p>
      </aside>
    </div>
  );
}
