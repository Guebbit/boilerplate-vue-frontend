/**
 * useObservability composable
 *
 * Provides a convenient, composable API for tracking events and managing
 * observability state from within Vue components.
 *
 * Under the hood, it delegates to the Pinia observability store so that
 * non-component code (stores, router guards, utils) can share the same
 * singleton instance.
 */

import {
    useObservabilityStore,
    type AnalyticsEventName,
    analyticsEvents
} from '@/stores/observability';

export function useObservability() {
    const store = useObservabilityStore();

    return {
        // ── State ───
        sentryReady: store.sentryReady,
        posthogReady: store.posthogReady,

        // ── Unified tracking ──
        track: store.track,
        identifyUser: store.identifyUser,
        unidentifyUser: store.unidentifyUser,
        captureException: store.captureException,

        // ── Feature flags ──
        isFeatureEnabled: store.isFeatureEnabled,

        // ── Convenience helpers ──
        trackProductView: store.trackProductView,
        trackItemAddedToCart: store.trackItemAddedToCart,
        trackOrderPlaced: store.trackOrderPlaced,
        trackProductSearched: store.trackProductSearched,

        // ── Event catalog (read-only reference) ──
        analyticsEvents
    };
}

// Re-export types for convenience
export type { AnalyticsEventName } from '@/stores/observability';
export { analyticsEvents } from '@/stores/observability';
