/**
 * @module
 * Route access control. `canAccess` is the single predicate both the router guard
 * (`enforceRouteAccess`) and the nav (`AppNavigation`) call, so what is reachable and what is
 * shown can never disagree. `tryRestoreAuth` silently rehydrates the session before it runs.
 */
import { storeToRefs } from 'pinia';
import { useSessionStore, type PermissionAction } from '@/infrastructure/session';
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
 *
 * Anything narrower is not a LEVEL. A screen that needs a permission declares the rule it needs
 * in `meta.can`, and the rule is evaluated against the server's own published rules — there is no
 * ladder of roles here, because the model behind it is not a ladder: a translator is not a lesser
 * admin, and a warehouse operator is not a greater customer.
 */
export type RouteAccess = 'guest' | 'auth';

/**
 * The permission a screen needs, as the pair CASL is asked: `[action, subject]`.
 *
 * A pair rather than a permission key string (`products.update`) because the client evaluates
 * RULES, and a rule is about a subject type — the key's own first segment is a plural family
 * (`products`) and the subject is the singular type (`Product`), so a key string would have to be
 * translated here against a table this repo has no copy of.
 *
 * The subject is a plain string on purpose: the closed list lives in
 * `shared/authorization-keys.yaml`, which this repo does not carry, and a hand-kept union here
 * would be a duplicate free to drift. A subject nobody declares simply matches no rule, so a typo
 * makes a screen unreachable — the fail-closed direction, and each module's `tests/routes.spec.ts`
 * pins the pair it expects.
 */
export type RoutePermission = readonly [action: PermissionAction, subject: string];

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
         * The rule this screen needs, checked against the caller's own published rules. Absent
         * means the screen needs no permission beyond whatever {@link RouteAccess} it declares.
         */
        can?: RoutePermission;
        /**
         * Dictionary key of the page's title, resolved into `document.title` after every
         * navigation (WCAG 2.4.2) and read out by the route announcer. Absent on the redirect
         * shells that never render a page.
         */
        title?: string;
    }
}

/**
 * Whether a visitor may enter a route, given both halves of its requirement.
 *
 * The single expression of the access rule, so navigation and rendering cannot disagree: the
 * router calls it through {@link enforceRouteAccess} to decide whether to *allow* a page, and
 * `AppNavigation` calls it directly to decide whether to *show* the link to it. When those were
 * two separate lists, changing one silently produced either a visible link that bounced you or a
 * reachable page with no way to find it.
 *
 * The two halves are ANDed, and `meta.can` implies a session: a rule is answered from rules the
 * server published for a caller it identified, so an anonymous visitor is refused before the
 * abilities are consulted at all.
 *
 * @param meta - the route's requirement: `access` (standing) and `can` (permission). Both absent
 *  means public.
 * @param visitor - `isAuth`, plus the `can` the session store answers rules with.
 * @returns `true` when the route may be entered and its link shown.
 */
export const canAccess = (
    meta: Pick<RouteMeta, 'access' | 'can'>,
    visitor: { isAuth: boolean; can: (action: PermissionAction, subject: string) => boolean }
): boolean => {
    if (meta.access === 'guest') return !visitor.isAuth;
    if (meta.access === 'auth' && !visitor.isAuth) return false;
    if (!meta.can) return true;

    return visitor.isAuth && visitor.can(meta.can[0], meta.can[1]);
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
                // The token alone is not a session: `isAuth` stays false and the abilities stay
                // empty until the viewer is known, so a guard can never admit someone whose rules
                // it has not read.
                if (store.accessToken) return store.loadViewer();
            })
            // Discard the payload so the guard resolves to void (NavigationGuardReturn)
            .then(() => undefined)
            .catch(() => undefined)
    );
};

/**
 * Enforce a route's `meta.access` and `meta.can`, notifying the visitor about any redirect.
 *
 * Mounted once globally rather than as a per-route `beforeEnter`, which is what makes the route
 * record the only place a screen's requirement is written down. It runs after
 * {@link tryRestoreAuth} in the same `beforeEach`, so the profile is already loaded and this
 * reads state instead of fetching it.
 *
 * @param to - Route being entered; supplies the requirement, the login `continue` target and the
 *  locale any redirect keeps.
 * @returns `undefined` to let the navigation through, or the location to redirect to. A blocked
 *  visitor is always told why — silently bouncing someone reads as a broken link.
 */
export const enforceRouteAccess = (to: RouteLocationNormalized) => {
    const session = useSessionStore();
    const { isAuth } = storeToRefs(session);
    // `can` is a plain function on the store, not a ref — `storeToRefs` drops actions, so it is
    // read off the store itself and stays bound to the live abilities.
    const visitor = { isAuth: isAuth.value, can: session.can };
    if (canAccess(to.meta, visitor)) return;

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

    // Authenticated but not permitted: logging in again cannot help, so no `continue` target.
    addMessage(translate('navigation.error-forbidden'));
    return { name: 'Home', params: { locale } };
};
