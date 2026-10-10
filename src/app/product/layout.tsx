import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/site-metadata';

// The page itself is a client component, so its metadata lives in this server
// layout. Without it the route inherits the root title and reports the homepage
// as its canonical URL.
export const metadata: Metadata = pageMetadata({
  title: 'Product — Sailwise',
  description: 'The whole pipeline, screen by screen: extraction, the work queue, quote drafting and alerts — all on one thread.',
  path: '/product',
  index: true,
});

export default function ProductLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}
