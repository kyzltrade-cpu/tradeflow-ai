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

  return (
    <>
      <div
        className="btk-scroll-progress"
        style={{
          background: `linear-gradient(90deg, #0A6E5C ${progress}%, transparent ${progress}%)`,
        }}
        aria-hidden="true"
      />
      <nav
        className="fixed top-0 w-full z-50 backdrop-blur-md border-b transition-all duration-200"
        style={{
          background: scrolled ? 'rgba(250,249,246,0.92)' : 'rgba(250,249,246,0.85)',
          borderColor: scrolled ? '#DDD8CE' : '#E8E5E1',
          boxShadow: scrolled ? '0 8px 24px -20px rgba(17,17,17,0.25)' : 'none',
        }}
      >
        <div
          className="max-w-7xl mx-auto px-6 grid grid-cols-[1fr_auto_1fr] items-center transition-all duration-200"
          style={{ height: scrolled ? 52 : 64 }}
        >
          <Link href="/" className="justify-self-start flex items-center gap-2.5 group">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white transition-transform duration-200 group-hover:scale-105"
              style={{ background: '#0A6E5C', boxShadow: 'inset 0 -2px 0 0 #085a4a' }}
            >
              BT
            </span>
            <span className="text-base font-semibold tracking-tight" style={{ color: '#111' }}>
              Backtide
            </span>
          </Link>

          <div className="hidden md:flex items-center justify-center gap-8 text-sm font-medium">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className={`btk-nav-link ${active === l.href ? 'is-active' : ''}`}
                style={{ color: active === l.href ? '#0A6E5C' : '#626260' }}
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="justify-self-end flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium px-4 py-2 rounded-lg transition-colors hover:bg-black/[0.04]"
              style={{ color: '#626260' }}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold px-5 py-2.5 rounded-lg text-white transition-all hover:-translate-y-0.5 active:translate-y-px active:scale-[0.99]"
              style={{ background: '#0A6E5C', boxShadow: 'inset 0 -2px 0 0 #085a4a' }}
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>
    </>
  );
}