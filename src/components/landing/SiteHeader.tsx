'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#see-it-in-action', label: 'Live Demo' },
  { href: '#pricing', label: 'Pricing' },
];

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState<string>('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(100, (y / max) * 100) : 0);
    };
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
    setMenuOpen(false);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', href);
    setActive(href);
  };

  return (
    <>
      <div
        className="btk-scroll-progress"
        style={{
          background: `linear-gradient(90deg, #000 ${progress}%, transparent ${progress}%)`,
        }}
        aria-hidden="true"
      />
      <nav
        className="fixed top-0 w-full z-50 backdrop-blur-md border-b transition-all duration-200"
        style={{
          background: scrolled ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.85)',
          borderColor: scrolled ? '#E7E7E7' : '#EDEDED',
          boxShadow: scrolled ? '0 8px 24px -20px rgba(17,17,17,0.25)' : 'none',
        }}
      >
        <div
          className="max-w-7xl mx-auto px-5 sm:px-6 grid grid-cols-[1fr_auto_1fr] items-center transition-all duration-200"
          style={{ height: scrolled ? 64 : 76 }}
        >
          <Link href="/" className="justify-self-start flex items-center gap-2 sm:gap-3 group">
            <img src="/brand/sailwise-mark.png" alt="Sailwise" className="h-12 w-12 sm:h-14 sm:w-14 rounded object-cover transition-transform duration-200 group-hover:scale-105" />
            <span className="hidden sm:inline text-xl font-semibold tracking-tight" style={{ color: '#0A0A0A' }}>
              Sailwise
            </span>
          </Link>

          <div className="hidden md:flex items-center justify-center gap-8 text-sm font-medium">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => scrollTo(e, l.href)}
                className={`btk-nav-link ${active === l.href ? 'is-active' : ''}`}
                style={{ color: active === l.href ? '#000' : '#555555' }}
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="justify-self-end flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/signup"
              className="text-sm font-semibold px-4 py-2.5 sm:px-5 sm:py-2.5 rounded-lg btn-primary"
            >
              Start Free
            </Link>
            <button
              type="button"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg border transition-colors hover:bg-black/[0.04]"
              style={{ borderColor: '#E0E0E0' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round">
                {menuOpen ? (
                  <>
                    <path d="M6 6l12 12" />
                    <path d="M18 6L6 18" />
                  </>
                ) : (
                  <>
                    <path d="M4 7h16" />
                    <path d="M4 12h16" />
                    <path d="M4 17h16" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div
            className="md:hidden border-t px-5 py-5 space-y-1.5 backdrop-blur-md"
            style={{ borderColor: '#E7E7E7', background: scrolled ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.95)' }}
          >
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => scrollTo(e, l.href)}
                className={`block px-4 py-3 rounded-lg text-[15px] font-medium transition-colors hover:bg-black/[0.04] ${active === l.href ? 'bg-black/[0.04]' : ''}`}
                style={{ color: active === l.href ? '#000' : '#333333' }}
              >
                {l.label}
              </a>
            ))}
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-3 rounded-lg text-[15px] font-medium hover:bg-black/[0.04]"
              style={{ color: '#555555', borderTop: '1px solid #EDEDED' }}
            >
              Log in
            </Link>
          </div>
        )}
      </nav>
    </>
  );
}