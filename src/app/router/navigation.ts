/**
 * @module
 * Sign-in/sign-up route names and helpers for building a "continue here after login" location.
 * The route names are plain strings, not typed route names, because the account module that
 * owns them may not be part of a given build — callers check `router.hasRoute` first.
 */
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
 * Builds a location pointing at an auth route, remembering where the user was headed so they can
 * be sent back after authenticating. Login and sign-up both use it, so the two carry the same
 * `?continue=`; the landing side (`usePostLoginRedirect`) is where the same-origin check lives.
 *
 * @param name - Which auth route to point at.
 * @param path - Full path the user was trying to reach, usually `route.fullPath`; `undefined`
 *  when there is none to remember.
 * @param locale - Locale to force on the route; omit to keep the one already resolved by the
 *  router.
 * @returns A location carrying `?continue=<path>`, or without it when there is no `path` or it
 *  points at an error page (nobody wants to be sent back there).
 */
const authContinueTo = (name: string, path: string | undefined, locale?: string) => {
    const parameters = locale ? { locale } : undefined;
    if (path === undefined || path.includes('error'))
        return {
            name,
            params: parameters
        };

    return {
        name,
        params: parameters,
        query: {
            continue: path
        }
    };
};

/**
 * Where an app-bar "Log in" / "Sign up" link should send the visitor back to afterwards.
 *
 * On a page that is not itself an auth page, that is the page. ON an auth page it is that page's
 * own `?continue=` (or nothing): the other auth page is a sibling, and returning to it would land
 * an authenticated visitor on a guests-only route. Not validated here: the landing side
 * (`usePostLoginRedirect`) accepts a same-origin relative path only, whatever the link carried.
 *
 * @param route - The current route.
 * @returns A path to remember, or `undefined` when there is none.
 */
export const returnPathOf = (route: {
    name?: unknown;
    fullPath: string;
    query: Record<string, unknown>;
}): string | undefined => {
    if (route.name !== SIGN_IN_ROUTE_NAME && route.name !== SIGN_UP_ROUTE_NAME)
        return route.fullPath;
    return typeof route.query.continue === 'string' ? route.query.continue : undefined;
};

/**
 * The login page, remembering where the user was headed. See {@link authContinueTo}.
 *
 * @param path - Full path the user was trying to reach, usually {@link returnPathOf}.
 * @param locale - Locale to force; omit to keep the resolved one.
 * @returns A location named {@link SIGN_IN_ROUTE_NAME}.
 */
export const loginContinueTo = (path: string | undefined, locale?: string) =>
    authContinueTo(SIGN_IN_ROUTE_NAME, path, locale);

/**
 * The sign-up page, remembering where the user was headed: "Sign up" carries the same
 * `?continue=` as "Log in", and the signup submit lands on it. See {@link authContinueTo}.
 *
 * @param path - Full path the user was trying to reach, usually {@link returnPathOf}.
 * @param locale - Locale to force; omit to keep the resolved one.
 * @returns A location named {@link SIGN_UP_ROUTE_NAME}.
 */
export const signUpContinueTo = (path: string | undefined, locale?: string) =>
    authContinueTo(SIGN_UP_ROUTE_NAME, path, locale);

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
