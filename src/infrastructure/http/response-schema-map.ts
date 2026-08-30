/**
 * @module
 * Route table mapping method+URL patterns to Zod response schemas, checked by exact regex match
 * against the request's pathname. Core rows are baked in; modules extend the table at boot via
 * `registerResponseSchemas`.
 */

import * as zod from 'zod';
import * as schemas from '@api/schemas';
import { toPathname } from './url.ts';

/**
 * Maps every `orvalMutator` call site (method + URL) to the Zod schema validating its response, so
 * a live contract violation is caught without the mutator knowing which operation it serves.
 *
 * A row names a URL, so it is domain knowledge: each module declares its own in
 * `src/modules/<name>/response-schemas.ts` and contributes them through its manifest. This file owns
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
 *
 * ── The two rules every row obeys, wherever it lives ─────────────────────────────────────────
 *
 * 1. **Anchor both ends.** `^…$` is what stops a `[^/]+` segment absorbing an adjacent literal
 *    one: `^/orders/[^/]+$` must not match `/orders/abc/invoice`, or an invoice response is
 *    validated against the ORDER schema and fails on a perfectly valid body. Anchoring is also
 *    why the order rows are registered in does not matter.
 * 2. **Mirror one call site.** Each row corresponds to one `orvalMutator<…>(…)` in
 *    `contracts/rest/index.ts`, and `schema` is that operation's
 *    `<PascalCase-operationId>Response` export from `@api/schemas` — so the table and the client
 *    can be diffed by eye when an endpoint is added or removed.
 *
 * Both are checked by `tests/unit/infrastructure/http/response-schema-map.spec.ts`.
 */
export interface ResponseSchemaRoute {
    method: string;
    pattern: RegExp;
    schema: zod.ZodType;
}

/**
 * The rows no module claims.
 *
 * `GET /`, `/locales*` and the session's three `/account` calls are infrastructure — the health
 * probe, the language manifest and overrides `i18n/locale-overrides.ts` fetches, and the
 * whoami/refresh/logout-all that `infrastructure/stores/session.ts` needs — so they live at the
 * bottom tier with the code that calls them.
 *
 * It is also the shelf for a contract endpoint no frontend domain has claimed yet, so its
 * responses are validated from the first request rather than from the day a module appears. A row
 * parked here belongs to whichever module eventually claims the endpoint, and moves out with it.
 */
const coreRouteSchemas: ResponseSchemaRoute[] = [
    { method: 'GET', pattern: /^\/$/, schema: schemas.GetHealthResponse },
    /*
     * The session's own three. `infrastructure/session.ts` calls them to restore or end a session before any
     * domain is involved, so their validation cannot depend on a module being enabled — the account
     * module owns every OTHER `/account/*` route.
     */
    { method: 'GET', pattern: /^\/account$/, schema: schemas.GetAccountResponse },
    { method: 'GET', pattern: /^\/account\/refresh$/, schema: schemas.RefreshTokenResponse },
    { method: 'POST', pattern: /^\/account\/logout-all$/, schema: schemas.LogoutAllResponse },
    /*
     * The locale reads the BOOT PATH makes: the manifest and the per-language overrides
     * `i18n/locale-overrides.ts` fetches before any domain is involved, plus the API's own
     * dictionary — the offline-fallback read nothing calls yet. The admin surface that once sat
     * beside them here has moved into the `locales` module, exactly as this shelf promised it
     * would the day a module claimed it.
     *
     * The `{locale}` segment is a language tag rather than an ObjectId, which changes nothing:
     * every pattern matches a SEGMENT, not a name. What does matter is the `$` on the
     * single-segment row — without it `/locales/[^/]+` would swallow `/locales/es/entries` and
     * validate an entries page against the dictionary schema.
     */
    { method: 'GET', pattern: /^\/locales$/, schema: schemas.GetLocalesResponse },
    // A static segment the by-tag wildcard below would otherwise swallow: before it, always.
    { method: 'GET', pattern: /^\/locales\/tenants$/, schema: schemas.GetLocaleTenantsResponse },
    {
        method: 'GET',
        pattern: /^\/locales\/[^/]+\/messages$/,
        schema: schemas.GetLocaleMessagesResponse
    },
    {
        method: 'GET',
        pattern: /^\/locales\/[^/]+$/,
        schema: schemas.GetLocaleDictionaryResponse
    }
];

/**
 * Core rows plus whatever the enabled modules last registered.
 */
let routeSchemas: ResponseSchemaRoute[] = [...coreRouteSchemas];

/**
 * Install the enabled modules' response schemas.
 *
 * Replaces rather than appends, so calling it twice — a test re-wiring after `vi.resetModules()`,
 * a hot reload — leaves the table exactly as long as it should be instead of quietly doubling it.
 * The core rows are always kept.
 *
 * @param moduleRouteSchemas - every enabled module's rows, from `collectModuleResponseSchemas`
 */
export const registerResponseSchemas = (moduleRouteSchemas: ResponseSchemaRoute[]): void => {
    routeSchemas = [...coreRouteSchemas, ...moduleRouteSchemas];
};

/**
 * Looks up the response schema for a request, or `undefined` when the route isn't registered
 * (logged separately by the caller — see `orvalMutator`).
 */
export const resolveResponseSchema = (
    method: string | undefined,
    url: string | undefined
): zod.ZodType | undefined => {
    const pathname = toPathname(url);
    const upperMethod = (method ?? 'GET').toUpperCase();
    return routeSchemas.find(
        (route) => route.method === upperMethod && route.pattern.test(pathname)
    )?.schema;
};
