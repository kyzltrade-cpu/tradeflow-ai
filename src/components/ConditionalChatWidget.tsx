'use client';

import { usePathname } from 'next/navigation';
import { ChatWidget } from './ChatWidget';

export function ConditionalChatWidget() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin') || pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/onboarding');

  if (isAdmin) return null;
  return <ChatWidget />;
}
