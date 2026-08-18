/**
 * Environment-driven configuration for the two telemetry back-ends.
 *
 * Both are opt-in through a single variable each — no URL, no Faro; no website id, no analytics —
 * so a build with neither set ships the code and calls nothing.
 */

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
 * @returns The config, or `undefined` when `VITE_UMAMI_WEBSITE_ID` is unset/blank, which
 *  disables analytics entirely.
 */
export function readUmamiConfig(): UmamiConfig | undefined {
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
 * Reads the Faro configuration from the `VITE_FARO_*` environment variables.
 *
 * @returns The config, or `undefined` when `VITE_FARO_URL` is unset/blank, which disables Faro
 *  entirely. Missing optional values fall back to sensible defaults.
 */
export function readFaroConfig(): FaroConfig | undefined {
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
