/**
 * @module
 * Pure env-var readers for the two telemetry back-ends: each returns `undefined` when its
 * required variable is unset, which is the single opt-in switch `store.ts` checks —
 * no URL, no Faro; no website id, no analytics — so a build with neither set ships the code and
 * calls nothing.
 */

import { readApiUrl, runtimeValue } from '@/infrastructure/runtime-config';

/**
 * Configuration read from `VITE_FARO_*`, passed straight into `initializeFaro()`.
 */
export interface FaroConfig {
    /**
     * Grafana Alloy Faro receiver endpoint (e.g. http://localhost:12347/collect).
     */
    url: string;
    appName: string;
    appVersion: string;
    environment: string;
    /**
     * Cross-origin URLs to propagate the W3C `traceparent` header to (the API links its span to the
     * browser's, it does not join the trace). Empty means the API is on the page's own origin,
     * which OpenTelemetry propagates to by default (`shouldPropagateTraceHeaders` in
     * `@opentelemetry/sdk-trace-web`).
     */
    propagateTo: RegExp[];
    /**
     * URLs Faro must not instrument — the telemetry endpoints themselves.
     *
     * A string entry is compared for **exact equality** with the request URL, never as a prefix,
     * so anything covering more than one path has to be a RegExp.
     */
    ignoreUrls: (string | RegExp)[];
}

/**
 * Configuration read from `VITE_UMAMI_*`, used to inject the tracker script.
 */
export interface UmamiConfig {
    /**
     * Umami tracker script URL (e.g. http://localhost:3080/script.js).
     */
    src: string;
    /**
     * Umami website id, one of the two enable switches for analytics (the other is `src`).
     */
    websiteId: string;
}

/**
 * Builds an anchored RegExp matching the given origin, for trace header propagation.
 *
 * @param origin - Origin to match, e.g. `http://localhost:3000`. Regex metacharacters are escaped.
 * @returns A RegExp anchored at the start of the URL.
 */
export function originToRegExp(origin: string): RegExp {
    const escaped = origin.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`);
    return new RegExp(`^${escaped}`);
}

/**
 * Reads the Umami configuration from the `VITE_UMAMI_*` environment variables.
 *
 * @returns The config, or `undefined` when `VITE_UMAMI_WEBSITE_ID` or `VITE_UMAMI_SRC` is
 *  unset/blank, which disables analytics entirely.
 */
export function readUmamiConfig(): UmamiConfig | undefined {
    const websiteId =
        runtimeValue('UMAMI_WEBSITE_ID') ?? import.meta.env.VITE_UMAMI_WEBSITE_ID?.trim();

    const source = runtimeValue('UMAMI_SRC') ?? import.meta.env.VITE_UMAMI_SRC?.trim();

    // Both are required: a website id with no script to load, or a script with no website to
    // report to, is a misconfiguration and analytics stays off.
    if (!websiteId || !source) {
        return undefined;
    }

    return { src: source, websiteId };
}

/**
 * Whether Umami waits for the visitor's consent before loading (`VITE_UMAMI_REQUIRE_CONSENT`).
 * On by default: only an explicit `false` turns it off, for a deployer who has their own legal
 * basis for loading the tracker unasked. Mirrors the backend's `NODE_ANALYTICS_REQUIRE_CONSENT`.
 *
 * @returns `false` only when the value is exactly `false`; anything else, or unset, is `true`.
 */
export function readUmamiRequireConsent(): boolean {
    const value =
        runtimeValue('UMAMI_REQUIRE_CONSENT') ?? import.meta.env.VITE_UMAMI_REQUIRE_CONSENT?.trim();
    return value?.toLowerCase() !== 'false';
}

/**
 * The Umami origin as a single-element array of anchored patterns, or an empty one when analytics
 * is off or its `src` carries no recognisable origin.
 *
 * Shaped for spreading into {@link FaroConfig.ignoreUrls}, so "nothing to exclude" and "exclude
 * this" read the same at the call site.
 *
 * Matched rather than parsed: `new URL()` throws on a malformed value, and a half-filled
 * `VITE_UMAMI_SRC` must not take Faro down with it.
 */
function umamiOriginPattern(): RegExp[] {
    const origin = /^https?:\/\/[^/]+/.exec(readUmamiConfig()?.src ?? '')?.[0];

    return origin ? [originToRegExp(origin)] : [];
}

/**
 * The cross-origin patterns `traceparent` must be sent to for a given API URL.
 *
 * @param apiUrl - The API base URL; empty when the API shares the page's origin.
 * @returns One anchored pattern, or `[]` for a same-origin API (OpenTelemetry covers that itself).
 */
function propagationTargets(apiUrl: string): RegExp[] {
    return apiUrl ? [originToRegExp(apiUrl)] : [];
}

/**
 * Reads the Faro configuration from the `VITE_FARO_*` environment variables.
 *
 * @returns The config, or `undefined` when `VITE_FARO_URL` is unset/blank, which disables Faro
 *  entirely. Missing optional values fall back to sensible defaults.
 */
export function readFaroConfig(): FaroConfig | undefined {
    const url = runtimeValue('FARO_URL') ?? import.meta.env.VITE_FARO_URL?.trim();

    if (!url) {
        return undefined;
    }

    return {
        url,
        appName:
            runtimeValue('FARO_APP_NAME') ||
            import.meta.env.VITE_FARO_APP_NAME?.trim() ||
            'frontend',
        appVersion:
            runtimeValue('FARO_APP_VERSION') ||
            import.meta.env.VITE_FARO_APP_VERSION?.trim() ||
            __APP_VERSION__,
        environment:
            runtimeValue('FARO_ENVIRONMENT') ||
            import.meta.env.VITE_FARO_ENVIRONMENT?.trim() ||
            import.meta.env.MODE,
        // Reuse the HTTP client's API URL so the API can link its spans to browser fetch/XHR traces.
        propagateTo: propagationTargets(readApiUrl()),
        /*
         * Telemetry transports must not be traced. Faro instruments every fetch/XHR, including
         * its own POST to the collector and Umami's beacon to `/api/send` — each becomes a root
         * trace in Tempo, and a trace produced by reporting is a trace about nothing. The
         * collector URL is exact; Umami needs a pattern, because the beacon goes to `/api/send`
         * under the configured origin and never to the script URL itself.
         */
        ignoreUrls: [url, ...umamiOriginPattern()]
    };
}
