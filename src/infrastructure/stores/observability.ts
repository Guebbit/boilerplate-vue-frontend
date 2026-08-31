/**
 * @module
 * Pinia store wrapping two independent, lazily-initialized telemetry SDKs behind one API: Grafana
 * Faro (errors, tracing, web-vitals) and Umami (product analytics). The browser only ever talks to
 * Grafana Alloy's Faro receiver; Alloy fans out to Loki/Tempo/Prometheus. One store rather than two
 * module-level singletons, so there is no init-order problem — callable from components and
 * equally from non-setup contexts (stores, router), as long as the call is inside a function.
 *
 * Analytics events fired before Umami's script has loaded are queued and flushed on load, so
 * boot-time events are never silently lost to the network round-trip.
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { mapValues } from 'lodash-es';
import type { Faro } from '@grafana/faro-web-sdk';
import {
    readFaroConfig,
    readUmamiConfig,
    originToRegExp
} from '@/infrastructure/observability/config.ts';
import { logger } from '@/infrastructure/utils/logger.ts';

// The Umami tracker script attaches a `umami` object to `window` once loaded.
interface UmamiTracker {
    track: (eventName: string, eventData?: Record<string, unknown>) => void;
    identify?: (data: Record<string, unknown>) => void;
}

/**
 * Augments the global scope: `umami` exists once the tracker script above has loaded.
 */
declare global {
    var umami: UmamiTracker | undefined;
}

/**
 * Store instance: see the module doc above for the overall shape.
 */
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
     * Injecting the tag and having a working tracker are a network round-trip apart, so anything
     * fired during boot falls inside that window and would be dropped. The cap is the safety valve
     * for a script that never arrives (ad blocker, Umami down), which would otherwise leave an
     * array growing for as long as the tab is open.
     */
    const pendingEvents: { event: string; properties?: Record<string, unknown> }[] = [];
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
     * `getWebInstrumentations()` captures uncaught errors, promise rejections, console errors,
     * Core Web Vitals and session tracking; the tracing instrumentation opens a span per
     * fetch/XHR and propagates `traceparent` to the API origin, so one trace spans browser →
     * handler → query. Both SDKs are dynamically imported, off the critical entry bundle.
     *
     * @returns A promise resolving to `true` when Faro was initialised, `false` when disabled by
     *  configuration. Concurrent calls share a single setup.
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
     * Events emitted before the tracker script lands are buffered (see {@link pendingEvents});
     * events emitted while analytics is disabled are dropped, since no script is coming.
     *
     * This app emits none of its own: pageviews are automatic and everything with an API call
     * behind it is reported by the backend, which cannot be blocked by an extension or lost with
     * the tab. The name is therefore a bare `string` — an app built on this boilerplate declares
     * its own catalogue and narrows it there.
     *
     * @param event - Umami event name.
     * @param properties - Optional event payload.
     */
    const track = (event: string, properties?: Record<string, unknown>): void => {
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
        captureException
    };
});

/**
 * Coerces arbitrary hint data into the string map Faro's error context expects.
 *
 * @param data - Arbitrary key/value context.
 * @returns The same keys with values stringified (JSON for non-strings).
 */
function normalizeContext(data: Record<string, unknown>): Record<string, string> {
    return mapValues(data, (value) => (typeof value === 'string' ? value : JSON.stringify(value)));
}
