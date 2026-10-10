import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/site-metadata';

// The page itself is a client component, so its metadata lives in this server
// layout. Without it the route inherits the root title and reports the homepage
// as its canonical URL.
export const metadata: Metadata = pageMetadata({
  title: 'Trust & Security — Sailwise',
  description: 'Encryption, human approval, traceability and the processors we use — what Sailwise guarantees, and how to check it.',
  path: '/trust',
  index: true,
});

export default function TrustLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}
