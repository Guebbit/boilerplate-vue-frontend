/**
 * Observability barrel exports
 *
 * Re-export all observability utilities so consumers
 * can import from a single path.
 */

// ── Sentry (error / performance monitoring)
export {
  initSentry,
  setRouter,
  identifyUser as sentryIdentifyUser,
  unidentifyUser as sentryUnidentifyUser,
  setSessionProperties as sentrySetSessionProperties,
  isSentryInitialized,
  resetSentry,
} from './sentry.ts';

// ── PostHog (product analytics / feature flags)
export {
  initPostHog,
  identifyUser as posthogIdentifyUser,
  unidentifyUser as posthogUnidentifyUser,
  setUserProperties,
  isFeatureEnabled,
  getInstance as getPostHogInstance,
  isPostHogInitialized,
  resetPostHog,
} from './posthog.ts';

// ── High-level analytics API
export {
  AnalyticsEvents,
  track,
  trackProductView,
  trackItemAddedToCart,
  trackOrderPlaced,
  trackProductSearched,
} from './analytics.ts';

export type { AnalyticsEventName } from './analytics.ts';
