'use client';

import { ArrowRight } from 'lucide-react';
import { openBooking } from './booking-bus';
import { useLang } from '@/lib/lang';

export const PILOT_WHATSAPP_HREF = 'https://wa.me/85260737771';

/* Every "Book a pilot call" on the page routes through here so they all open
   the same booking card. Keeping the button dumb means the modal owns the form
   state and the copy of each CTA stays exactly where it was authored. */
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
    <button
      type="button"
      onClick={openBooking}
      className={`group cursor-pointer ${className}`}
    >
      {label ? t(label[0], label[1]) : t('Book a pilot call', '預約試用通話')}
      {arrow && (
        <ArrowRight className={`${arrowClass} transition-transform group-hover:translate-x-0.5`} />
      )}
    </button>
  );
}
export { PilotCTA };
