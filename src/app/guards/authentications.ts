/**
 * @module
 * Route access control. `canAccess` is the single predicate both the router guard
 * (`enforceRouteAccess`) and the nav (`AppNavigation`) call, so what is reachable and what is
 * shown can never disagree. `tryRestoreAuth` silently rehydrates the session before it runs.
 */
import { storeToRefs } from 'pinia';
import { useSessionStore } from '@/infrastructure/session';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { getCookie } from '@guebbit/js-toolkit';
import { loginContinueTo } from '@/app/router/navigation';
import { translate } from '@/infrastructure/i18n';
import type { RouteLocationNormalized, RouteMeta } from 'vue-router';

/**
 * What a visitor must be to enter a route. Absent means public.
 *
 * - `guest` — anonymous only (login, signup, password reset): an authenticated visitor has no
 *   business on them and is sent home.
 * - `auth` — any authenticated visitor.
 * - `admin` — authenticated *and* admin.
 * - `translator` — authenticated, and either admin (who can reach anything) or holding the
 *   narrower `translations.read` key: the generic entity-translations screen, which a
 *   `translator` must reach without ever being handed `products.manage`.
 */
export type RouteAccess = 'guest' | 'auth' | 'admin' | 'translator';

/**
 * Declares `meta.access` so its VALUE is checked: `access: 'admni'` is a compile error.
 *
 * A misspelled KEY is not. vue-router's `RouteMeta extends Record<PropertyKey, unknown>`,
 * so `acces: 'admin'` type-checks and reads as a silently public page. What catches that is
 * each module's `tests/routes.spec.ts`, which pins every route's `meta.access` against a
 * hard-coded table.
 */
declare module 'vue-router' {
    // The name belongs to the library being augmented, not to this codebase: declaration
    // merging only works against the exact interface it declares.
    interface RouteMeta {
        access?: RouteAccess;
        /**
         * Dictionary key of the page's title, resolved into `document.title` after every
         * navigation (WCAG 2.4.2) and read out by the route announcer. Absent on the redirect
         * shells that never render a page.
         */
        title?: string;
    }
}

/**
 * Whether a visitor of the given standing may enter a route with the given requirement.
 *
 * The single expression of the access rule, so navigation and rendering cannot disagree: the
 * router calls it through {@link enforceRouteAccess} to decide whether to *allow* a page, and
 * `AppNavigation` calls it directly to decide whether to *show* the link to it. When those were
 * two separate lists, changing one silently produced either a visible link that bounced you or a
 * reachable page with no way to find it.
 *
 * @param access - The route's requirement, from `meta.access`. Absent means public.
 * @param visitor - The visitor's current standing, as the profile store reports it.
 *  `canReadTranslations` is optional so every existing call site (which has no reason to touch
 *  `translations.read`) keeps type-checking unchanged; omitted, it reads as `false`.
 * @returns `true` when the route may be entered and its link shown.
 */
export const canAccess = (
    access: RouteMeta['access'],
    visitor: { isAuth: boolean; isAdmin: boolean; canReadTranslations?: boolean }
): boolean => {
    if (!access) return true;
    if (access === 'guest') return !visitor.isAuth;
    if (access === 'auth') return visitor.isAuth;
    if (access === 'translator')
        return visitor.isAuth && (visitor.isAdmin || Boolean(visitor.canReadTranslations));
    return visitor.isAuth && visitor.isAdmin;
};

/**
 * Silently restores the in-memory access token via the refresh endpoint.
 *
 * Only attempted when the `isAuth` cookie is present — avoids a pointless
 * network round-trip for every guest page view. The cookie is written by
 * `setAccessToken`, which is the only thing that stores a token, so its presence
 * means a session existed on this browser at some point.
 *
 * @returns A promise that always resolves: already-authenticated and guest
 *  cases resolve immediately, and a failed refresh is swallowed.
 */
const restoreTokenIfNeeded = () => {
    const store = useSessionStore();
    if (store.accessToken || !getCookie('isAuth')) return Promise.resolve();
    return store.refreshToken().catch(() => undefined);
};

/**
 * Silently restores the session — token, then who it belongs to — without redirecting.
 *
 * Safe to use as a global guard or on public routes that show different content
 * depending on whether the visitor is an authenticated user or admin.
 *
 * @returns A promise resolving to `void` (a "proceed" verdict for the router)
 *  once the restore attempt has settled, successfully or not.
 */
export const tryRestoreAuth = (): Promise<void> => {
    const store = useSessionStore();
    return (
        restoreTokenIfNeeded()
            .then(() => {
                // The token alone is not a session: `isAuth`/`isAdmin` stay false until the
                // viewer is known, so a guard can never admit someone whose role it has not read.
                if (store.accessToken) return store.loadViewer();
            })
            // Discard the payload so the guard resolves to void (NavigationGuardReturn)
            .then(() => undefined)
            .catch(() => undefined)
    );
};

/**
 * Enforce a route's `meta.access`, notifying the visitor about any redirect.
 *
 * Mounted once globally rather than as a per-route `beforeEnter`, which is what makes
 * `meta.access` the only place a route's requirement is written down. It runs after
 * {@link tryRestoreAuth} in the same `beforeEach`, so the profile is already loaded and this
 * reads state instead of fetching it.
 *
 * @param to - Route being entered; supplies the requirement, the login `continue` target and the
 *  locale any redirect keeps.
 * @returns `undefined` to let the navigation through, or the location to redirect to. A blocked
 *  visitor is always told why — silently bouncing someone reads as a broken link.
 */
export const enforceRouteAccess = (to: RouteLocationNormalized) => {
    const { isAuth, isAdmin, canReadTranslations } = storeToRefs(useSessionStore());
    const visitor = {
        isAuth: isAuth.value,
        isAdmin: isAdmin.value,
        canReadTranslations: canReadTranslations.value
    };
    if (canAccess(to.meta.access, visitor)) return;

    const locale = to.params.locale as string;
    const { addMessage } = useNotificationsStore();

    // An authenticated visitor on a guests-only page: already where they wanted to be.
    if (to.meta.access === 'guest') {
        addMessage(translate('navigation.error-already-logged'));
        return { name: 'Home', params: { locale } };
    }

    // Anonymous: recoverable by logging in, so keep where they were going.
    if (!visitor.isAuth) {
        addMessage(translate('navigation.error-not-logged'));
        return loginContinueTo(to.fullPath, locale);
    }

    // Authenticated but not admin: logging in again cannot help, so no `continue` target.
    addMessage(translate('navigation.error-forbidden'));
    return { name: 'Home', params: { locale } };
};
