/**
 * PostHog wrapper.
 *
 * Three constraints shape this module:
 *
 * 1. Env-gated. With no NEXT_PUBLIC_POSTHOG_KEY set, nothing is initialised, the
 *    posthog-js chunk is never requested, and every `track` call is a no-op. That
 *    keeps local and self-hosted builds from shipping events to a project nobody
 *    is watching.
 * 2. Cookieless. `disable_persistence` is on, so no distinct id, session or
 *    cookie is written to localStorage. That is what lets us track without
 *    shipping a consent banner. It also means there is no visitor identity to
 *    leak.
 * 3. Explicit event allowlist. `track` only accepts the six events below, and
 *    properties are restricted to string | number | boolean. You cannot pass an
 *    object through by accident, which is the usual way a PII leak ships.
 *
 * Never pass user email, auth user id, customer name, or message/quote body
 * text. `companyId` is the only identifier permitted: it is an internal
 * pseudonymous key, and it is what the funnel is actually analysed by.
 */

export type AnalyticsEvent =
  | 'signup_completed'
  | 'onboarding_completed'
  | 'catalog_imported'
  | 'mailbox_connected'
  | 'checkout_started'
  | 'quote_sent';

/** Scalar-only, by construction. See constraint 3 above. */
export type AnalyticsProps = Record<string, string | number | boolean>;

type AnalyticsClient = {
  init: (key: string, options: Record<string, unknown>) => void;
  identify: (distinctId: string) => void;
  capture: (event: string, props?: AnalyticsProps) => void;
};

const API_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
const API_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';

type PostHogModule = { default: AnalyticsClient };

let client: AnalyticsClient | null = null;
let loading: Promise<AnalyticsClient | null> | null = null;

export function analyticsEnabled(): boolean {
  return Boolean(API_KEY);
}

/**
 * Loads posthog-js on demand. Called from a client component on mount; safe to
 * call repeatedly, since the underlying import is memoised.
 */
export async function initAnalytics(): Promise<void> {
  if (!API_KEY) return;
  if (client) return;

  if (!loading) {
    loading = import('posthog-js')
      .then((mod: PostHogModule) => {
        const posthog = mod.default;
        posthog.init(API_KEY, {
          api_host: API_HOST,
          // Cookieless: nothing written to localStorage or cookies, so tracking
          // needs no prior consent.
          disable_persistence: true,
          // The six events are fired explicitly. Autocapture would sweep up page
          // URLs and DOM text, which is how analytics libraries end up holding
          // message content.
          autocapture: false,
          capture_pageview: false,
          capture_pageleave: false,
          capture_session_recording: false,
          disable_session_recording: true,
          disable_surveys: true,
          person_profiles: 'never',
        });
        client = posthog;
        return posthog;
      })
      .catch(() => {
        // Analytics must never take the app down. A blocked script, an ad
        // blocker, or an offline dev machine should be invisible here.
        loading = null;
        return null;
      });
  }

  await loading;
}

/**
 * Associates subsequent events with a company. Called with the internal company
 * id only — never the user's id or email.
 */
export function identifyCompany(companyId: string | null | undefined): void {
  if (!companyId || !client) return;
  client.identify(companyId);
}

export function track(event: AnalyticsEvent, props: AnalyticsProps = {}): void {
  if (!client) return;
  try {
    client.capture(event, props);
  } catch {
    // Never let a telemetry failure interrupt a user flow.
  }
}