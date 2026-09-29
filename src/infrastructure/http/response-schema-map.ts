/**
 * @module
 * Route table mapping method+URL patterns to Zod response schemas, checked by exact regex match
 * against the request's pathname. Core rows and module rows both arrive through
 * {@link loadResponseSchemas} — never a static import of `@api/schemas` — so the ~350 KB Zod
 * contract (FA94) lands in its own lazy chunk instead of every entry bundle. See `main.ts` for
 * where that load is kicked off.
 */

import * as zod from 'zod';
import { toPathname } from './url.ts';
import { ROUTES } from '@api/routes';

/**
 * Maps every `orvalMutator` call site (method + URL) to the Zod schema validating its response, so
 * a live contract violation is caught without the mutator knowing which operation it serves.
 *
 * A row names a URL, so it is domain knowledge: each module declares its own in
 * `src/modules/<name>/response-schemas.ts` and contributes them through its manifest, by filtering
 * {@link routesForModules} down to the backend `x-module` name(s) it owns (FA55) — `orders` also
 * claims backend `invoicing`, `account` also claims backend `addresses`, since neither owns an FE
 * module of its own; see each module's own file for its exact list. This file owns the mechanism
 * and the few rows no domain claims — so drift is structural, not clerical.
 *
 * `infrastructure` cannot import `@/modules`, so rows arrive by registration: `src/main.ts` calls
 * `loadResponseSchemas(collectModuleResponseSchemas(enabledModules))` after mount, gated behind
 * `shouldValidateResponses()`. Anything exercising `orvalMutator` outside the app must do the
 * same, or it measures an app nobody ships.
 *
 * The method+pattern+schema-name triple is generated (`scripts/contracts/generate-route-table.ts`
 * → `contracts/rest/routes.ts` → `npm run gen:api`) straight from `openapi.yaml`: an
 * `AxiosRequestConfig` does not carry which operation issued it, so the SCHEMA still has to be
 * resolved here at runtime, but the METHOD, PATTERN and WHICH SCHEMA are no longer hand-typed,
 * and so can no longer drift out of step with the contract the way two hand copies once did.
 *
 * A missing row is not fatal — `resolveResponseSchema` returns `undefined` and the caller warns in
 * dev, because an unmapped route is a maintenance gap, not proof the response is wrong.
 *
 * Every pattern is anchored at both ends (`^…$`) — what stops a `[^/]+` segment absorbing an
 * adjacent literal one, so `^/orders/[^/]+$` cannot also match `/orders/abc/invoice` — which is
 * also why registration order never matters. Checked by
 * `tests/unit/infrastructure/http/response-schema-map.spec.ts`.
 */
export interface ResponseSchemaRoute {
    /**
     * HTTP method the row matches, uppercase.
     */
    method: string;
    /**
     * Matched against the request's pathname. A regex rather than a string because a row
     * stands for an endpoint shape, `/users/{id}` included, not one URL.
     */
    pattern: RegExp;
    /**
     * The envelope this endpoint must answer in. Parsed, never merely asserted.
     */
    schema: zod.ZodType;
    /**
     * The JSON request body this endpoint accepts, when it takes one. Parsed by the request
     * validator; `undefined` for a bodyless operation.
     */
    bodySchema?: zod.ZodType | undefined;
}

/**
 * Backend `x-module` names with no owning frontend module at all (FA55) — `antibot`'s public
 * config/challenge (rendered by whichever form is being guarded, not a module of its own) and
 * `audit-logs`' shop-scoped trail (`GET /audit`; no frontend screen reads it yet — deferred, see
 * the backend's own DECISIONS.md, "Frontend admin screen for webhooks" — audit-logs shares that
 * same deferred slot). A row here moves out the day some module's own file starts claiming it.
 */
const UNCLAIMED_BACKEND_MODULES: ReadonlySet<string> = new Set(['antibot', 'audit-logs']);

/**
 * Response schemas kept on the core shelf despite belonging to a module that DOES exist —
 * `infrastructure/session.ts` and the i18n boot path both need these validated before any module
 * is known to be enabled, so `account`'s and `locales`' own `response-schemas.ts` explicitly
 * exclude these same names rather than duplicating them.
 */
const SESSION_AND_BOOT_SCHEMA_NAMES: ReadonlySet<string> = new Set([
    'GetAccountResponse',
    'GetMyAbilitiesResponse',
    'RefreshTokenResponse',
    'LogoutAllResponse',
    'GetLocalesResponse',
    'GetLocaleTenantsResponse',
    'GetLocaleMessagesResponse',
    'GetLocaleDictionaryResponse'
]);

/**
 * Resolves a generated row's `schemaName` against the real, already-loaded schemas namespace.
 *
 * `schemaName` is a generated STRING key into `schemas` — a runtime lookup the compiler cannot
 * narrow on its own, since not every export on that namespace is a schema (a handful of generated
 * regex constants live alongside them). Two single casts, each narrowing what it alone can see:
 * the namespace to a generic index (every property IS at least an unknown value), then that one
 * indexed lookup to the `zod.ZodType` every `<Name>Response` export actually is.
 *
 * @param schemas - the generated `@api/schemas` namespace, already resolved
 * @param route - one row from {@link ROUTES}
 */
const resolveGeneratedSchema = (
    schemas: typeof import('@api/schemas'),
    route: (typeof ROUTES)[number]
): ResponseSchemaRoute => ({
    method: route.method,
    pattern: route.pattern,
    schema: (schemas as Record<string, unknown>)[route.schemaName] as zod.ZodType,
    // Same single narrowing as `schema` above, for the request half of the operation.
    bodySchema:
        route.bodySchemaName === undefined
            ? undefined
            : ((schemas as Record<string, unknown>)[route.bodySchemaName] as zod.ZodType)
});

/**
 * A module's own rows: every generated row whose backend `x-module` is in `ownedBackendModules`,
 * resolved against the real schemas namespace. The one call every `src/modules/<name>/
 * response-schemas.ts` makes (FA55) — see this file's own header for which modules own more than
 * their own name, and {@link SESSION_AND_BOOT_SCHEMA_NAMES} for the handful excluded even so.
 *
 * @param schemas - the generated `@api/schemas` namespace, already resolved
 * @param ownedBackendModules - every backend `x-module` name this frontend module claims
 */
export const routesForModules = (
    schemas: typeof import('@api/schemas'),
    ownedBackendModules: readonly string[]
): ResponseSchemaRoute[] =>
    ROUTES.filter(
        (route) =>
            route.module !== undefined &&
            ownedBackendModules.includes(route.module) &&
            !SESSION_AND_BOOT_SCHEMA_NAMES.has(route.schemaName)
    ).map((route) => resolveGeneratedSchema(schemas, route));

/**
 * The rows no module claims, built from the lazily-imported `@api/schemas` namespace once
 * {@link loadResponseSchemas} resolves it — a function rather than a top-level constant so this
 * file carries no static import of the schemas it names.
 *
 * Three groups: `GET /` (the health probe, owned by no backend module at all); every operation
 * under {@link UNCLAIMED_BACKEND_MODULES}; and {@link SESSION_AND_BOOT_SCHEMA_NAMES}, reserved
 * here on purpose even though their own backend module exists.
 *
 * @param schemas - the generated `@api/schemas` namespace, already resolved
 */
const buildCoreRouteSchemas = (schemas: typeof import('@api/schemas')): ResponseSchemaRoute[] =>
    ROUTES.filter(
        (route) =>
            route.module === undefined ||
            UNCLAIMED_BACKEND_MODULES.has(route.module) ||
            SESSION_AND_BOOT_SCHEMA_NAMES.has(route.schemaName)
    ).map((route) => resolveGeneratedSchema(schemas, route));

/**
 * Core rows plus whatever the enabled modules last registered. Empty until
 * {@link loadResponseSchemas} resolves — `resolveResponseSchema` fails open (`undefined`) for
 * that window, same as for any other unmapped route.
 */
let routeSchemas: ResponseSchemaRoute[] = [];

/**
 * Installs an already-resolved set of rows, replacing whatever was registered before.
 *
 * Replaces rather than appends, so calling it twice — a test re-wiring after `vi.resetModules()`,
 * a hot reload — leaves the table exactly as long as it should be instead of quietly doubling it.
 * Exported mainly for tests; `loadResponseSchemas` is the door every real caller uses, since it is
 * the one that also resolves the core rows.
 *
 * @param rows - every row to install, core and module alike
 */
export const registerResponseSchemas = (rows: ResponseSchemaRoute[]): void => {
    routeSchemas = rows;
};

/**
 * Whether {@link loadResponseSchemas} has resolved — starts `false`, same as {@link routeSchemas}
 * starts empty, since a request can reach `validateResponseAgainstContract` before `main.ts` ever
 * calls {@link loadResponseSchemas} (`mergeRemoteLocales()` fires its own `/locales` GET before
 * mount, well before the post-mount, not-awaited load below). Every route legitimately reads as
 * unmapped for that whole stretch, not because a route is unmapped — `validate.ts` reads this to
 * skip its "no schema mapped" warning until the table is actually in place, without silencing it
 * for a route that is genuinely never registered.
 */
let schemasReady = false;

/**
 * @returns whether {@link loadResponseSchemas} has resolved and installed its rows yet.
 */
export const isResponseSchemaTableLoading = (): boolean => !schemasReady;

/**
 * Resolves every response-schema row this app validates against — the core rows above plus each
 * enabled module's own — and installs them.
 *
 * The one place `@api/schemas` (and the zod it pulls in, ~350 KB together — FA94/FA-D2) is
 * imported: a single dynamic `import()`, shared by every module's own `response-schemas.ts`
 * loader through Vite's normal chunk deduplication, so the contract is fetched once no matter how
 * many rows need it. Callers gate this behind `shouldValidateResponses()` — there is no point
 * downloading the chunk for a build that will never parse a response through it.
 *
 * @param moduleResponseSchemaLoaders - every enabled module's lazy row loader
 *   (`collectModuleResponseSchemas`), not yet invoked
 */
export const loadResponseSchemas = (
    moduleResponseSchemaLoaders: (() => Promise<ResponseSchemaRoute[]>)[]
): Promise<void> =>
    Promise.all([
        import('@api/schemas').then(buildCoreRouteSchemas),
        Promise.all(moduleResponseSchemaLoaders.map((loadRows) => loadRows())).then((rows) =>
            rows.flat()
        )
    ]).then(([coreRows, moduleRows]) => {
        registerResponseSchemas([...coreRows, ...moduleRows]);
        schemasReady = true;
    });

/**
 * The row a request matches, by method and pathname.
 *
 * @param method - HTTP method; absent reads as GET, like axios.
 * @param url - the request URL, absolute or relative.
 */
const findRoute = (
    method: string | undefined,
    url: string | undefined
): ResponseSchemaRoute | undefined => {
    const pathname = toPathname(url);
    const upperMethod = (method ?? 'GET').toUpperCase();
    return routeSchemas.find(
        (route) => route.method === upperMethod && route.pattern.test(pathname)
    );
};

/**
 * Looks up the response schema for a request, or `undefined` when the route isn't registered
 * (logged separately by the caller — see `orvalMutator`).
 */
export const resolveResponseSchema = (
    method: string | undefined,
    url: string | undefined
): zod.ZodType | undefined => findRoute(method, url)?.schema;

/**
 * Looks up the JSON request-body schema for a request, or `undefined` when the route is not
 * registered or takes no JSON body. Same table, same match as {@link resolveResponseSchema}.
 */
export const resolveRequestSchema = (
    method: string | undefined,
    url: string | undefined
): zod.ZodType | undefined => findRoute(method, url)?.bodySchema;
