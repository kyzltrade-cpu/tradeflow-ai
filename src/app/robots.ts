import type { MetadataRoute } from 'next';

const siteUrl = (() => {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  try {
    return new URL(raw || 'https://tradeflow-ai-rho.vercel.app');
  } catch {
    return new URL('https://tradeflow-ai-rho.vercel.app');
  }
})();

// Only the pages that are meant to be found. /admin is the authenticated app and
// /onboarding is the post-signup flow — neither is a landing page, and listing
// them invites a crawler to request authenticated routes on every deploy.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/onboarding', '/api/'],
      },
    ],
    sitemap: `${siteUrl.origin}/sitemap.xml`,
    host: siteUrl.origin,
  };
}
