'use client';

import type { ReactNode } from 'react';

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Retained for call-site compatibility. No longer affects rendering. */
  delay?: number;
  /** Retained for call-site compatibility. No longer affects rendering. */
  distance?: number;
};

/**
 * Renders children VISIBLE and never hides them.
 *
 * This used to fade sections in on scroll: visible in the server HTML, hidden
 * again in a layout effect, then restored by an IntersectionObserver. The idea
 * was that hiding happens before first paint, so there is no flash.
 *
 * On a slow phone that assumption breaks. Hydration lands late, so the server
 * HTML paints first and the visitor sees content appear, then get yanked back
 * to `opacity: 0`, then fill in — whole screens of blank page. It also meant
 * that if the observer never fired (JS error, dropped update, unsupported
 * environment) the content stayed invisible permanently.
 *
 * A marketing page whose failure mode is "blank screen" is worse than one that
 * does not animate, so the animation is gone. `delay` and `distance` stay on the
 * props so the existing landing-page call sites keep compiling.
 */
export default function Reveal({ children, className }: RevealProps) {
  return <div className={className}>{children}</div>;
}