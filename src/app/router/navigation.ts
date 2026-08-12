/**
 * The route the app shell sends an unauthenticated visitor to.
 *
 * An app-shell constant naming a route a MODULE declares, which is the one place the shell still
 * reaches across the boundary. It is a string, so nothing type-checks it: with the account module
 * removed from `src/modules.ts` this resolves to nothing and a 401 would strand the visitor on a
 * dead navigation.
 *
 * Callers therefore check `router.hasRoute(SIGN_IN_ROUTE_NAME)` before using a location built here
 * and fall back to Home — see `signInLocation`. The alternative, a `signInRoute` field on the
 * manifest, was rejected: the registry's own rule is that a field only one module would ever fill
 * does not belong in the shared interface.
 */
export const SIGN_IN_ROUTE_NAME = 'Login';

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
 * The shell must keep working in a build that ships no account module — an internal tool behind a
 * corporate proxy, say. Sending a 401 to a route that does not exist would abort the navigation
 * and leave the visitor wherever they were, with nothing on screen to explain it.
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
