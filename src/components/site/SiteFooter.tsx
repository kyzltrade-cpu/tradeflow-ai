'use client';

import Link from 'next/link';
import { Languages } from 'lucide-react';
import { useLang } from '@/lib/lang';

/**
 * Shared footer. On the landing route the section links are bare hashes; on any
 * other route they have to point back at the landing, so `variant` decides.
 * The oversized wordmark is the reference's closing move and is kept on
 * subpages so the brand sign-off is identical everywhere.
 */
export default function SiteFooter({ wordmark = true }: { wordmark?: boolean } = {}) {
  const { t } = useLang();

  return (
    <footer className="band-dark" style={{ borderTop: '1px solid var(--dark-hairline)' }}>
      <div className="shell pt-16 pb-10">
        <div className="grid gap-12 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <img
                src="/brand/sailwise-mark.png"
                alt=""
                aria-hidden="true"
                className="h-6 w-auto object-contain"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
              <span className="display text-[1.05rem]">Sailwise</span>
            </div>
            <p className="mt-4 max-w-[300px] text-[14px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
              {t(
                'The autonomous back office for trading companies worldwide — every inquiry answered completely, in the buyer’s language, from your own address.',
                '專為全球貿易公司而設的自動化後勤——每封詢盤都得到完整回覆，以買方語言、由您的地址寄出。'
              )}
            </p>
          </div>
          <div>
            <p className="eyebrow">{t('Product', '產品')}</p>
            <ul className="mt-5 space-y-3 text-[14px]">
              <li><Link href="/#how" className="footer-link">{t('How it works', '運作方式')}</Link></li>
              <li><Link href="/product#extraction" className="footer-link">{t('Extraction', '擷取')}</Link></li>
              <li><Link href="/product#setup" className="footer-link">{t('Setup', '設定')}</Link></li>
              <li><Link href="/trust" className="footer-link">{t('Trust & security', '信任與安全')}</Link></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow">{t('Company', '公司')}</p>
            <ul className="mt-5 space-y-3 text-[14px]">
              <li><Link href="/pricing" className="footer-link">{t('Pricing', '價格')}</Link></li>
              <li><Link href="/faq" className="footer-link">{t('FAQ', '常見問題')}</Link></li>
              <li><Link href="/founders" className="footer-link">{t('Founders', '創辦人')}</Link></li>
              <li><a href="mailto:tradeflow.hk@gmail.com" className="footer-link">{t('Contact', '聯絡')}</a></li>
            </ul>
          </div>
          <div>
            <p className="eyebrow">{t('Get started', '開始使用')}</p>
            <ul className="mt-5 space-y-3 text-[14px]">
              <li><Link href="/login" className="footer-link">{t('Log in', '登入')}</Link></li>
              <li><Link href="/signup" className="footer-link">{t('Start free', '免費試用')}</Link></li>
              <li><Link href="/privacy" className="footer-link">{t('Privacy', '私隱')}</Link></li>
            </ul>
          </div>
        </div>

        <div
          className="mt-14 flex flex-col gap-3 border-t pt-7 text-[12.5px] sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: 'var(--dark-hairline)', color: 'var(--ink-3)' }}
        >
          <span>{t('© 2026 Sailwise. All rights reserved.', '© 2026 Sailwise。版權所有。')}</span>
          <span className="inline-flex items-center gap-2">
            <Languages className="h-3.5 w-3.5" />
            {t('English, 繁體中文, 简体中文, Español', '英文、繁體中文、簡體中文、西班牙文')}
          </span>
        </div>
      </div>

      {/* `overflow-x: clip` rather than `overflow-hidden`: the wordmark is wider
          than the viewport on wide screens, but the block also has to let the
          glyphs' full height show — `hidden` clips both axes and was slicing the
          letters off at the page bottom on phones. */}
      {wordmark && (
        <div className="px-6 lg:px-10" style={{ overflowX: 'clip' }} aria-hidden="true">
          <div className="display wordmark-giant" style={{ color: 'var(--on-dark)' }}>
            Sailwise
          </div>
        </div>
      )}
    </footer>
  );
}
