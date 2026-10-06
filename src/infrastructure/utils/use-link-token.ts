/**
 * @module
 * The one-time token a mailed link carries in its URL FRAGMENT (`#token=…`), and the cleanup that
 * keeps it from lingering there. A fragment is never sent to a server (RFC 3986 §3.5), so unlike a
 * query param it reaches no access log, proxy log or `Referer` header; the rest of the exposure
 * is this tab's own history and telemetry, which {@link useLinkTokenCleanup} closes.
 */
import { onMounted } from 'vue';
import type { Router, RouteLocationNormalizedLoaded } from 'vue-router';

/**
 * The `token` value in a route's fragment, or `''` when the link carries none.
 *
 * Read synchronously, before mount: the form state is seeded from it, and
 * {@link useLinkTokenCleanup} erases the fragment right after.
 *
 * @param route - The active route; its `hash` is `#token=…` for a mailed link.
 */
export const readLinkToken = (route: RouteLocationNormalizedLoaded): string =>
    // `URLSearchParams` does the percent-decoding the backend's `encodeURIComponent` needs undone.
    new URLSearchParams(route.hash.replace(/^#/, '')).get('token') ?? '';

/**
 * Whether a hash is a real in-page anchor (`#section`) rather than a credential (`#token=…`).
 * `=` cannot appear in a valid id selector, so its presence marks a key/value fragment; scrolling
 * to it would be a `querySelector` syntax error.
 *
 * @param hash - A route's `hash`, with its leading `#` (or `''`).
 */
export const isAnchorHash = (hash: string): boolean => hash !== '' && !hash.includes('=');

/**
 * Replaces the current route with itself, minus the fragment, right after mount — no new history
 * entry, so a `back` never lands the visitor on a page carrying a spent credential.
 *
 * The token must already be read into form state ({@link readLinkToken}) before this runs;
 * `router.replace` clears the URL, not the caller's own copy. It runs on mount, before the form's
 * submit, so the exchange request is sent with the URL already clean. `path`, not `name`, so the
 * locale prefix and any dynamic segments survive untouched.
 *
 * @param route - The active route, for the `path` to replace onto.
 * @param router - The active router, so a caller does not need its own `useRouter()` just for this.
 */
export const useLinkTokenCleanup = (route: RouteLocationNormalizedLoaded, router: Router): void => {
    onMounted(() => {
        void router.replace({ path: route.path, hash: '' });
    });
};
