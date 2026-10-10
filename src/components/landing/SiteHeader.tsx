'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useLang, LangToggle } from '@/lib/lang';
import PilotCTA from '@/components/landing/PilotCTA';

/* The site is a set of routes, not one long page, so these are real links. */
const LINKS = [
  { href: '/product', label: ['Product', '產品'] },
  { href: '/trust', label: ['Trust', '信任'] },
  { href: '/pricing', label: ['Pricing', '價格'] },
  { href: '/faq', label: ['FAQ', '常見問題'] },
  { href: '/founders', label: ['Founders', '創辦人'] },
];

export default function SiteHeader() {
  const { t } = useLang();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
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
    const mq = window.matchMedia('(min-width: 1280px)');
    const onWide = () => setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    mq.addEventListener('change', onWide);
    return () => {
      document.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onWide);
    };
  }, [menuOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the panel whenever the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Light type only while the dark hero is behind the bar. A subpage has no
  // dark hero, so it is solid from the first pixel.
  /* Every page that mounts this header opens on a dark band, so the bar always
     starts transparent and settles into cream once the page scrolls. */
  const solid = scrolled;
  const onDark = !scrolled;
  const fg = onDark ? 'var(--on-dark)' : 'var(--ink)';
  const fgMuted = onDark ? 'rgba(247,244,237,0.72)' : 'var(--ink-2)';

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 transition-colors duration-300"
      style={{
        background: solid ? 'rgba(247,244,237,0.92)' : 'transparent',
        backdropFilter: solid ? 'saturate(180%) blur(12px)' : 'none',
        borderBottom: `1px solid ${solid ? 'var(--hairline)' : 'transparent'}`,
      }}
    >
      <div className="shell flex items-center justify-between xl:grid xl:grid-cols-[1fr_auto_1fr]" style={{ height: 68 }}>
        <Link href="/" className="group flex shrink-0 items-center gap-2.5 justify-self-start">
          <img
            src="/brand/sailwise-mark.png"
            alt=""
            aria-hidden="true"
            className="h-[26px] w-auto object-contain"
            style={onDark ? { filter: 'brightness(0) invert(1)' } : undefined}
          />
          <span className="display text-[1.2rem]" style={{ color: fg }}>
            Sailwise
          </span>
        </Link>

        {/* Four route links plus the language toggle fit from `xl`; below that
            the bar keeps the mark, the CTA and the menu, which carries the same
            links. */}
        <div className="hidden items-center justify-center gap-8 xl:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? 'page' : undefined}
              className="nav-link whitespace-nowrap"
              style={{ color: isActive(l.href) ? fg : fgMuted }}
            >
              {t(l.label[0], l.label[1])}
            </Link>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 justify-self-end sm:gap-3">
          {/* LangToggle reads --ink / --ink-2 directly, so the wrapper re-points
              them while the dark hero is behind the bar. */}
          <div
            className="hidden xl:block"
            style={
              onDark
                ? ({
                    '--ink': 'var(--on-dark)',
                    '--ink-2': 'rgba(247,244,237,0.72)',
                  } as React.CSSProperties)
                : undefined
            }
          >
            <LangToggle variant="quiet" />
          </div>
          <Link
            href="/login"
            className="hidden px-2 text-[14px] transition-colors sm:block"
            style={{ color: fgMuted }}
          >
            {t('Log in', '登入')}
          </Link>
          {/* Below `sm` the bar carries the mark and the menu only — the CTA
              would otherwise leave the row with no breathing room, and the hero
              repeats the same ask in full. */}
          <span className="hidden sm:block">
            <PilotCTA
              className={`btn px-4 py-2 text-[14px] ${onDark ? 'btn-invert' : 'btn-primary'}`}
              arrow={false}
            />
          </span>
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? t('Close menu', '關閉選單') : t('Open menu', '開啟選單')}
            className="flex h-9 w-9 items-center justify-center rounded-[3px] border xl:hidden"
            style={{ borderColor: onDark ? 'rgba(247,244,237,0.3)' : 'var(--hairline-2)', color: fg }}
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile nav. */}
      {menuOpen && (
        <div
          id={menuId}
          className="overflow-hidden border-t xl:hidden"
          style={{ borderColor: 'var(--hairline)', background: 'rgba(247,244,237,0.98)' }}
        >
          <div className="shell flex flex-col py-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="border-b py-3 text-[15px] last:border-b-0"
                style={{
                  borderColor: 'var(--hairline)',
                  color: isActive(l.href) ? 'var(--ink)' : 'var(--ink-2)',
                }}
              >
                {t(l.label[0], l.label[1])}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="py-3 text-[15px] sm:hidden"
              style={{ color: 'var(--ink-2)' }}
            >
              {t('Log in', '登入')}
            </Link>
            {/* The bar drops its CTA below `sm`, so the panel carries it there. */}
            <div className="py-3 sm:hidden">
              <PilotCTA className="btn btn-primary w-full" />
            </div>
            <div
              className="flex items-center justify-between border-t py-3"
              style={{ borderColor: 'var(--hairline)' }}
            >
              <span className="text-[15px]" style={{ color: 'var(--ink-2)' }}>
                {t('Language', '語言')}
              </span>
              <span style={{ color: 'var(--ink)' }}>
                <LangToggle variant="quiet" />
              </span>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
