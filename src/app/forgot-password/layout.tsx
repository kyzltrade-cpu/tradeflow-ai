import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/site-metadata';

// The page itself is a client component, so its metadata lives in this server
// layout. Without it the route inherits the root title and reports the homepage
// as its canonical URL.
export const metadata: Metadata = pageMetadata({
  title: 'Reset your password — Sailwise',
  description: 'Request a password reset link for your Sailwise account.',
  path: '/forgot-password',
  index: false,
});

export default function ForgotPasswordLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}
