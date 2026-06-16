/**
 * Observability Pinia store
 *
 * Consolidates Sentry (error/performance monitoring) and PostHog (product analytics/feature flags)
 * into a single reactive store. This eliminates module-level singletons and init-order issues.
 *
 * Consumers use the `useObservability()` composable in components,
 * or access this store directly in non-setup contexts (stores, router, etc.).
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as Sentry from '@sentry/vue';
import type { Router } from 'vue-router';
import posthog from 'posthog-js';

// ─── Config types ────────────────────────────────────────────────────────────

export interface ISentryConfig {
    dsn: string;
    environment: string;
    tracesSampleRate: number;
    replaysSessionSampleRate: number;
    replaysOnErrorSampleRate: number;
    debug: boolean;
}

export interface IPostHogConfig {
    apiKey: string;
    apiHost: string;
    debug: boolean;
}

// ─── Event catalog (moved from analytics.ts) ────────────────────────────────

export const analyticsEvents = {
    // Application Lifecycle
    APP_STARTED: 'app_started',
    APP_READY: 'app_ready',

    // Navigation
    PAGE_VIEW: 'page_view',

    // Authentication
    USER_SIGNED_UP: 'user_signed_up',
    USER_LOGGED_IN: 'user_logged_in',
    USER_LOGGED_OUT: 'user_logged_out',

    // Cart
    ITEM_ADDED_TO_CART: 'item_added_to_cart',
    ITEM_REMOVED_FROM_CART: 'item_removed_from_cart',
    CART_CLEARED: 'cart_cleared',

    // Orders
    ORDER_CHECKOUT_STARTED: 'order_checkout_started',
    CHECKOUT_COMPLETED: 'checkout_completed',
    ORDER_PLACED: 'order_placed',

    // Products
    PRODUCT_VIEWED: 'product_viewed',
    PRODUCT_SEARCHED: 'product_searched',

    // Feedback
    FEEDBACK_SUBMITTED: 'feedback_submitted'
} as const;

export type AnalyticsEventName = (typeof analyticsEvents)[keyof typeof analyticsEvents];

// ─── Config readers ──────────────────────────────────────────────────────────

function readSentryConfig(): ISentryConfig | undefined {
    const dsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim();

    if (!dsn) {
        return undefined;
    }

    const tracesSampleRateRaw =
        (import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE as string | undefined) ?? '0';
    const tracesSampleRate = Number.parseFloat(tracesSampleRateRaw);

    const replaysSessionSampleRateRaw =
        (import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE as string | undefined) ?? '0.1';
    const replaysSessionSampleRate = Number.parseFloat(replaysSessionSampleRateRaw);

    const replaysOnErrorSampleRateRaw =
        (import.meta.env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE as string | undefined) ?? '1';
    const replaysOnErrorSampleRate = Number.parseFloat(replaysOnErrorSampleRateRaw);

    const debug =
        (import.meta.env.VITE_SENTRY_DEBUG as string | undefined)?.toLowerCase() === 'true';

    const environment =
        (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined)?.trim() ||
        import.meta.env.MODE;

    return {
        dsn,
        environment,
        tracesSampleRate: Number.isFinite(tracesSampleRate)
            ? Math.min(Math.max(tracesSampleRate, 0), 1)
            : 0,
        replaysSessionSampleRate: Number.isFinite(replaysSessionSampleRate)
            ? Math.min(Math.max(replaysSessionSampleRate, 0), 1)
            : 0.1,
        replaysOnErrorSampleRate: Number.isFinite(replaysOnErrorSampleRate)
            ? Math.min(Math.max(replaysOnErrorSampleRate, 0), 1)
            : 1,
        debug
    };
}

function readPostHogConfig(): IPostHogConfig | undefined {
    const apiKey = (import.meta.env.VITE_POSTHOG_API_KEY as string | undefined)?.trim();

    if (!apiKey) {
        return undefined;
    }

    return {
        apiKey,
        apiHost:
            (import.meta.env.VITE_POSTHOG_API_HOST as string | undefined) ??
            'https://app.posthog.com',
        debug: (import.meta.env.VITE_POSTHOG_DEBUG as string | undefined)?.toLowerCase() === 'true'
    };
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useObservabilityStore = defineStore('observability', () => {
    // ── State ────────────────────────────────────────────────────────────────

    const sentryReady = ref(false);
    const posthogReady = ref(false);

    // ── Sentry ───────────────────────────────────────────────────────────────

    /**
     * Initialise Sentry with all integrations.
     * Returns true when Sentry was initialised, false when disabled.
     */
    const initSentry = (router: Router | undefined): boolean => {
        const config = readSentryConfig();

        if (!config) {
            // eslint-disable-next-line no-console
            console.debug('[Sentry] Disabled — no DSN configured');
            return false;
        }

        const integrations = [
            Sentry.browserTracingIntegration({
                router
            }),
            Sentry.replayIntegration({
                maskAllText: true,
                blockAllMedia: true
            })
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
            }
        });

        // Register global tag
        Sentry.getCurrentScope().setTag('app', 'boilerplate-vue-frontend');

        // Wire router tracking (setTransactionName on navigation)
        if (router) {
            setRouter(router);
        }

        sentryReady.value = true;
        // eslint-disable-next-line no-console
        console.debug('[Sentry] Initialized in', config.environment);

        return true;
    };

    /**
     * Attach router to Sentry so navigation is traced.
     * Safe to call before initSentry (no-op if Sentry is not initialised).
     */
    const setRouter = (router: Router): void => {
        if (!sentryReady.value) {
            return;
        }

        router.afterEach((to) => {
            Sentry.getCurrentScope().setTransactionName(to.name?.toString() ?? to.fullPath);
        });
    };

    /**
     * Identify the current user in Sentry.
     */
    const sentryIdentifyUser = (userId: string, email?: string): void => {
        if (!sentryReady.value) {
            return;
        }

        Sentry.getCurrentScope().setUser({
            id: userId,
            email
        });
    };

    /**
     * Clear user context from Sentry.
     */
    const sentryUnidentifyUser = (): void => {
        if (!sentryReady.value) {
            return;
        }

        // eslint-disable-next-line unicorn/no-null
        Sentry.getCurrentScope().setUser(null);
    };

    /**
     * Attach custom properties to the current Sentry scope.
     */
    const sentrySetSessionProperties = (props: Record<string, unknown>): void => {
        if (!sentryReady.value) {
            return;
        }

        const scope = Sentry.getCurrentScope();
        for (const [key, value] of Object.entries(props)) {
            scope.setExtra(key, value);
        }
    };

    /**
     * Capture an exception in Sentry.
     */
    const captureException = (error: unknown, hints?: { data?: Record<string, unknown> }): void => {
        if (!sentryReady.value) {
            return;
        }

        Sentry.captureException(error, hints);
    };

    /**
     * Reset Sentry state (useful for testing or logout).
     */
    const resetSentryState = (): void => {
        Sentry.getCurrentScope().clear();
        sentryReady.value = false;
    };

    // ── PostHog ──────────────────────────────────────────────────────────────

    /**
     * Initialise PostHog.
     * Returns true when PostHog was initialised, false when disabled.
     */
    const initPostHog = (): boolean => {
        const config = readPostHogConfig();

        if (!config) {
            // eslint-disable-next-line no-console
            console.debug('[PostHog] Disabled — no API key configured');
            return false;
        }

        // FIX: capture_pageview: false to avoid double-tracking (router.afterEach is the single source of truth)
        posthog.init(config.apiKey, {
            api_host: config.apiHost,
            debug: config.debug,
            capture_pageview: false,
            capture_pageleave: true
        });

        posthogReady.value = true;
        // eslint-disable-next-line no-console
        console.debug('[PostHog] Initialized');

        return true;
    };

    /**
     * Identify the current user in PostHog.
     */
    const posthogIdentifyUser = (userId: string, email?: string): void => {
        if (!posthogReady.value) {
            return;
        }

        posthog.identify(userId, {
            email
        });
    };

    /**
     * Clear user context from PostHog.
     */
    const posthogUnidentifyUser = (): void => {
        if (!posthogReady.value) {
            return;
        }

        posthog.reset();
    };

    /**
     * Attach custom user properties to the PostHog profile.
     */
    const setPostHogUserProperties = (props: Record<string, unknown>): void => {
        if (!posthogReady.value) {
            return;
        }

        posthog.register(props);
    };

    /**
     * Check whether a feature flag is enabled for the current user.
     */
    const isFeatureEnabled = (flagKey: string): boolean => {
        if (!posthogReady.value) {
            return false;
        }

        return posthog.isFeatureEnabled(flagKey) ?? false;
    };

    /**
     * Reset PostHog state (useful for testing or logout).
     */
    const resetPostHogState = (): void => {
        posthog.reset();
        posthogReady.value = false;
    };

    // ── Unified API ──────────────────────────────────────────────────────────

    /**
     * Track an analytics event (fires to PostHog if available).
     */
    const track = (event: AnalyticsEventName, properties?: Record<string, unknown>): void => {
        if (!posthogReady.value) {
            return;
        }

        posthog.capture(event, properties);
    };

    /**
     * Identify the current user across both Sentry and PostHog.
     * Call after successful authentication.
     */
    const identifyUser = (userId: string, email?: string): void => {
        sentryIdentifyUser(userId, email);
        posthogIdentifyUser(userId, email);
    };

    /**
     * Clear user identity across both Sentry and PostHog.
     * Call on logout / account deletion.
     */
    const unidentifyUser = (): void => {
        sentryUnidentifyUser();
        posthogUnidentifyUser();
    };

    // ── Convenience helpers ──────────────────────────────────────────────────

    /**
     * Track a product view event.
     */
    const trackProductView = (productId: string, productName?: string): void => {
        track(analyticsEvents.PRODUCT_VIEWED, {
            product_id: productId,
            product_name: productName
        });
    };

    /**
     * Track a cart addition event.
     */
    const trackItemAddedToCart = (productId: string, quantity: number): void => {
        track(analyticsEvents.ITEM_ADDED_TO_CART, {
            product_id: productId,
            quantity
        });
    };

    /**
     * Track an order placement event.
     */
    const trackOrderPlaced = (orderId: string, totalAmount: number, itemCount: number): void => {
        track(analyticsEvents.ORDER_PLACED, {
            order_id: orderId,
            total_amount: totalAmount,
            item_count: itemCount
        });
    };

    /**
     * Track a product search event.
     */
    const trackProductSearched = (query: string): void => {
        track(analyticsEvents.PRODUCT_SEARCHED, {
            query
        });
    };

    return {
        // State
        sentryReady,
        posthogReady,

        // Init
        initSentry,
        initPostHog,

        // Unified API
        track,
        identifyUser,
        unidentifyUser,
        captureException,

        // Sentry-specific
        setRouter,
        sentryIdentifyUser,
        sentryUnidentifyUser,
        sentrySetSessionProperties,
        resetSentryState,

        // PostHog-specific
        posthogIdentifyUser,
        posthogUnidentifyUser,
        setPostHogUserProperties,
        isFeatureEnabled,
        resetPostHogState,

        // Convenience helpers
        trackProductView,
        trackItemAddedToCart,
        trackOrderPlaced,
        trackProductSearched
    };
});
