/**
 * Observability Pinia store
 *
 * Wires the frontend into the self-hosted, local observability stack:
 *
 *   - Grafana Faro  → error/crash monitoring, frontend tracing, web-vitals.
 *                     The browser only ever talks to Grafana Alloy's Faro
 *                     receiver; Alloy fans out to Loki/Tempo/Prometheus.
 *   - Umami         → product analytics (pageviews + custom events).
 *
 * Consolidating both into a single reactive store eliminates module-level
 * singletons and init-order issues.
 *
 * Consumers use the `useObservability()` composable in components,
 * or access this store directly in non-setup contexts (stores, router, etc.).
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Faro } from '@grafana/faro-web-sdk';

// ─── Umami global ──────────────────────────────────────────────────────────────
// The Umami tracker script attaches a `umami` object to `window` once loaded.
interface IUmamiTracker {
    track: (eventName: string, eventData?: Record<string, unknown>) => void;
    identify?: (data: Record<string, unknown>) => void;
}

declare global {
    var umami: IUmamiTracker | undefined;
}

// ─── Config types ────────────────────────────────────────────────────────────

export interface IFaroConfig {
    /** Grafana Alloy Faro receiver endpoint (e.g. http://localhost:12347/collect). */
    url: string;
    appName: string;
    appVersion: string;
    environment: string;
    /** API origin(s) to propagate the W3C `traceparent` header to (stitches FE↔BE traces). */
    apiOrigin: string;
}

export interface IUmamiConfig {
    /** Umami tracker script URL (e.g. http://localhost:8090/script.js). */
    src: string;
    websiteId: string;
}

// ─── Event catalog ─────────────────────────────────────────────────────────────
// IMPORTANT: these MUST match the canonical event names the backend emits so
// that frontend and backend analytics line up in Umami/Grafana. Only the
// `app_*` and `user_logged_out` events are frontend-only (the backend has no
// equivalent).

export const analyticsEvents = {
    // Application Lifecycle (frontend-only)
    APP_STARTED: 'app_started',
    APP_READY: 'app_ready',

    // Authentication
    USER_SIGNED_UP: 'user_signed_up',
    USER_LOGGED_IN: 'user_logged_in',
    USER_LOGGED_OUT: 'user_logged_out',
    USER_PROFILE_VIEWED: 'user_profile_viewed',
    ACCOUNT_DELETED: 'account_deleted',

    // Products
    PRODUCTS_SEARCHED: 'products_searched',
    PRODUCT_VIEWED: 'product_viewed',

    // Cart
    CART_VIEWED: 'cart_viewed',
    CART_ITEM_ADDED: 'cart_item_added',
    CART_ITEM_UPDATED: 'cart_item_updated',
    CART_ITEM_REMOVED: 'cart_item_removed',
    CART_CLEARED: 'cart_cleared',

    // Checkout / Orders
    CHECKOUT_COMPLETED: 'checkout_completed',
    CHECKOUT_FAILED: 'checkout_failed',
    ORDER_CREATED: 'order_created',
    ORDERS_VIEWED: 'orders_viewed'
} as const;

export type AnalyticsEventName = (typeof analyticsEvents)[keyof typeof analyticsEvents];

// ─── Config readers ──────────────────────────────────────────────────────────

function readFaroConfig(): IFaroConfig | undefined {
    const url = (import.meta.env.VITE_FARO_URL as string | undefined)?.trim();

    if (!url) {
        return undefined;
    }

    return {
        url,
        appName: (import.meta.env.VITE_FARO_APP_NAME as string | undefined)?.trim() || 'frontend',
        appVersion:
            (import.meta.env.VITE_FARO_APP_VERSION as string | undefined)?.trim() || '1.0.0',
        environment:
            (import.meta.env.VITE_FARO_ENVIRONMENT as string | undefined)?.trim() ||
            import.meta.env.MODE,
        // Reuse the API origin so browser fetch/XHR traces get stitched onto BE traces.
        apiOrigin:
            (import.meta.env.VITE_API_URL as string | undefined)?.trim() || 'http://localhost:3000'
    };
}

function readUmamiConfig(): IUmamiConfig | undefined {
    const websiteId = (import.meta.env.VITE_UMAMI_WEBSITE_ID as string | undefined)?.trim();

    if (!websiteId) {
        return undefined;
    }

    return {
        src:
            (import.meta.env.VITE_UMAMI_SRC as string | undefined)?.trim() ||
            'http://localhost:8090/script.js',
        websiteId
    };
}

/** Build an anchored RegExp matching the given origin, for trace header propagation. */
function originToRegExp(origin: string): RegExp {
    const escaped = origin.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`);
    return new RegExp(`^${escaped}`);
}

/**
 * Feature flags are not part of the local stack (Umami has none).
 * Kept for API compatibility; always returns false.
 */
function isFeatureEnabled(_flagKey: string): boolean {
    return false;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useObservabilityStore = defineStore('observability', () => {
    // ── State ────────────────────────────────────────────────────────────────

    const faroReady = ref(false);
    const umamiReady = ref(false);

    // Faro instance handle (not reactive — used imperatively).
    let faro: Faro | undefined;

    // In-flight initialization, so concurrent initFaro() calls share one setup.
    let faroInitPromise: Promise<boolean> | undefined;

    // ── Faro (errors + tracing + web-vitals) ───────────────────────────────────

    /**
     * Initialise Grafana Faro as early as possible in app bootstrap.
     *
     * `getWebInstrumentations()` captures uncaught errors + promise rejections,
     * console errors, Core Web Vitals and session tracking. The tracing
     * instrumentation opens a span for every fetch/XHR and propagates the W3C
     * `traceparent` header to the API origin, so a single trace spans
     * "browser interaction → API handler → database query" in Grafana/Tempo.
     *
     * Resolves true when Faro was initialised, false when disabled.
     *
     * The Faro SDK and its OpenTelemetry tracing package are dynamically
     * imported so they live in a lazy chunk, off the critical entry bundle.
     */
    const initFaro = (): Promise<boolean> => {
        const config = readFaroConfig();

        if (!config) {
            // eslint-disable-next-line no-console
            console.debug('[Faro] Disabled — no VITE_FARO_URL configured');
            return Promise.resolve(false);
        }

        faroInitPromise ??= Promise.all([
            import('@grafana/faro-web-sdk'),
            import('@grafana/faro-web-tracing')
        ]).then(([{ initializeFaro, getWebInstrumentations }, { TracingInstrumentation }]) => {
            faro = initializeFaro({
                url: config.url,
                app: {
                    name: config.appName,
                    version: config.appVersion,
                    environment: config.environment
                },
                instrumentations: [
                    ...getWebInstrumentations(),
                    new TracingInstrumentation({
                        instrumentationOptions: {
                            // Stitch FE traces onto BE traces: propagate `traceparent` to the API origin.
                            propagateTraceHeaderCorsUrls: [originToRegExp(config.apiOrigin)]
                        }
                    })
                ]
            });

            faroReady.value = true;
            // eslint-disable-next-line no-console
            console.debug('[Faro] Initialized', config.environment, '→', config.url);

            return true;
        });

        return faroInitPromise;
    };

    /**
     * Identify the current user for error/session context in Faro.
     */
    const identifyUser = (userId: string, email?: string): void => {
        if (faroReady.value && faro) {
            faro.api.setUser({ id: userId, email });
        }

        // Umami has a lightweight identify (v2.11+); best-effort.
        globalThis.umami?.identify?.({ id: userId, email });
    };

    /**
     * Clear user identity from Faro. Call on logout / account deletion.
     */
    const unidentifyUser = (): void => {
        if (faroReady.value && faro) {
            faro.api.resetUser();
        }
    };

    /**
     * Capture / report an exception to Faro (visible in Grafana → Loki).
     */
    const captureException = (error: unknown, hints?: { data?: Record<string, unknown> }): void => {
        if (!faroReady.value || !faro) {
            return;
        }

        const normalizedError = error instanceof Error ? error : new Error(String(error));
        faro.api.pushError(
            normalizedError,
            hints?.data ? { context: normalizeContext(hints.data) } : undefined
        );
    };

    // ── Umami (product analytics) ──────────────────────────────────────────────

    /**
     * Load the Umami tracker script. Pageviews (including SPA route changes) are
     * tracked automatically; custom events go through `track()` below.
     *
     * Returns true when Umami was (asynchronously) loaded, false when disabled.
     */
    const initUmami = (): boolean => {
        const config = readUmamiConfig();

        if (!config) {
            // eslint-disable-next-line no-console
            console.debug('[Umami] Disabled — no VITE_UMAMI_WEBSITE_ID configured');
            return false;
        }

        if (umamiReady.value) {
            return true;
        }

        // Avoid injecting twice (e.g. HMR).
        if (!document.querySelector(`script[data-website-id="${config.websiteId}"]`)) {
            const script = document.createElement('script');
            script.defer = true;
            script.src = config.src;
            script.dataset.websiteId = config.websiteId;
            document.head.append(script);
        }

        umamiReady.value = true;
        // eslint-disable-next-line no-console
        console.debug('[Umami] Tracker injected →', config.src);

        return true;
    };

    // ── Unified API ──────────────────────────────────────────────────────────

    /**
     * Track a product analytics event in Umami.
     *
     * The tracker script loads asynchronously, so `globalThis.umami` may not be
     * ready on the very first calls; such early events are dropped, which is
     * acceptable for analytics.
     */
    const track = (event: AnalyticsEventName, properties?: Record<string, unknown>): void => {
        if (!umamiReady.value) {
            return;
        }

        globalThis.umami?.track(event, properties);
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
        track(analyticsEvents.CART_ITEM_ADDED, {
            product_id: productId,
            quantity
        });
    };

    /**
     * Track an order creation event.
     */
    const trackOrderPlaced = (orderId: string, totalAmount: number, itemCount: number): void => {
        track(analyticsEvents.ORDER_CREATED, {
            order_id: orderId,
            total_amount: totalAmount,
            item_count: itemCount
        });
    };

    /**
     * Track a product search event.
     */
    const trackProductSearched = (query: string): void => {
        track(analyticsEvents.PRODUCTS_SEARCHED, {
            query
        });
    };

    return {
        // State
        faroReady,
        umamiReady,

        // Init
        initFaro,
        initUmami,

        // Unified API
        track,
        identifyUser,
        unidentifyUser,
        captureException,
        isFeatureEnabled,

        // Convenience helpers
        trackProductView,
        trackItemAddedToCart,
        trackOrderPlaced,
        trackProductSearched
    };
});

/** Coerce arbitrary hint data into the string map Faro's error context expects. */
function normalizeContext(data: Record<string, unknown>): Record<string, string> {
    return Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
            key,
            typeof value === 'string' ? value : JSON.stringify(value)
        ])
    );
}
