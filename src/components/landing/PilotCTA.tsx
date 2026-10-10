'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useLang } from '@/lib/lang';

export const PILOT_WHATSAPP_HREF = 'https://wa.me/85260737771';

/* Every "Book a pilot call" on the site routes through here, so there is one
   booking destination to keep working. It links to /book rather than opening a
   modal: the form asks a few real questions, and a page gives them room.

   This used to fire an event on booking-bus for a modal that was never mounted,
   which meant every one of these buttons did nothing at all. */
export default function PilotCTA({
  className = '',
  label,
  arrow = true,
  arrowClass = 'h-4 w-4',
}: {
  className?: string;
  label?: [string, string];
  arrow?: boolean;
  arrowClass?: string;
}) {
  const { t } = useLang();
  return (
    <Link href="/book" className={`group ${className}`}>
      {label ? t(label[0], label[1]) : t('Book a pilot call', '預約試用通話')}
      {arrow && (
        <ArrowRight className={`${arrowClass} transition-transform group-hover:translate-x-0.5`} />
      )}
    </Link>
  );
}
export { PilotCTA };
