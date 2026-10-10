import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/site-metadata';

// The page itself is a client component, so its metadata lives in this server
// layout. Without it the route inherits the root title and reports the homepage
// as its canonical URL.
export const metadata: Metadata = pageMetadata({
  title: 'Choose a new password — Sailwise',
  description: 'Set a new password for your Sailwise account.',
  path: '/reset-password',
  index: false,
});

export default function ResetPasswordLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}
