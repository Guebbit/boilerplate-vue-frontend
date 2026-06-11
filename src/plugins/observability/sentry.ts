/**
 * Sentry module
 *
 * Sentry provides error reporting and performance monitoring.
 * It helps you see crashes and slow pages in production.
 *
 * Integrations:
 *  - BrowserTracing: automatic performance traces
 *  - Replays: session recordings for visual debugging
 *
 * Docs:
 *  https://docs.sentry.io/platforms/javascript/guides/vue/
 *  https://docs.sentry.io/platforms/javascript/guides/vue/features/replay/
 */

import * as Sentry from '@sentry/vue';
import type { Router } from 'vue-router';

export interface SentryConfig {
  dsn: string;
  environment: string;
  tracesSampleRate: number;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
  debug: boolean;
}

/** Internal flag to track whether Sentry has been initialised. */
let sentryInitialized = false;

/**
 * Return true if Sentry has been successfully initialised.
 */
export function isSentryInitialized(): boolean {
  return sentryInitialized;
}

/**
 * Read Sentry config from environment variables.
 * Returns undefined when DSN is not configured (Sentry disabled).
 */
function getConfig(): SentryConfig | undefined {
  const dsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim();

  if (!dsn) {
    return undefined;
  }

  const tracesSampleRateRaw = (import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE as string | undefined) ?? '0';
  const tracesSampleRate = Number.parseFloat(tracesSampleRateRaw);

  const replaysSessionSampleRateRaw =
    (import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE as string | undefined) ?? '0.1';
  const replaysSessionSampleRate = Number.parseFloat(replaysSessionSampleRateRaw);

  const replaysOnErrorSampleRateRaw =
    (import.meta.env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE as string | undefined) ?? '1.0';
  const replaysOnErrorSampleRate = Number.parseFloat(replaysOnErrorSampleRateRaw);

  const debug = (import.meta.env.VITE_SENTRY_DEBUG as string | undefined)?.toLowerCase() === 'true';

  const environment =
    (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined)?.trim() || import.meta.env.MODE;

  return {
    dsn,
    environment,
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? Math.min(Math.max(tracesSampleRate, 0), 1) : 0,
    replaysSessionSampleRate: Number.isFinite(replaysSessionSampleRate)
      ? Math.min(Math.max(replaysSessionSampleRate, 0), 1)
      : 0.1,
    replaysOnErrorSampleRate: Number.isFinite(replaysOnErrorSampleRate)
      ? Math.min(Math.max(replaysOnErrorSampleRate, 0), 1)
      : 1.0,
    debug,
  };
}

/**
 * Initialise Sentry with all integrations.
 *
 * Call once during app bootstrap. Pass the Vue Router instance
 * so Sentry can track route changes automatically.
 * Returns true when Sentry was initialised, false when disabled.
 */
export function initSentry(router: Router | undefined): boolean {
  const config = getConfig();

  if (!config) {
    console.debug('[Sentry] Disabled — no DSN configured');
    return false;
  }

  const integrations = [
    Sentry.browserTracingIntegration({
      // Set transaction name based on route for meaningful trace names
      router,
    }),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ];

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    tracesSampleRate: config.tracesSampleRate,
    replaysSessionSampleRate: config.replaysSessionSampleRate,
    replaysOnErrorSampleRate: config.replaysOnErrorSampleRate,
    debug: config.debug,
    integrations,
    beforeSend(event) {
      // Strip sensitive headers from error events
      if (event.request?.headers) {
        delete event.request.headers.authorization;
      }
      return event;
    },
  });

  // Register global tag
  Sentry.getCurrentScope().setTag('app', 'boilerplate-vue-frontend');

  // Wire router tracking (setTransactionName on navigation)
  // Note: browserTracingIntegration already handles routing when `router` is passed,
  // but setTransactionName ensures the scope always reflects the current route name.
  if (router) {
    setRouter(router);
  }

  sentryInitialized = true;
  console.debug('[Sentry] Initialized in', config.environment);

  return true;
}

/**
 * Attach router to Sentry so navigation is traced.
 * Safe to call before initSentry (no-op if Sentry is not initialised).
 */
export function setRouter(router: Router): void {
  if (!sentryInitialized) {
    return;
  }

  router.afterEach((to) => {
    Sentry.getCurrentScope().setTransactionName(to.name?.toString() ?? to.fullPath);
  });
}

/**
 * Identify the current user in Sentry.
 * Call after successful authentication.
 * Safe to call before initSentry (no-op if Sentry is not initialised).
 */
export function identifyUser(userId: string, email?: string): void {
  if (!sentryInitialized) {
    return;
  }

  Sentry.getCurrentScope().setUser({
    id: userId,
    email,
  });
}

/**
 * Clear user context from Sentry.
 * Call on logout.
 * Safe to call before initSentry (no-op if Sentry is not initialised).
 */
export function unidentifyUser(): void {
  if (!sentryInitialized) {
    return;
  }

  Sentry.getCurrentScope().setUser(null);
}

/**
 * Attach custom properties to the current Sentry scope.
 * Safe to call before initSentry (no-op if Sentry is not initialised).
 */
export function setSessionProperties(props: Record<string, unknown>): void {
  if (!sentryInitialized) {
    return;
  }

  const scope = Sentry.getCurrentScope();
  for (const [key, value] of Object.entries(props)) {
    scope.setExtra(key, value);
  }
}

/**
 * Reset Sentry state (useful for testing or logout).
 * Clears user, scope extras, and initialises flag.
 */
export function resetSentry(): void {
  Sentry.getCurrentScope().clear();
  sentryInitialized = false;
}
