/**
 * PostHog module
 *
 * PostHog provides product analytics and feature flags.
 * It tracks user behavior (page views, clicks, custom events)
 * and powers A/B tests and feature rollouts.
 *
 * Docs:
 *  https://posthog.com/docs
 *  https://posthog.com/docs/libraries/js
 */

import posthog from 'posthog-js';

/** Internal flag to track whether PostHog has been initialised. */
let posthogInitialized = false;

export interface PostHogConfig {
  apiKey: string;
  apiHost: string;
  debug: boolean;
}

/**
 * Read PostHog config from environment variables.
 * Returns undefined when API key is not configured (PostHog disabled).
 */
function getConfig(): PostHogConfig | undefined {
  const apiKey = (import.meta.env.VITE_POSTHOG_API_KEY as string | undefined)?.trim();

  if (!apiKey) {
    return undefined;
  }

  return {
    apiKey,
    apiHost: (import.meta.env.VITE_POSTHOG_API_HOST as string | undefined) ?? 'https://app.posthog.com',
    debug: (import.meta.env.VITE_POSTHOG_DEBUG as string | undefined)?.toLowerCase() === 'true',
  };
}

/**
 * Initialise PostHog.
 *
 * Call once during app bootstrap. Returns true when PostHog
 * was initialised, false when it is disabled (no API key).
 * Safe to call multiple times (subsequent calls are no-ops).
 */
export function initPostHog(): boolean {
  if (posthogInitialized) {
    return true;
  }

  const config = getConfig();

  if (!config) {
    console.debug('[PostHog] Disabled — no API key configured');
    return false;
  }

  posthog.init(config.apiKey, {
    api_host: config.apiHost,
    debug: config.debug,
    capture_pageview: true,
    capture_pageleave: true,
  });

  posthogInitialized = true;
  console.debug('[PostHog] Initialized');

  return true;
}

/**
 * Return true if PostHog has been successfully initialised.
 */
export function isPostHogInitialized(): boolean {
  return posthogInitialized;
}

/**
 * Identify the current user in PostHog.
 * Call after successful authentication.
 * Safe to call before initPostHog (no-op if PostHog is not initialised).
 */
export function identifyUser(userId: string, email?: string): void {
  if (!posthogInitialized) {
    return;
  }

  posthog.identify(userId, {
    email,
  });
}

/**
 * Clear user context from PostHog.
 * Call on logout.
 * Safe to call before initPostHog (no-op if PostHog is not initialised).
 */
export function unidentifyUser(): void {
  if (!posthogInitialized) {
    return;
  }

  posthog.reset();
}

/**
 * Capture a custom analytics event.
 * Safe to call before initPostHog (no-op if PostHog is not initialised).
 */
export function captureEvent(name: string, properties?: Record<string, unknown>): void {
  if (!posthogInitialized) {
    return;
  }

  posthog.capture(name, properties);
}

/**
 * Attach custom user properties to the PostHog profile.
 * Safe to call before initPostHog (no-op if PostHog is not initialised).
 */
export function setUserProperties(props: Record<string, unknown>): void {
  if (!posthogInitialized) {
    return;
  }

  posthog.register(props);
}

/**
 * Check whether a feature flag is enabled for the current user.
 * Returns false if PostHog is not initialised.
 */
export function isFeatureEnabled(flagKey: string): boolean {
  if (!posthogInitialized) {
    return false;
  }

  return posthog.isFeatureEnabled(flagKey) ?? false;
}

/**
 * Get the current PostHog instance (useful for advanced scenarios).
 */
export function getInstance() {
  return posthog;
}

/**
 * Reset PostHog state (useful for testing or logout).
 * Clears user, resets session, and clears initialised flag.
 */
export function resetPostHog(): void {
  posthog.reset();
  posthogInitialized = false;
}
