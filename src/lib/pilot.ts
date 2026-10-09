/* Single source of truth for the pilot contact points. Previously duplicated
   in page.tsx and SiteHeader.tsx, where they could drift apart silently. */

export const PILOT_EMAIL = 'tradeflow.hk@gmail.com';

export const PILOT_HREF =
  'mailto:' + PILOT_EMAIL + '?subject=Demo%20request';

export const PILOT_WHATSAPP_HREF = 'https://wa.me/85255987135';