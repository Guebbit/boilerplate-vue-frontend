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
 * Consumers call `useObservabilityStore()` — in components and equally in
 * non-setup contexts (stores, router, etc.), as long as the call is inside a
 * function rather than at module level.
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Faro } from '@grafana/faro-web-sdk';
import { analyticsEvents as sharedAnalyticsEvents } from '@/infrastructure/analyticsEvents.ts';
import { logger } from '@/infrastructure/logger.ts';

// ─── Umami global ──────────────────────────────────────────────────────────────
// The Umami tracker script attaches a `umami` object to `window` once loaded.
interface UmamiTracker {
    track: (eventName: string, eventData?: Record<string, unknown>) => void;
    identify?: (data: Record<string, unknown>) => void;
}

declare global {
    var umami: UmamiTracker | undefined;
}

// ─── Config types ────────────────────────────────────────────────────────────

export interface FaroConfig {
    /** Grafana Alloy Faro receiver endpoint (e.g. http://localhost:12347/collect). */
    url: string;
    appName: string;
    appVersion: string;
    environment: string;
    /** API origin(s) to propagate the W3C `traceparent` header to (stitches FE↔BE traces). */
    apiOrigin: string;
    /**
     * URLs Faro must not instrument — the telemetry endpoints themselves.
     *
     * A string entry is compared for **exact equality** with the request URL, never as a prefix,
     * so anything covering more than one path has to be a RegExp.
     */
    ignoreUrls: (string | RegExp)[];
}

export interface UmamiConfig {
    /** Umami tracker script URL (e.g. http://localhost:3080/script.js). */
    src: string;
    websiteId: string;
}

// ─── Event catalog ─────────────────────────────────────────────────────────────
// The names shared with the backend come from `analyticsEvents.ts`, which is byte-identical in
// both repos and guarded by `npm run check:spec-identity` — so the two sides of a funnel cannot
// drift apart silently. Only the events below have no backend counterpart, which is why they are
// the only ones written here.

/** Events only this app can emit: the backend has no equivalent moment to report. */
const frontendOnlyAnalyticsEvents = {
    // Application lifecycle — there is no "app started" on a server that is always started.
    APP_STARTED: 'app_started',
    APP_READY: 'app_ready',

    // Logging out is a client-side token discard; the API has no request to attribute it to.
    USER_LOGGED_OUT: 'user_logged_out'
} as const;

export const analyticsEvents = {
    ...sharedAnalyticsEvents,
    ...frontendOnlyAnalyticsEvents
} as const;

export type AnalyticsEventName = (typeof analyticsEvents)[keyof typeof analyticsEvents];

// ─── Config readers ──────────────────────────────────────────────────────────

/**
 * Reads the Faro configuration from the `VITE_FARO_*` environment variables.
 *
 * @returns The config, or `undefined` when `VITE_FARO_URL` is unset/blank,
 *  which disables Faro entirely. Missing optional values fall back to sensible
 *  defaults (app name, version, current mode, local API origin).
 */
function readFaroConfig(): FaroConfig | undefined {
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
            (import.meta.env.VITE_API_URL as string | undefined)?.trim() || 'http://localhost:3000',
        // Telemetry transports must not be traced. Faro instruments every fetch/XHR, which
        // includes its own POST to the collector and Umami's beacon to `/api/send` — each of
        // those becomes a root trace in Tempo alongside the real ones, and a trace produced by
        // reporting is a trace about nothing. Umami's beacon is the visible one: every tracked
        // event turns into a `HTTP POST` trace, so the noise scales with how well analytics is
        // instrumented. Faro's own endpoint is excluded for the same reason, and because
        // reporting a span about sending spans is a loop worth not starting.
        // The collector URL as a plain string is exact and correct — Faro posts to precisely
        // that URL. Umami needs a pattern, because the beacon goes to `/api/send` under the
        // configured origin and never to the script URL itself.
        ignoreUrls: [url, ...umamiOriginPattern()]
    };
}

/**
 * The Umami origin as a single-element array of anchored patterns, or an empty one when
 * analytics is off or its `src` carries no recognisable origin.
 *
 * Shaped for spreading into {@link FaroConfig.ignoreUrls}: "nothing to exclude" and "exclude
 * this" then read the same at the call site, with no conditional around it.
 *
 * Matched rather than parsed: `new URL()` throws on a malformed value, and a half-filled
 * `VITE_UMAMI_SRC` — which already disables nothing but analytics — must not take Faro down with
 * it on the way past. A pattern that simply fails to match says the same thing without an
 * exception in the path.
 */
function umamiOriginPattern(): RegExp[] {
    const origin = /^https?:\/\/[^/]+/.exec(readUmamiConfig()?.src ?? '')?.[0];

    return origin ? [originToRegExp(origin)] : [];
}

/**
 * Reads the Umami configuration from the `VITE_UMAMI_*` environment variables.
 *
 * @returns The config, or `undefined` when `VITE_UMAMI_WEBSITE_ID` is
 *  unset/blank, which disables analytics entirely.
 */
function readUmamiConfig(): UmamiConfig | undefined {
    const websiteId = (import.meta.env.VITE_UMAMI_WEBSITE_ID as string | undefined)?.trim();

    // The website id is the whole switch: no id, no analytics, and the script is never injected.
    if (!websiteId) {
        return undefined;
    }

    // Only the src has a default — pointing at nothing is worse than pointing at the local script.
    return {
        src:
            (import.meta.env.VITE_UMAMI_SRC as string | undefined)?.trim() ||
            'http://localhost:3080/script.js',
        websiteId
    };
}

/**
 * Builds an anchored RegExp matching the given origin, for trace header
 * propagation.
 *
 * @param origin - Origin to match, e.g. `http://localhost:3000`. Regex
 *  metacharacters are escaped.
 * @returns A RegExp anchored at the start of the URL.
 */
function originToRegExp(origin: string): RegExp {
    const escaped = origin.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`);
    return new RegExp(`^${escaped}`);
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

    /**
     * Events tracked before the Umami script finished loading.
     *
     * Injecting the tag and having a working tracker are separated by a network round-trip, and
     * the events that matter most for a funnel — the ones describing the boot itself — are all
     * emitted inside that window. Dropping them does not lose "some early analytics", it loses
     * `app_started` and `app_ready` every single time, so those two names could never appear in
     * a dashboard at all.
     *
     * Buffering keeps `track()` synchronous and fire-and-forget for callers while making the
     * window survivable. The cap is a safety valve for the case where the script never arrives
     * (blocked by an ad blocker, Umami down): without it the array is an unbounded leak that
     * grows for as long as the tab is open.
     */
    const pendingEvents: { event: AnalyticsEventName; properties?: Record<string, unknown> }[] = [];
    const pendingEventsLimit = 50;

    /**
     * Hand any buffered events to the tracker, in the order they were recorded.
     *
     * A no-op until the script has attached its global, so it is safe to call speculatively.
     */
    const flushPendingEvents = (): void => {
        const tracker = globalThis.umami;

        if (!tracker) {
            return;
        }

        // Drained rather than iterated: a second flush must not resend what the first already
        // delivered, and `track()` appends to this same array.
        for (const pending of pendingEvents.splice(0)) {
            tracker.track(pending.event, pending.properties);
        }
    };

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
     * The Faro SDK and its OpenTelemetry tracing package are dynamically
     * imported so they live in a lazy chunk, off the critical entry bundle.
     *
     * @returns A promise resolving to `true` when Faro was initialised, `false`
     *  when disabled by configuration. Concurrent calls share a single setup.
     */
    const initFaro = (): Promise<boolean> => {
        const config = readFaroConfig();

        if (!config) {
            logger.debug('observability', 'Faro disabled — no VITE_FARO_URL configured');
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
                // Applies to the fetch/XHR instrumentations and to tracing: these URLs produce
                // neither spans nor request events. See `FaroConfig.ignoreUrls`.
                ignoreUrls: config.ignoreUrls,
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
            logger.debug(
                'observability',
                '[Faro] Initialized',
                config.environment,
                '→',
                config.url
            );

            return true;
        });

        return faroInitPromise;
    };

    /**
     * Identifies the current user for error/session context in Faro, and in
     * Umami when its (v2.11+) `identify` is available.
     *
     * @param userId - Stable user identifier.
     * @param email - Optional email, attached for easier triage.
     */
    const identifyUser = (userId: string, email?: string): void => {
        if (faroReady.value && faro) {
            faro.api.setUser({ id: userId, email });
        }

        // Umami has a lightweight identify (v2.11+); best-effort.
        globalThis.umami?.identify?.({ id: userId, email });
    };

    /**
     * Clears the user identity from Faro. Call on logout / account deletion.
     */
    const unidentifyUser = (): void => {
        if (faroReady.value && faro) {
            faro.api.resetUser();
        }
    };

    /**
     * Reports an exception to Faro (visible in Grafana → Loki).
     *
     * @param error - Thrown value; non-`Error` values are stringified into one.
     * @param hints - Extra context; `hints.data` is flattened into a string map
     *  and attached to the error.
     * @returns Nothing; a no-op while Faro is disabled or not yet ready.
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
     * Loads the Umami tracker script. Pageviews (including SPA route changes)
     * are tracked automatically; custom events go through {@link track}.
     *
     * @returns `true` when the tracker was injected (or already present),
     *  `false` when analytics is disabled by configuration. Injection is
     *  guarded against duplicates (e.g. HMR); the script itself loads async,
     *  and events tracked before it lands are buffered and sent on load.
     */
    const initUmami = (): boolean => {
        const config = readUmamiConfig();

        if (!config) {
            logger.debug('observability', '[Umami] Disabled — no VITE_UMAMI_WEBSITE_ID configured');
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
            // `load` is the only signal that `globalThis.umami` exists; everything tracked between
            // this line and that event is sitting in `pendingEvents` waiting for it.
            script.addEventListener('load', flushPendingEvents);
            document.head.append(script);
        }

        umamiReady.value = true;
        logger.debug('observability', '[Umami] Tracker injected →', config.src);

        return true;
    };

    // ── Unified API ──────────────────────────────────────────────────────────

    /**
     * Tracks a product analytics event in Umami.
     *
     * The tracker script loads asynchronously, so `globalThis.umami` may not
     * exist yet on the first calls of a session. Those events are buffered and
     * sent when the script lands, rather than dropped — the boot events would
     * otherwise never be recorded at all.
     *
     * Events tracked while analytics is disabled are dropped, not buffered:
     * there is no script coming, so a buffer would only grow.
     *
     * @param event - Event name from the {@link analyticsEvents} catalog.
     * @param properties - Optional event payload.
     */
    const track = (event: AnalyticsEventName, properties?: Record<string, unknown>): void => {
        if (!umamiReady.value) {
            return;
        }

        const tracker = globalThis.umami;

        if (tracker) {
            tracker.track(event, properties);
            return;
        }

        // Past the cap the oldest events are the ones to lose: a session that has buffered 50
        // events is one where the script is not coming, and the recent ones describe whatever
        // the visitor is doing now.
        if (pendingEvents.length >= pendingEventsLimit) {
            pendingEvents.shift();
        }

        pendingEvents.push({ event, properties });
    };

    // ── Convenience helpers ──────────────────────────────────────────────────

    /**
     * Tracks a product view event.
     *
     * @param productId - Identifier of the viewed product.
     * @param productName - Human-readable name, for readability in dashboards.
     */
    const trackProductView = (productId: string, productName?: string): void => {
        track(analyticsEvents.PRODUCT_VIEWED, {
            product_id: productId,
            product_name: productName
        });
    };

    /**
     * Tracks a cart addition event.
     *
     * @param productId - Identifier of the added product.
     * @param quantity - Number of units added.
     */
    const trackItemAddedToCart = (productId: string, quantity: number): void => {
        track(analyticsEvents.CART_ITEM_ADDED, {
            product_id: productId,
            quantity
        });
    };

    /**
     * Tracks an order creation event.
     *
     * @param orderId - Identifier of the created order.
     * @param totalAmount - Order total, in the order's currency.
     * @param itemCount - Number of line items in the order.
     */
    const trackOrderPlaced = (orderId: string, totalAmount: number, itemCount: number): void => {
        track(analyticsEvents.ORDER_CREATED, {
            order_id: orderId,
            total_amount: totalAmount,
            item_count: itemCount
        });
    };

    /**
     * Tracks a product search event.
     *
     * @param query - Raw search string submitted by the user.
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

        // Convenience helpers
        trackProductView,
        trackItemAddedToCart,
        trackOrderPlaced,
        trackProductSearched
    };
});

/**
 * Coerces arbitrary hint data into the string map Faro's error context expects.
 *
 * @param data - Arbitrary key/value context.
 * @returns The same keys with values stringified (JSON for non-strings).
 */
function normalizeContext(data: Record<string, unknown>): Record<string, string> {
    return Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
            key,
            typeof value === 'string' ? value : JSON.stringify(value)
        ])
    );
}
