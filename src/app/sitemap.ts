import type { MetadataRoute } from 'next';

const siteUrl = (() => {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  try {
    return new URL(raw || 'https://tradeflow-ai-rho.vercel.app');
  } catch {
    return new URL('https://tradeflow-ai-rho.vercel.app');
  }
})();

// Public pages only. /admin, /onboarding and the auth pages are deliberately
// absent: they are either behind a session or of no use in a search result.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: `${siteUrl.origin}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl.origin}/product`, lastModified, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${siteUrl.origin}/trust`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl.origin}/pricing`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl.origin}/faq`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${siteUrl.origin}/founders`, lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${siteUrl.origin}/book`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl.origin}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
