import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/site-metadata';

// The page itself is a client component, so its metadata lives in this server
// layout. Without it the route inherits the root title and reports the homepage
// as its canonical URL.
export const metadata: Metadata = pageMetadata({
  title: 'Set up Sailwise',
  description: 'Connect your catalogue and mailbox, and start answering inquiries the same day.',
  path: '/onboarding',
  index: false,
});

export default function OnboardingLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}
