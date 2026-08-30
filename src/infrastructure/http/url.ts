/**
 * @module
 * Single normalization function shared by the two consumers that must agree on which pathname a
 * URL maps to: strips scheme/host and query string, guarantees a leading slash.
 */

/**
 * The one rule for turning an Axios request URL into the pathname the HTTP layer matches on.
 *
 * A leaf both `response-schema-map.ts` (route patterns) and `refresh.ts` (the exclusion set) read,
 * so the two cannot recognise different sets of URLs.
 */

/**
 * Relative URLs are used as-is, absolute ones are parsed for their pathname, any query string is
 * dropped either way, and a missing leading slash is added.
 *
 * @param url - Request URL, absolute or relative, possibly `undefined`.
 * @returns A pathname beginning with `/`; `/` when there is no URL.
 */
export const toPathname = (url: string | undefined): string => {
    if (!url) return '/';
    const pathname =
        url.startsWith('http://') || url.startsWith('https://') ? new URL(url).pathname : url;
    const [withoutQuery] = pathname.split('?');
    return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
};
