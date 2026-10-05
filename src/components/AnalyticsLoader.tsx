'use client';

import { useEffect } from 'react';
import { initAnalytics, analyticsEnabled } from '@/lib/analytics';

// Loads the PostHog client once, on mount, only when a project key is configured.
// The import is dynamic so posthog-js lands in its own chunk that a build without
// a key never requests.
export default function AnalyticsLoader() {
  useEffect(() => {
    if (!analyticsEnabled()) return;
    void initAnalytics();
  }, []);

  return null;
}