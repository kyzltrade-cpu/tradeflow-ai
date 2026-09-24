'use client';

import { useEffect, useRef, useState } from 'react';

export default function MouseGlow() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(pointer: fine)').matches;
    setOk(!reduced && fine);
  }, []);

  useEffect(() => {
    if (!ok) return;
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = `translate3d(${e.clientX - 256}px, ${e.clientY - 256}px, 0)`;
      });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
    };
  }, [ok]);

  if (!ok) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 hidden md:block"
      style={{
        zIndex: 1,
        width: 512,
        height: 512,
        borderRadius: '9999px',
        opacity: 0,
        transition:
          'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'transform',
        background: 'radial-gradient(circle, rgba(0,0,0,0.05), rgba(0,0,0,0) 62%)',
      }}
    />
  );
}