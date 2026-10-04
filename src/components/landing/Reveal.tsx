'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

// useLayoutEffect warns during the server pass, so fall back there.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** How far, in px, the element travels on entry. */
  distance?: number;
};

/**
 * Fades + lifts its children the first time they scroll into view.
 *
 * Deliberately rendered VISIBLE by the server: the markup never ships as
 * `opacity: 0`, so crawlers and JS-less visitors get the whole page. On the
 * client we hide it in a layout effect (before first paint, so there is no
 * flash) and let an IntersectionObserver bring it back. Elements already on
 * screen at mount are left alone — animating in what the visitor never
 * scrolled to reads as a glitch. Reduced-motion users are skipped entirely.
 */
export default function Reveal({
  children,
  className,
  delay = 0,
  distance = 22,
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<'static' | 'hidden' | 'shown'>('static');

  useIsomorphicLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof window === 'undefined') return;
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    if (node.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    setState('hidden');

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setState('shown');
            observer.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const style: CSSProperties =
    state === 'static'
      ? {}
      : {
          opacity: state === 'shown' ? 1 : 0,
          transform: state === 'shown' ? 'none' : `translateY(${distance}px)`,
          transition: `opacity 700ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 700ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
          willChange: 'opacity, transform',
        };

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}
