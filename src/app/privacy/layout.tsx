import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/site-metadata';

// This page is a client component, so its metadata lives in this server layout.
// Without it the route inherited the root title and was indexed as
// "Sailwise — Inquiry to Quote", and shared links reported the homepage as their
// canonical URL.
export const metadata: Metadata = pageMetadata({
  title: 'Privacy Policy — Sailwise',
  description: 'What Sailwise collects, how it is used, and your rights.',
  path: '/privacy',
  index: true,
});

export default function PrivacyLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}
