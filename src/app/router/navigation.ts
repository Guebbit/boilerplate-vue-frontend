/**
 * @module
 * Sign-in/sign-up route names and helpers for building a "continue here after login" location.
 * The route names are plain strings, not typed route names, because the account module that
 * owns them may not be part of a given build — callers check `router.hasRoute` first.
 */
import type { LocationQueryRaw, RouteParamsRawGeneric } from 'vue-router';

/**
 * The route the app shell sends an unauthenticated visitor to.
 *
 * A string naming a route a MODULE declares, so nothing type-checks it: with the account module
 * removed from `src/modules.ts` it resolves to nothing. Callers therefore check
 * `router.hasRoute(SIGN_IN_ROUTE_NAME)` first — see {@link signInLocation}.
 */
export const SIGN_IN_ROUTE_NAME = 'Login';

/**
 * The route the app shell offers a visitor who has no account yet.
 *
 * Same rule as {@link SIGN_IN_ROUTE_NAME}: the account module declares it, so callers ask
 * `router.hasRoute(SIGN_UP_ROUTE_NAME)` before offering it.
 */
export const SIGN_UP_ROUTE_NAME = 'Signup';

/**
 * Builds a location pointing at the login page, remembering where the user was
 * headed so they can be sent back after authenticating.
 *
 * @param path - Full path the user was trying to reach, usually
 *  `route.fullPath`.
 * @param locale - Locale to force on the login route; omit to keep the one
 *  already resolved by the router.
 * @returns A location named {@link SIGN_IN_ROUTE_NAME} carrying `?continue=<path>`, or without
 *  it when `path` points at an error page (nobody wants to be sent back there).
 */
export const loginContinueTo = (path: string, locale?: string) => {
    const parameters = locale ? { locale } : undefined;
    if (path.includes('error'))
        return {
            name: SIGN_IN_ROUTE_NAME,
            params: parameters
        };

    return {
        name: SIGN_IN_ROUTE_NAME,
        params: parameters,
        query: {
            continue: path
        }
    };
};

/**
 * {@link loginContinueTo}, degraded to Home when no sign-in route is registered.
 *
 * A build shipping no account module must keep working: pushing to a route that does not exist
 * aborts the navigation and leaves the visitor where they were with nothing to explain it.
 *
 * @param router - The active router, for the `hasRoute` check.
 * @param path - Full path the visitor was trying to reach.
 * @param locale - Locale to force; omit to keep the resolved one.
 * @returns A sign-in location, or a Home location when sign-in is not part of this build.
 */
export const signInLocation = (
    router: { hasRoute: (name: string) => boolean },
    path: string,
    locale?: string
) =>
    router.hasRoute(SIGN_IN_ROUTE_NAME)
        ? loginContinueTo(path, locale)
        : { name: 'Home', params: locale ? { locale } : undefined };

/**
 * A route location bound only when `name` actually resolves in THIS build — the general form of
 * {@link signInLocation}'s own guard, for the route names FA86 found with no `MODULE_EDGES`
 * coupling to back them: a module reaching a sibling's route by name is a dependency nothing else
 * can see, so `router.hasRoute` is the one check standing between it and `vue-router`'s own throw
 * on an unresolved name.
 *
 * A MODULE_EDGES-declared reach (`cart` → `products`'s `ProductsList`) does not need this: the
 * coupling is already reviewed and visible, so a missing route there is a deployment choice made
 * with the risk understood, not a silent landmine.
 *
 * @param router - The active router, for the `hasRoute` check.
 * @param name - The route name a sibling module owns.
 * @param parameters - The location's own path params, e.g. `{ id }`.
 * @param query - The location's own query params, e.g. `{ target: id }` — `AuditLog`'s own shape,
 *  which carries no path param at all. Both are omitted from the result along with `name` when
 *  the route does not resolve, since there is then nothing to link to at all.
 * @returns A location naming `name`, or `undefined` when this build ships no such route — a
 *  caller decides what "nowhere to go" means for it: hide the link, or fall back to a route it
 *  knows for certain exists (usually `Home`).
 */
export const linkIfRouted = (
    router: { hasRoute: (name: string) => boolean },
    name: string,
    parameters?: RouteParamsRawGeneric,
    query?: LocationQueryRaw
): { name: string; params?: RouteParamsRawGeneric; query?: LocationQueryRaw } | undefined =>
    router.hasRoute(name)
        ? { name, ...(parameters && { params: parameters }), ...(query && { query }) }
        : undefined;
