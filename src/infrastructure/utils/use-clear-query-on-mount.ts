/**
 * @module
 * Drops every query param from the current URL right after mount, without touching history (a
 * second `back` should not land the visitor back on a page carrying a spent credential).
 */
import { onMounted } from 'vue';
import type { Router, RouteLocationNormalizedLoaded } from 'vue-router';

/**
 * Replaces the current route with itself, minus the query string.
 *
 * A one-time email token (email verification, password reset, account deletion, email change) is
 * the only credential for its action, and it arrives in the URL — every pageview and every
 * observability event after mount would otherwise carry it to Umami, Faro and the browser history.
 * The value itself must already be read into form state before this runs; `router.replace` here
 * clears the URL, not the caller's own copy. `path`, not `name`, so the locale prefix and any
 * dynamic segments survive untouched — only the query is being dropped.
 *
 * @param route - The active route, for the `path` to replace onto.
 * @param router - The active router, so a caller does not need its own `useRouter()` just for this.
 */
export const useClearQueryOnMount = (
    route: RouteLocationNormalizedLoaded,
    router: Router
): void => {
    onMounted(() => {
        void router.replace({ path: route.path, query: {} });
    });
};
