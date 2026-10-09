/* Landing CTAs are spread across six places in a server component tree, so
   they cannot share React state without threading props through every section.
   A DOM event keeps them decoupled: any CTA dispatches, the single mounted
   BookingModal listens. Small, and it means adding a CTA later needs no wiring. */

export const BOOKING_OPEN = 'sailwise:booking-open';

export function openBooking(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(BOOKING_OPEN));
}

export function onBookingOpen(fn: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => fn();
  window.addEventListener(BOOKING_OPEN, handler);
  return () => window.removeEventListener(BOOKING_OPEN, handler);
}