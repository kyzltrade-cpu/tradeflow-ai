'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#pricing', label: 'Pricing' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const island = scrolled
    ? {
        margin: '12px auto 0',
        maxWidth: 'min(680px, calc(100vw - 2rem))',
        height: '48px',
        borderRadius: '9999px',
        background: 'rgba(255,255,255,0.85)',
        border: '1px solid rgba(17,17,17,0.06)',
        boxShadow: '0 12px 40px -12px rgba(17,17,17,0.18)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }
    : {
        margin: '0',
        maxWidth: '100%',
        height: '64px',
        borderRadius: '0',
        background: 'rgba(250,249,246,0.85)',
        border: 'none',
        borderBottom: '1px solid #E8E5E1',
        boxShadow: 'none',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      };

  return (
    <nav aria-label="Main" className="fixed top-0 inset-x-0 z-50">
      <div className="transition-all duration-500 ease-out overflow-hidden" style={island}>
        <div className="mx-auto max-w-7xl px-4 md:px-6 h-full grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <Link href="/" className="justify-self-start text-base font-semibold tracking-tight whitespace-nowrap" style={{ color: '#111' }}>
            Backtide
          </Link>

          <div className="hidden md:flex items-center justify-center gap-8 text-sm font-medium" style={{ color: '#626260' }}>
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="hover:text-black transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A6E5C]/40"
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="justify-self-end flex items-center gap-2 md:gap-3">
            <Link
              href="/login"
              className="text-sm font-medium px-3 md:px-4 py-2 rounded-lg transition-colors rounded-full hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A6E5C]/40"
              style={{ color: '#626260' }}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold px-3.5 md:px-5 py-2 rounded-full text-white transition-all active:translate-y-px active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A6E5C]/40"
              style={{ background: '#0A6E5C', boxShadow: 'inset 0 -2px 0 0 #085a4a' }}
            >
              Start Free
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}