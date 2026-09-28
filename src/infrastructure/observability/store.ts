/**
 * @module
 * Pinia store wrapping two independent, lazily-initialized telemetry SDKs behind one API: Grafana
 * Faro (errors, tracing, web-vitals) and Umami (product analytics). The browser only ever talks to
 * Grafana Alloy's Faro receiver; Alloy fans out to Loki/Tempo/Prometheus. One store rather than two
 * module-level singletons, so there is no init-order problem — callable from components and
 * equally from non-setup contexts (stores, router), as long as the call is inside a function.
 *
 * Umami is here for its PAGEVIEWS only — the tag writes them itself, including SPA route changes.
 * This app emits no custom events: everything with an API request behind it is reported by the
 * backend, from the handler that decided it. So there is no `track()` here to call.
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { mapValues } from 'lodash-es';
import type { Faro, TransportItem } from '@grafana/faro-web-sdk';
import {
    readFaroConfig,
    readUmamiConfig,
    originToRegExp
} from '@/infrastructure/observability/config.ts';
import { logger } from '@/infrastructure/utils/logger.ts';

/**
 * Drops the query string and fragment from a URL, tolerating a value `URL` cannot parse (an
 * already-relative or malformed string) by returning it unchanged rather than throwing.
 *
 * @param url - The URL to strip, absolute or relative.
 * @returns The same URL with no `?search` or `#hash`.
 */
export const stripSensitiveUrlParts = (url: string): string => {
    // eslint-disable-next-line no-restricted-syntax -- `new URL()` has no non-throwing form (no `URL.canParse` fallback here), and an already-relative or malformed value is a real, expected input this function must tolerate rather than propagate
    try {
        const parsed = new URL(url, globalThis.location.origin);
        return `${parsed.origin}${parsed.pathname}`;
    } catch {
        return url.split(/[#?]/)[0] ?? url;
    }
};

/**
 * Faro `beforeSend` hook: strips one-time email tokens (verification, password reset, account
 * deletion, email change all pass them as a `?token=` query param) out of every telemetry item
 * before it leaves the browser — the page URL every item's `meta.page` carries, and the URL
 * attribute OpenTelemetry's HTTP instrumentation puts on a trace span.
 * https://grafana.com/docs/grafana-cloud/monitor-applications/frontend-observability/faro-web-sdk/configuration/#beforesend
 *
 * @param item - One outgoing telemetry item, of whichever kind Faro is about to send.
 * @returns The same item with sensitive URLs redacted; never drops an item outright.
 */
export const stripTokensFromTelemetry = (item: TransportItem): TransportItem => {
    if (item.meta.page?.url) {
        item.meta.page = { ...item.meta.page, url: stripSensitiveUrlParts(item.meta.page.url) };
    }

    // Trace spans carry their own URL, OTLP-style: a flat `attributes` array of `{ key, value }`
    // pairs on every span, under every scope, under every resource. `url.full` is the current
    // OTel semantic-convention key; `http.url` is what older instrumentation versions still emit.
    for (const resourceSpan of (item.payload as { resourceSpans?: unknown[] }).resourceSpans ?? [])
        for (const scopeSpan of (resourceSpan as { scopeSpans?: unknown[] }).scopeSpans ?? [])
            for (const span of (scopeSpan as { spans?: unknown[] }).spans ?? [])
                for (const attribute of (span as { attributes?: unknown[] }).attributes ?? []) {
                    const kv = attribute as { key?: string; value?: { stringValue?: string } };
                    if (
                        (kv.key === 'url.full' || kv.key === 'http.url') &&
                        typeof kv.value?.stringValue === 'string'
                    )
                        kv.value.stringValue = stripSensitiveUrlParts(kv.value.stringValue);
                }

    return item;
};

/**
 * The shape `onResponseReject` (`http/interceptors.ts`) rejects every failed request with — the
 * one this app's stores actually catch and hand to {@link captureException}. Narrowed by its two
 * always-present fields, `success`/`status`, so an arbitrary thrown object never matches it.
 */
interface ApiRejectEnvelope {
    success: false;
    status: number;
    errors?: { code?: unknown }[];
    requestId?: string;
    traceparent?: string;
    method?: string;
    path?: string;
}

/**
 * Narrows an unknown thrown value to {@link ApiRejectEnvelope}.
 *
 * @param error - Whatever a `catch` caught.
 */
const asApiRejectEnvelope = (error: unknown): ApiRejectEnvelope | undefined =>
    typeof error === 'object' &&
    error !== null &&
    (error as { success?: unknown }).success === false &&
    typeof (error as { status?: unknown }).status === 'number'
        ? (error as ApiRejectEnvelope)
        : undefined;

/**
 * Names an API rejection by its status, code and route — `HTTP 401 UNAUTHORIZED GET /account` —
 * so Faro's error list groups it with every other failure of the same kind, rather than every
 * envelope stringifying to the same unsearchable, ungroupable `Error: [object Object]`.
 *
 * @param envelope - The rejection {@link asApiRejectEnvelope} narrowed.
 * @returns A one-line name, missing pieces simply omitted rather than left blank.
 */
const describeApiRejectError = (envelope: ApiRejectEnvelope): string =>
    ['HTTP', String(envelope.status), envelope.errors?.[0]?.code, envelope.method, envelope.path]
        .filter((part): part is string => typeof part === 'string' && part.length > 0)
        .join(' ');

// The Umami tracker script attaches a `umami` object to `window` once loaded. Only `identify` is
// declared: pageviews need no call, and this app sends no custom events.

/**
 * The subset of Umami's global tracker this app calls.
 *
 * Declared rather than imported: the script is loaded from a `<script>` tag at runtime, so
 * there is no package to take a type from.
 */
interface UmamiTracker {
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

    /**
     * Whether Faro finished initialising.
     */
    const faroReady = ref(false);

    /**
     * Whether the Umami tracker script is loaded.
     */
    const umamiReady = ref(false);

    // Faro instance handle (not reactive — used imperatively).

    /**
     * The Faro instance, once initialised. Module-scoped because Faro is a singleton per page.
     */
    let faro: Faro | undefined;

    // In-flight initialization, so concurrent initFaro() calls share one setup.

    /**
     * In-flight initialisation, so concurrent callers share one boot rather than racing two.
     */
    let faroInitPromise: Promise<boolean> | undefined;

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
        ])
            .then(([{ initializeFaro, getWebInstrumentations }, { TracingInstrumentation }]) => {
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
                    // A one-time email token is the only credential for its action, and it arrives as
                    // a URL query param — this keeps it out of every page-meta and trace-span URL Faro
                    // ships. See `stripTokensFromTelemetry`.
                    beforeSend: stripTokensFromTelemetry,
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
            })
            .catch((error: unknown) => {
                // A rejection (a flaky CDN, a dropped connection loading either dynamic import) must
                // not stick around: `??=` above only re-runs the block while `faroInitPromise` is
                // `undefined`, so a cached rejection would refuse every later `initFaro()` call
                // forever, on every future page of the same session, for a failure that was never
                // permanent. Chained onto the same promise the `??=` assigns, rather than reassigned
                // afterwards, so every concurrent caller still shares the one attempt the docblock
                // above promises — a second `.catch` bolted on separately would hand a later
                // concurrent caller a different promise object each time.
                faroInitPromise = undefined;
                logger.debug('observability', '[Faro] Initialization failed', error);
                return false;
            });

        return faroInitPromise;
    };

    /**
     * Identifies the current user — id only, in both Faro and Umami (when its v2.11+ `identify`
     * is available). Neither ever gets an email: Faro is a diagnostics identity, not a contact
     * book, and Umami markets itself as privacy-respecting, cookieless analytics — handing it an
     * email would contradict that on this deployment's behalf.
     *
     * Callers gate this on the visitor's own analytics consent (`payload.analyticsConsent`) —
     * this function does not ask, since it has no way to tell an unset consent from a withdrawn
     * one and no business fetching the profile itself.
     *
     * @param userId - Stable user identifier.
     */
    const identifyUser = (userId: string): void => {
        if (faroReady.value && faro) {
            faro.api.setUser({ id: userId });
        }

        // Umami has a lightweight identify (v2.11+); best-effort.
        globalThis.umami?.identify?.({ id: userId });
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
     * an {@link ApiRejectEnvelope} — what every failed API call actually throws — is named
     * by its status/code/route ({@link describeApiRejectError}) rather than stringified into the
     * unreadable, ungroupable `Error: [object Object]`; its own correlation fields join whatever
     * `hints.data` carried. Any other thrown value is reported as itself, if already an `Error`,
     * else as its own string form.
     *
     * @param error - Thrown value; non-`Error` values are stringified into one, unless it is an
     *  API rejection.
     * @param hints - Extra context; `hints.data` is flattened into a string map
     *  and attached to the error.
     * @returns Nothing; a no-op while Faro is disabled or not yet ready.
     */
    const captureException = (error: unknown, hints?: { data?: Record<string, unknown> }): void => {
        if (!faroReady.value || !faro) {
            return;
        }

        const envelope = asApiRejectEnvelope(error);
        if (envelope) {
            const code = envelope.errors?.[0]?.code;
            faro.api.pushError(new Error(describeApiRejectError(envelope)), {
                context: normalizeContext({
                    status: envelope.status,
                    ...(typeof code === 'string' && { code }),
                    ...(envelope.requestId && { requestId: envelope.requestId }),
                    ...(envelope.traceparent && { traceparent: envelope.traceparent }),
                    ...hints?.data
                })
            });
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
     * Loads the Umami tracker script, which is all this app asks of Umami: pageviews, including
     * SPA route changes, are recorded by the script itself with nothing to call.
     *
     * @returns `true` when the tracker was injected (or already present),
     *  `false` when analytics is disabled by configuration. Injection is
     *  guarded against duplicates (e.g. HMR); the script itself loads async.
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
            // A one-time email token travels as a `?token=` query param on the confirm pages
            // (verification, password reset, account deletion, email change) — Umami's own two
            // flags are what keep it out of every pageview this tag records on its own.
            // https://umami.is/docs/tracker-configuration
            script.dataset.excludeSearch = 'true';
            script.dataset.excludeHash = 'true';
            document.head.append(script);
        }

        umamiReady.value = true;
        logger.debug('observability', '[Umami] Tracker injected →', config.src);

        return true;
    };

    return {
        // State
        faroReady,
        umamiReady,

        // Init
        initFaro,
        initUmami,

        // Unified API
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
