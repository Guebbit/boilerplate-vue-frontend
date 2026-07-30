/**
 * Builds a location pointing at the login page, remembering where the user was
 * headed so they can be sent back after authenticating.
 *
 * @param path - Full path the user was trying to reach, usually
 *  `route.fullPath`.
 * @param locale - Locale to force on the login route; omit to keep the one
 *  already resolved by the router.
 * @returns A named `Login` location carrying `?continue=<path>`, or without it
 *  when `path` points at an error page (nobody wants to be sent back there).
 */
export const loginContinueTo = (path: string, locale?: string) => {
    const parameters = locale ? { locale } : undefined;
    if (path.includes('error'))
        return {
            name: 'Login',
            params: parameters
        };

    return {
        name: 'Login',
        params: parameters,
        query: {
            continue: path
        }
    };
};
