'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLang, LangToggle } from '@/lib/lang';

const LINKS = [
  { href: '#product', label: ['Product', '產品'] },
  { href: '#extraction', label: ['Extraction', '擷取'] },
  { href: '#pricing', label: ['Pricing', '價格'] },
  { href: '#faq', label: ['FAQ', '常見問題'] },
];

export default function SiteHeader() {
  const { t } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>('');

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
  };

  return (
    <nav
      className="fixed top-0 z-50 w-full border-b backdrop-blur-md transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(250,247,242,0.88)' : 'rgba(250,247,242,0.55)',
        borderColor: scrolled ? 'var(--hairline)' : 'transparent',
      }}
    >
      <div
        className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-5 transition-all duration-300 sm:px-6 3xl:max-w-[90rem]"
        style={{ height: scrolled ? 66 : 80 }}
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

        <div className="flex shrink-0 items-center gap-1 justify-self-end sm:gap-3">
          <div className="hidden sm:block">
            <LangToggle />
          </div>
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-[14px] transition-colors hover:text-[var(--ink)]"
            style={{ color: 'var(--ink-2)' }}
          >
            {t('Log in', '登入')}
          </Link>
          <Link href="/signup" className="btn-primary px-4 py-2 text-[14px]">
            {t('Start free', '免費試用')}
          </Link>
        </div>
      </div>
    </nav>
  );
}
