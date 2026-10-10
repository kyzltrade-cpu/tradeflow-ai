import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/site-metadata';

// The page itself is a client component, so its metadata lives in this server
// layout. Without it the route inherits the root title and reports the homepage
// as its canonical URL.
export const metadata: Metadata = pageMetadata({
  title: 'Founders — Sailwise',
  description:
    'Why Sailwise exists: one founder grew up in the trade, the other interviewed fifty sourcing owners, and nobody with real AI capability was building for them.',
  path: '/founders',
  index: true,
});

export default function FoundersLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}
