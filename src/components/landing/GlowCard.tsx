'use client';

import { useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';

type GlowCardProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  color?: `rgba(${string})`;
};

export default function GlowCard({ children, className, style, color = 'rgba(0, 0, 0, 0.22)' }: GlowCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [spot, setSpot] = useState({ x: 0.5, y: 0.5 });
  const [active, setActive] = useState(false);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setSpot({
      x: rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0.5,
      y: rect.height > 0 ? (e.clientY - rect.top) / rect.height : 0.5,
    });
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      className={`group relative ${className ?? ''}`}
      style={style}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: active ? 1 : 0,
          borderRadius: 'inherit',
          background: `radial-gradient(320px circle at ${spot.x * 100}% ${spot.y * 100}%, ${color}, rgba(0,0,0,0.05) 45%, transparent 70%)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}