import type { Metadata } from 'next';

/**
 * Absolute OG/Twitter URLs need a base to resolve against. Without one Next emits
 * relative URLs and link-preview crawlers (Slack, iMessage, LinkedIn) drop the
 * preview entirely. The deployment URL is the fallback so a build without
 * NEXT_PUBLIC_APP_URL still produces shareable links instead of silently broken
 * ones.
 */
export function siteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  try {
    return new URL(raw || 'https://tradeflow-ai-rho.vercel.app');
  } catch {
    // A malformed value must never take a build down over metadata.
    return new URL('https://tradeflow-ai-rho.vercel.app');
  }
}

const SITE_NAME = 'Sailwise';

const HOME_TITLE = 'Sailwise — The Autonomous Back Office for Trading Companies';
const HOME_DESCRIPTION =
  'Sailwise turns every buyer inquiry into a complete, sourced quote draft — specs pulled from the email, gaps filled from your own catalogue, priced from your own list, sent from your own address.';

const IMAGE = {
  url: '/og-image.png',
  width: 1200,
  height: 630,
  alt: 'Sailwise — the autonomous back office for trading companies',
} as const;

function absolute(path: string): string {
  return new URL(path, siteUrl()).toString();
}

export function rootMetadata(): Metadata {
  return {
    metadataBase: siteUrl(),
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    alternates: { canonical: absolute('/') },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      url: '/',
      images: [IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      images: [IMAGE.url],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: SITE_NAME,
    },
  };
}

/**
 * Per-route metadata for the public/auth pages.
 *
 * Each route must pass its own `path`: a page that inherits the root openGraph
 * block inherits its `url` too, so a shared /pricing link reports the homepage as
 * its canonical URL. Passing the path keeps each route self-describing.
 */
export function pageMetadata(options: {
  title: string;
  description: string;
  path: string;
  /** 'index' for pages worth ranking; 'noindex' for auth and post-signup flow. */
  index?: boolean;
}): Metadata {
  const { title, description, path, index = true } = options;

  return {
    title,
    description,
    // Matches this route's og:url, so the canonical a crawler reads and the URL a
    // social card advertises never disagree.
    alternates: { canonical: absolute(path) },
    robots: index ? 'index, follow' : 'noindex, nofollow',
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title,
      description,
      url: absolute(path),
      images: [IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [IMAGE.url],
    },
  };
}
