import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/site-metadata';

// This page is a client component, so its metadata lives in this server layout.
// Without it the route inherited the root title and was indexed as
// "Sailwise — Inquiry to Quote", and shared links reported the homepage as their
// canonical URL.
export const metadata: Metadata = pageMetadata({
  title: 'Start your free trial — Sailwise',
  description: 'Create a Sailwise account and start your free trial.',
  path: '/signup',
  index: false,
});

export default function SignupLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}
