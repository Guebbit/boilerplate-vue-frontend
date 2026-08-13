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
 * `/feedback*` is different: those endpoints exist in the contract and **no frontend domain calls
 * them at all** yet. They are kept so that the day someone adds a contact form the response is
 * validated from the first request rather than from whenever the omission is noticed. Move them
 * into the module that claims them.
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
    },
    {
        method: 'POST',
        pattern: /^\/feedback\/contact$/,
        schema: schemas.CreateFeedbackRequestResponse
    },
    { method: 'GET', pattern: /^\/feedback$/, schema: schemas.ListFeedbackRequestsResponse },
    {
        method: 'PUT',
        pattern: /^\/feedback\/[^/]+$/,
        schema: schemas.UpdateFeedbackRequestStatusResponse
    },
    /*
     * `/wishlist*` sits here for the same reason `/feedback*` does: the contract declares it and
     * no frontend domain claims it yet. Move these four rows into the wishlist module when it
     * exists, exactly as the comment above prescribes for feedback.
     */
    { method: 'GET', pattern: /^\/wishlist$/, schema: schemas.GetWishlistResponse },
    { method: 'POST', pattern: /^\/wishlist$/, schema: schemas.AddWishlistItemResponse },
    {
        method: 'DELETE',
        pattern: /^\/wishlist\/[^/]+$/,
        schema: schemas.RemoveWishlistItemResponse
    },
    {
        method: 'POST',
        pattern: /^\/wishlist\/[^/]+\/move-to-cart$/,
        schema: schemas.MoveWishlistItemToCartResponse
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
