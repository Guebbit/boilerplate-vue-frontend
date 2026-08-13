import * as zod from 'zod';
import * as schemas from '@api/schemas';

/**
 * Maps every `orvalMutator` call site (method + URL) to the Zod schema validating its response, so
 * a live contract violation is caught without the mutator knowing which operation it serves.
 *
 * A row names a URL, so it is domain knowledge: each module declares its own in
 * `src/modules/<name>/responseSchemas.ts` and contributes them through its manifest. This file owns
 * the mechanism and the few rows belonging to no domain — so drift is structural, not clerical.
 *
 * `infrastructure` cannot import `@/modules`, so rows arrive by registration: `src/main.ts` calls
 * `registerResponseSchemas(collectModuleResponseSchemas(enabledModules))` before mount. Anything
 * exercising `orvalMutator` outside the app must do the same, or it measures an app nobody ships.
 *
 * Hand-written rather than derived from `contracts/rest/index.ts`: an `AxiosRequestConfig` does not
 * carry which operation issued it, and parsing the generated client in the browser is not an option.
 *
 * A missing row is not fatal — `resolveResponseSchema` returns `undefined` and the caller warns in
 * dev, because an unmapped route is a maintenance gap, not proof the response is wrong.
 */
export interface IResponseSchemaRoute {
    method: string;
    pattern: RegExp;
    schema: zod.ZodTypeAny;
}

/**
 * The rows no module claims.
 *
 * `GET /`, `/locales*` and the session's three `/account` calls are infrastructure — the health
 * probe, the runtime dictionary `infrastructure/localeApi.ts` fetches, and the whoami/refresh/logout-all that
 * `infrastructure/session.ts` needs — so they live at the bottom tier with the code that calls them.
 *
 * `/feedback*` and `/wishlist*` used to sit here under exactly that rule — contract endpoints no
 * frontend domain called yet, parked so their responses would be validated from the first
 * request. Both modules exist now and carry their own rows, which is the destiny this bottom
 * shelf exists to hand out.
 */
const coreRouteSchemas: IResponseSchemaRoute[] = [
    { method: 'GET', pattern: /^\/$/, schema: schemas.GetHealthResponse },
    /*
     * The session's own three. `infrastructure/session.ts` calls them to restore or end a session before any
     * domain is involved, so their validation cannot depend on a module being enabled — the account
     * module owns every OTHER `/account/*` route.
     */
    { method: 'GET', pattern: /^\/account$/, schema: schemas.GetAccountResponse },
    { method: 'GET', pattern: /^\/account\/refresh$/, schema: schemas.RefreshTokenResponse },
    { method: 'POST', pattern: /^\/account\/logout-all$/, schema: schemas.LogoutAllResponse },
    { method: 'GET', pattern: /^\/locales$/, schema: schemas.GetLocalesResponse },
    {
        method: 'GET',
        pattern: /^\/locales\/[^/]+$/,
        schema: schemas.GetLocaleDictionaryResponse
    }
];

/** Core rows plus whatever the enabled modules last registered. */
let routeSchemas: IResponseSchemaRoute[] = [...coreRouteSchemas];

/**
 * Install the enabled modules' response schemas.
 *
 * Replaces rather than appends, so calling it twice — a test re-wiring after `vi.resetModules()`,
 * a hot reload — leaves the table exactly as long as it should be instead of quietly doubling it.
 * The core rows are always kept.
 *
 * @param moduleRouteSchemas - every enabled module's rows, from `collectModuleResponseSchemas`
 */
export const registerResponseSchemas = (moduleRouteSchemas: IResponseSchemaRoute[]): void => {
    routeSchemas = [...coreRouteSchemas, ...moduleRouteSchemas];
};

/**
 * Extracts the pathname `orvalMutator` should match against: relative URLs are used as-is,
 * absolute ones (rare — every generated call passes a relative `url`) are parsed for their
 * pathname, and any query string is dropped either way.
 */
export const toPathname = (url: string | undefined): string => {
    if (!url) return '/';
    const pathname =
        url.startsWith('http://') || url.startsWith('https://') ? new URL(url).pathname : url;
    const [withoutQuery] = pathname.split('?');
    return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
};

/**
 * Looks up the response schema for a request, or `undefined` when the route isn't registered
 * (logged separately by the caller — see `orvalMutator`).
 */
export const resolveResponseSchema = (
    method: string | undefined,
    url: string | undefined
): zod.ZodTypeAny | undefined => {
    const pathname = toPathname(url);
    const upperMethod = (method ?? 'GET').toUpperCase();
    return routeSchemas.find(
        (route) => route.method === upperMethod && route.pattern.test(pathname)
    )?.schema;
};
