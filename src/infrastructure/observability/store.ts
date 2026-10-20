/**
 * @module
 * Pinia store wrapping two independent, lazily-initialized telemetry SDKs behind one API: Grafana
 * Faro (errors, tracing, web-vitals) and Umami (product analytics). The browser only ever talks to
 * Grafana Alloy's Faro receiver; Alloy fans out to Loki/Tempo/Prometheus. One store rather than two
 * module-level singletons, so there is no init-order problem — callable from components and
 * equally from non-setup contexts (stores, router), as long as the call is inside a function.
 *
 * Umami loads only after the visitor consents (`setUmamiConsent`), unless the build opts out with
 * `VITE_UMAMI_REQUIRE_CONSENT=false`.
 *
 * Before consent nothing identifies, measures or reports the visitor: Faro is not even loaded.
 * `setFaroConsent(true)` boots it (crash reports, tracing, web vitals and performance timing, with
 * no session id); withdrawal pauses its transport, and a later grant unpauses it. Reaching the
 * operator's own collector from the visitor's browser is in scope of ePrivacy Art. 5(3) (EDPB
 * Guidelines 2/2023), and fault finding is no "strictly necessary" exemption (WP29 04/2012 §4.3,
 * Criterion B), so Faro follows consent. See `docs/tools/observability.md`.
 *
 * Neither SDK is told who the visitor is: Faro's `setUser` and Umami's `identify` are never called, so
 * nothing either one keeps is keyed to an account (data minimisation, GDPR Art. 5(1)(c) and 25(2)).
 *
 * Umami writes the PAGEVIEWS itself, including SPA route changes. The only custom events this app
 * sends are browsing ones (`trackBrowsing` in `analytics-consent.ts`), through the backend's relay
 * and only after consent; every business fact is reported by the backend, from the handler that
 * decided it. See `docs/tools/umami.md` for who sends which event.
 */

import { defineStore } from 'pinia';
import { BROWSER_STORAGE_NAME } from '@/infrastructure/browser-storage.ts';
import { ref } from 'vue';
import { mapValues } from 'lodash-es';
import type { Faro, TransportItem } from '@grafana/faro-web-sdk';
import {
    readFaroConfig,
    readUmamiConfig,
    readUmamiRequireConsent
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
 * deletion, email change all pass them as a `#token=` fragment — which `stripSensitiveUrlParts` drops along with any query) out of every telemetry item
 * before it leaves the browser — the page URL every item's `meta.page` carries, the URL
 * attribute OpenTelemetry's HTTP instrumentation puts on a trace span, and the URLs the
 * performance and navigation events carry (a staff `?email=` filter is a customer's address).
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

    stripEventUrls(item.payload as EventPayload);

    return item;
};

/**
 * The part of a Faro event payload {@link stripEventUrls} reads: the event's own name and the
 * free-form attributes the SDK's instrumentations attach to it.
 */
interface EventPayload {
    name?: unknown;
    attributes?: Record<string, unknown>;
}

/**
 * Strips the URLs a Faro event carries in its attributes (any payload without an `attributes`
 * object, an exception or a trace for instance, is left alone): `name` on the `faro.performance.*`
 * events (the navigation or resource the browser timed) and `fromUrl`/`toUrl` on the navigation
 * event. Any other event's `name` attribute is left alone: it is not necessarily a URL.
 *
 * @param payload - The event payload, changed in place.
 */
const stripEventUrls = (payload: EventPayload): void => {
    const { attributes } = payload;
    if (!attributes) return;

    const keys = ['fromUrl', 'toUrl'];
    if (typeof payload.name === 'string' && payload.name.startsWith('faro.performance'))
        keys.push('name');

    for (const key of keys) {
        const value = attributes[key];
        if (typeof value === 'string') attributes[key] = stripSensitiveUrlParts(value);
    }
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

/**
 * The `localStorage` key the Umami tracker checks before every send: any truthy value silences it.
 * https://umami.is/docs/tracker-configuration
 */
const UMAMI_OPT_OUT_KEY = BROWSER_STORAGE_NAME.umamiDisabled;

/**
 * Sets or clears the tracker's own opt-out switch. Storage can be blocked (private mode, a
 * browser setting) and then there is nothing to flip, so a refusal is swallowed: the script is
 * only ever injected on consent, and a blocked-storage visitor who never consented never loads it.
 *
 * @param disabled - `true` to silence the tracker, `false` to let it send again.
 */
const setUmamiOptOut = (disabled: boolean): void => {
    // eslint-disable-next-line no-restricted-syntax -- `localStorage` access itself throws when storage is blocked; there is no non-throwing probe
    try {
        if (disabled) localStorage.setItem(UMAMI_OPT_OUT_KEY, '1');
        else localStorage.removeItem(UMAMI_OPT_OUT_KEY);
    } catch {
        logger.debug('observability', '[Umami] localStorage unavailable, opt-out not persisted');
    }
};

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

    /**
     * Whether the visitor currently consents. Remembered so a consent that changes while Faro is
     * still loading is applied the moment it has: a withdrawal then pauses the transport as soon
     * as it exists.
     */
    let faroConsent = false;

    // ── Faro (errors + tracing + web-vitals) ───────────────────────────────────

    /**
     * Initialise Grafana Faro. Only {@link setFaroConsent} calls it, once the visitor has agreed.
     *
     * Boots with uncaught errors and rejections, console errors, CSP violations and views, Core
     * Web Vitals and performance timing, plus tracing. Session tracking is off (no session id is
     * generated or stored). Everything boots together because Faro only ever loads after consent,
     * and a withdrawal pauses the transport rather than removing instrumentations (the SDK's
     * `instrumentations.remove` only takes out the last one added). The tracing instrumentation opens a span per
     * fetch/XHR and propagates `traceparent` to the API origin. The API links its request span to that
     * browser span rather than continuing its trace, so the two are findable from each other but
     * stay separate traces. Both SDKs are dynamically imported, off the critical entry bundle.
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
            .then(([sdk, { TracingInstrumentation }]) => {
                const { initializeFaro } = sdk;

                // Faro Web SDK `initializeFaro`: `url` = the Alloy Faro receiver, `app` tags every
                // signal, `instrumentations` = web defaults + tracing.
                // https://github.com/grafana/faro-web-sdk
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
                    // No session id before consent: Faro would otherwise store one in
                    // `sessionStorage` (`com.grafana.faro.session`) and tag every signal with it.
                    sessionTracking: { enabled: false },
                    instrumentations: [
                        new sdk.ErrorsInstrumentation(),
                        new sdk.ConsoleInstrumentation(),
                        new sdk.CSPInstrumentation(),
                        new sdk.ViewInstrumentation(),
                        // Core Web Vitals and performance timing. Their events carry a URL each,
                        // which `beforeSend` strips. No NavigationInstrumentation: it is
                        // experimental and the views above already say where the visitor is.
                        new sdk.WebVitalsInstrumentation(),
                        new sdk.PerformanceInstrumentation(),
                        new TracingInstrumentation({
                            instrumentationOptions: {
                                // Send `traceparent` to the API origin: the API records it as a span LINK, not a parent.
                                propagateTraceHeaderCorsUrls: config.propagateTo
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
     * Applies the visitor's consent to Faro. Granted loads and boots it (once) and lets its
     * transport send. Withdrawn pauses the transport, which drops what is reported from then on.
     * Idempotent, and a withdrawal that lands while Faro is still loading wins: the transport is
     * paused the moment Faro exists, never left running.
     *
     * @param granted - Whether the visitor currently consents to analytics.
     */
    const setFaroConsent = (granted: boolean): void => {
        faroConsent = granted;

        if (!granted) {
            // Faro `pause()`: the transport stops sending and drops new items, nothing is buffered.
            faro?.pause();
            return;
        }

        void initFaro().then((ready) => {
            if (!ready) return;
            // Faro `unpause()` undoes an earlier `pause()` (a no-op on a transport never paused);
            // a consent withdrawn while Faro loaded pauses it instead.
            if (faroConsent) faro?.unpause();
            else faro?.pause();
        });
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
            // A one-time email token travels as a `#token=` fragment on the confirm pages
            // (verification, password reset, account deletion, email change) — Umami's own
            // flags keep it, and any query string, out of every pageview this tag records.
            // https://umami.is/docs/tracker-configuration
            script.dataset.excludeSearch = 'true';
            script.dataset.excludeHash = 'true';
            document.head.append(script);
        }

        umamiReady.value = true;
        logger.debug('observability', '[Umami] Tracker injected →', config.src);

        return true;
    };

    /**
     * Applies the visitor's consent to Umami: granted loads the tracker and lifts the opt-out;
     * withdrawn silences it through `umami.disabled` (the script, if already loaded, stays inert
     * until the page is reloaded). With `VITE_UMAMI_REQUIRE_CONSENT=false` consent is ignored and
     * the tracker always loads. Idempotent — callers invoke it on every change of the answer.
     *
     * @param granted - Whether the visitor currently consents to analytics.
     * @returns `true` when the tracker is loaded and enabled afterwards.
     */
    const setUmamiConsent = (granted: boolean): boolean => {
        // No website id, no tracker: nothing to gate, and no reason to touch storage.
        if (!readUmamiConfig()) return false;

        if (readUmamiRequireConsent() && !granted) {
            setUmamiOptOut(true);
            return false;
        }

        setUmamiOptOut(false);
        return initUmami();
    };

    return {
        // State
        faroReady,
        umamiReady,

        // Init
        initFaro,
        initUmami,
        setUmamiConsent,
        setFaroConsent,

        // Unified API
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
