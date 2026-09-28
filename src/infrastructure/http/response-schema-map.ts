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

/**
 * Maps every `orvalMutator` call site (method + URL) to the Zod schema validating its response, so
 * a live contract violation is caught without the mutator knowing which operation it serves.
 *
 * A row names a URL, so it is domain knowledge: each module declares its own in
 * `src/modules/<name>/response-schemas.ts` and contributes them through its manifest. This file owns
 * the mechanism and the few rows belonging to no domain — so drift is structural, not clerical.
 *
 * `infrastructure` cannot import `@/modules`, so rows arrive by registration: `src/main.ts` calls
 * `loadResponseSchemas(collectModuleResponseSchemas(enabledModules))` after mount, gated behind
 * `shouldValidateResponses()`. Anything exercising `orvalMutator` outside the app must do the
 * same, or it measures an app nobody ships.
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
}

/**
 * The rows no module claims, built from the lazily-imported `@api/schemas` namespace once
 * {@link loadResponseSchemas} resolves it — a function rather than a top-level constant so this
 * file carries no static import of the schemas it names.
 *
 * `GET /`, `/locales*` and the session's three `/account` calls are infrastructure — the health
 * probe, the language manifest and overrides `i18n/locale-overrides.ts` fetches, and the
 * whoami/refresh/logout-all that `infrastructure/session.ts` needs — so they live at the
 * bottom tier with the code that calls them.
 *
 * It is also the shelf for a contract endpoint no frontend domain has claimed yet, so its
 * responses are validated from the first request rather than from the day a module appears. A row
 * parked here belongs to whichever module eventually claims the endpoint, and moves out with it.
 *
 * @param schemas - the generated `@api/schemas` namespace, already resolved
 */
const buildCoreRouteSchemas = (schemas: typeof import('@api/schemas')): ResponseSchemaRoute[] => [
    { method: 'GET', pattern: /^\/$/, schema: schemas.GetHealthResponse },
    /*
     * Anti-automation, parked here because no frontend domain claims it yet: the challenge widget
     * is rendered by whichever form is being guarded, not by a module of its own. Both are public
     * and both are read before a session exists, so validating them cannot wait for a module.
     */
    { method: 'GET', pattern: /^\/antibot\/config$/, schema: schemas.GetAntibotConfigResponse },
    {
        method: 'GET',
        pattern: /^\/antibot\/challenge$/,
        schema: schemas.GetAntibotChallengeResponse
    },
    /*
     * The session's own three. `infrastructure/session.ts` calls them to restore or end a session before any
     * domain is involved, so their validation cannot depend on a module being enabled — the account
     * module owns every OTHER `/account/*` route.
     */
    { method: 'GET', pattern: /^\/account$/, schema: schemas.GetAccountResponse },
    /*
     * The caller's own rules. Infrastructure like the three below it: the session store fetches
     * these for every identified viewer, and the shell greys out from them whether or not any
     * particular module is enabled.
     */
    { method: 'GET', pattern: /^\/account\/abilities$/, schema: schemas.GetMyAbilitiesResponse },
    { method: 'GET', pattern: /^\/account\/refresh$/, schema: schemas.RefreshTokenResponse },
    { method: 'POST', pattern: /^\/account\/logout-all$/, schema: schemas.LogoutAllResponse },
    /*
     * The locale reads the BOOT PATH makes: the manifest and the per-language overrides
     * `i18n/locale-overrides.ts` fetches before any domain is involved, plus the API's own
     * dictionary — the offline-fallback read nothing calls yet. The admin surface over the same
     * endpoints belongs to the `locales` module and its rows live there: this shelf holds only
     * what no module claims.
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
    },
    /*
     * The shop-scoped audit trail (`GET /observability/audit`'s counterpart for a shop role
     * rather than a platform one) — no module reads it yet, so it sits here until one does.
     */
    { method: 'GET', pattern: /^\/audit$/, schema: schemas.ListAuditEntriesResponse },
    /*
     * Outbound webhooks: subscriptions, the delivery log, replay, and the public event catalogue.
     * The backend admin surface is complete; no frontend module claims it yet (deferred — see the
     * backend's DECISIONS.md, "Frontend admin screen for webhooks"), so these rows sit on this
     * shelf until one does.
     */
    {
        method: 'GET',
        pattern: /^\/webhooks\/subscriptions$/,
        schema: schemas.ListWebhookSubscriptionsResponse
    },
    {
        method: 'POST',
        pattern: /^\/webhooks\/subscriptions$/,
        schema: schemas.CreateWebhookSubscriptionResponse
    },
    {
        method: 'PATCH',
        pattern: /^\/webhooks\/subscriptions\/[^/]+$/,
        schema: schemas.UpdateWebhookSubscriptionResponse
    },
    {
        method: 'DELETE',
        pattern: /^\/webhooks\/subscriptions\/[^/]+$/,
        schema: schemas.DeleteWebhookSubscriptionResponse
    },
    {
        method: 'GET',
        pattern: /^\/webhooks\/deliveries$/,
        schema: schemas.ListWebhookDeliveriesResponse
    },
    {
        method: 'POST',
        pattern: /^\/webhooks\/deliveries\/[^/]+\/replay$/,
        schema: schemas.ReplayWebhookDeliveryResponse
    },
    { method: 'GET', pattern: /^\/webhooks\/events$/, schema: schemas.ListWebhookEventsResponse }
];

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
