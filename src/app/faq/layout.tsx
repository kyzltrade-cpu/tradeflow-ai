import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/site-metadata';

// The page itself is a client component, so its metadata lives in this server
// layout. Without it the route inherits the root title and reports the homepage
// as its canonical URL.
export const metadata: Metadata = pageMetadata({
  title: 'FAQ — Sailwise',
  description: 'Does it work with the mailbox I already use? Who controls what actually gets sent? Everything traders ask before starting.',
  path: '/faq',
  index: true,
});

export default function FaqLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}
