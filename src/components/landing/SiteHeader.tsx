'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useLang, LangToggle } from '@/lib/lang';
import PilotCTA from '@/components/landing/PilotCTA';

/* Same funnel as every CTA on the page: one mailto to the founder, no
   self-serve signup while the pilot is manual. Declared here rather than
   imported because the header renders before the page. */

/* Follows the page's five movements rather than a feature list, so the nav
   doubles as a table of contents for the story. */
const LINKS = [
  { href: '#trust', label: ['Trust', '信任'] },
  { href: '#setup', label: ['Setup', '設定'] },
  { href: '#pricing', label: ['Pricing', '價格'] },
  { href: '#faq', label: ['FAQ', '常見問題'] },
];

export default function SiteHeader() {
  const { t } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = 'site-header-mobile-menu';
  const toggleRef = useRef<HTMLButtonElement>(null);

  // A disclosure on a phone needs the three things a mouse gives you for free:
  // Escape closes it, the trigger keeps focus, and it shuts when the viewport
  // grows past the breakpoint so the desktop bar is never covered.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMenuOpen(false);
      toggleRef.current?.focus();
    };
    const mq = window.matchMedia('(min-width: 1024px)');
    const onWide = () => setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    mq.addEventListener('change', onWide);
    return () => {
      document.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onWide);
    };
  }, [menuOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(`#${entry.target.id}`);
        }
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    for (const link of LINKS) {
      const el = document.querySelector(link.href);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const scrollTo = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const el = document.querySelector(href);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', href);
    setActive(href);
    setMenuOpen(false);
  };

  return (
    /* At the top it is a full-bleed bar. Once you scroll, it detaches into a
       floating island: inset from the viewport edges, rounded, bordered and
       lifted off the page, so it reads as an object over the content instead
       of a strip glued to it. */
    <nav
      className={`fixed z-50 backdrop-blur-md transition-all duration-300 ${
        scrolled
          ? 'inset-x-3 top-3 rounded-2xl border shadow-[0_12px_32px_-14px_rgba(27,25,23,0.30)] sm:inset-x-6 sm:top-4'
          : 'inset-x-0 top-0 border-b border-transparent'
      }`}
      style={{
        background: scrolled ? 'rgba(250,247,242,0.68)' : 'rgba(250,247,242,0.34)',
        borderColor: scrolled ? 'var(--hairline)' : 'transparent',
      }}
    >
      <div
        className="mx-auto flex max-w-7xl items-center justify-between px-5 transition-all duration-300 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] 3xl:max-w-[90rem]"
        style={{ height: scrolled ? 60 : 80 }}
      >
        <Link href="/" className="group flex shrink-0 items-center gap-2.5 justify-self-start">
          <img
            src="/brand/sailwise-logo.png"
            alt=""
            aria-hidden="true"
            className="h-[28px] w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <span className="display text-[1.3rem]">Sailwise</span>
        </Link>

        <div className="hidden items-center justify-center gap-9 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => scrollTo(e, l.href)}
              className={`btk-nav-link text-[14px] whitespace-nowrap ${active === l.href ? 'is-active' : ''}`}
              style={{ color: active === l.href ? 'var(--ink)' : 'var(--ink-2)' }}
            >
              {t(l.label[0], l.label[1])}
            </a>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 justify-self-end sm:gap-3">
          {/* Measured, and it does not fit. At 375px the bar has ~335px of
              content width: the wordmark takes ~126px, "Book a pilot call" plus
              its button padding ~140px, and the menu trigger 36px — 302px
              before the toggle's own ~58px. So below lg the toggle moves into
              the menu panel rather than being dropped, which keeps phones able
              to switch language without crowding the bar. */}
          <div className="hidden lg:block">
            <LangToggle variant="quiet" />
          </div>
          <Link
            href="/login"
            className="hidden rounded-lg px-3 py-2 text-[14px] transition-colors hover:text-[var(--ink)] sm:block"
            style={{ color: 'var(--ink-2)' }}
          >
            {t('Log in', '登入')}
          </Link>
          <PilotCTA className="btn-primary px-4 py-2 text-[14px]" arrow={false} />
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? t('Close menu', '關閉選單') : t('Open menu', '開啟選單')}
            className="flex h-9 w-9 items-center justify-center rounded-lg border lg:hidden"
            style={{ borderColor: 'var(--hairline)', color: 'var(--ink)' }}
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile nav. The four section links and Log in were previously only
          rendered inside `hidden lg:flex`, so a phone had no navigation to the
          pricing, the setup steps or the FAQ at all. */}
      {menuOpen && (
        <div
          id={menuId}
          className="overflow-hidden border-t lg:hidden"
          style={{
            borderColor: 'var(--hairline)',
            background: scrolled ? 'rgba(250,247,242,0.98)' : 'rgba(250,247,242,0.97)',
          }}
        >
          <div className="mx-auto flex max-w-7xl flex-col px-5 py-2 sm:px-6">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => scrollTo(e, l.href)}
                className="border-b py-3 text-[15px] last:border-b-0"
                style={{
                  borderColor: 'var(--hairline)',
                  color: active === l.href ? 'var(--ink)' : 'var(--ink-2)',
                }}
              >
                {t(l.label[0], l.label[1])}
              </a>
            ))}
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="py-3 text-[15px] sm:hidden"
              style={{ color: 'var(--ink-2)' }}
            >
              {t('Log in', '登入')}
            </Link>
            {/* The toggle's home below lg. The whole panel is lg:hidden, so this
                row appears exactly where the bar could not carry it. */}
            <div
              className="flex items-center justify-between border-t py-3"
              style={{ borderColor: 'var(--hairline)' }}
            >
              <span className="text-[15px]" style={{ color: 'var(--ink-2)' }}>
                {t('Language', '語言')}
              </span>
              <LangToggle variant="quiet" />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
