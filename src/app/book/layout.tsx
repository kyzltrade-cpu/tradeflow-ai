import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/site-metadata';

// The page itself is a client component, so its metadata lives in this server
// layout. Without it the route inherits the root title and reports the homepage
// as its canonical URL.
export const metadata: Metadata = pageMetadata({
  title: 'Book a pilot call — Sailwise',
  description:
    'Thirty minutes on your inquiries. Pick a time and tell us what is costing you the most time — we will show how Sailwise handles it on your own threads.',
  path: '/book',
  index: true,
});

export default function BookLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}
