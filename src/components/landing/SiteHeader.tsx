'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const LINKS = [
  { href: '#product', label: 'Product' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#faq', label: 'FAQ' },
];

export default function SiteHeader() {
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
        className="mx-auto flex max-w-7xl items-center justify-between px-5 transition-all duration-300 sm:px-6 3xl:max-w-[90rem]"
        style={{ height: scrolled ? 66 : 80 }}
      >
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <img
            src="/brand/sailwise-mark.png"
            alt=""
            aria-hidden="true"
            className="h-[26px] w-[26px] object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <span className="display text-[1.3rem]">Sailwise</span>
        </Link>

        <div className="hidden flex-1 items-center justify-center gap-9 px-6 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={(e) => scrollTo(e, l.href)}
              className={`btk-nav-link text-[14px] whitespace-nowrap ${active === l.href ? 'is-active' : ''}`}
              style={{ color: active === l.href ? 'var(--ink)' : 'var(--ink-2)' }}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-[14px] transition-colors hover:text-[var(--ink)]"
            style={{ color: 'var(--ink-2)' }}
          >
            Log in
          </Link>
          <Link href="/signup" className="btn-primary px-4 py-2 text-[14px]">
            Start free
          </Link>
        </div>
      </div>
    </nav>
  );
}
