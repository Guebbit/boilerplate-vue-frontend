/**
 * Route → response-schema lookup — `src/infrastructure/http/response-schema-map.ts`.
 *
 * This table is what lets `orvalMutator` validate a live response without being told which
 * operation it is serving. Two properties in it are load-bearing and easy to break silently:
 *
 *   **Anchoring.** Every pattern is anchored at both ends specifically so a `[^/]+` segment
 *   cannot absorb an adjacent literal one. Drop the `$` from `^/orders/[^/]+` and it starts
 *   matching `/orders/abc/invoice`, so an invoice response gets validated against the
 *   *order* schema — which fails, loudly, on a perfectly valid response.
 *
 *   **Order.** `find()` returns the first match, so `/orders/:id/invoice` must be listed before
 *   `/orders/:id`. Reordering the array is a plausible, well-intentioned edit (alphabetising it,
 *   say) that would break exactly one endpoint.
 *
 * Neither is visible in a code review of the table itself, which is what these tests are for.
 * The existing `http-validate-responses.spec.ts` covers the mutator's *behaviour*; this covers the
 * lookup it depends on.
 */

import { asStub } from '../../../support/stub';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
    registerResponseSchemas,
    resolveResponseSchema
} from '@/infrastructure/http/response-schema-map';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';
import { collectModuleResponseSchemas } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import * as schemas from '@api/schemas';

/*
 * Wire the modules in exactly as `src/main.ts` does.
 *
 * Most rows now live in `src/modules/<name>/response-schemas.ts` rather than in one central table,
 * so without this the lookup would answer `undefined` for every domain endpoint and this whole
 * file would pass by testing nothing. Assembling the real registry also means the openapi parity
 * check below now proves something stronger than it used to: that the enabled modules between them
 * still cover every documented operation.
 */
beforeAll(() => registerResponseSchemas(collectModuleResponseSchemas(enabledModules)));

/**
 * Looks a generated response schema up by its export name. Keeping the table string-only matters
 * beyond tidiness: Zod schemas are deep recursive objects, and letting `it.each` serialise one
 * into a test title exhausts the worker's heap.
 */
const schemaByName = (name: string) => asStub<Record<string, unknown>>(schemas)[name];

/** A representative ObjectId, for the parameterised routes. */
const ID = '65dc8a99604c307b702b5ccc';

/**
 * Every row of `routeSchemas`, in the same order as the source.
 *
 * The table is the module's whole contract — "each row mirrors one `orvalMutator<...>(...)` call
 * in `contracts/rest/index.ts`" — so it is asserted row by row rather than sampled. Spot-checking
 * a handful of routes leaves the other forty free to rot: a wrong schema on a rarely-hit endpoint
 * produces a contract error only for the user who happens to hit it.
 */
const ROUTES: [method: string, path: string, name: string][] = [
    ['GET', '/', 'GetHealthResponse'],
    ['GET', '/locales', 'GetLocalesResponse'],
    ['GET', '/locales/en', 'GetLocaleDictionaryResponse'],
    ['POST', '/locales', 'CreateLocaleResponse'],
    ['PUT', '/locales/es', 'UpdateLocaleResponse'],
    ['DELETE', '/locales/es', 'DeleteLocaleResponse'],
    ['GET', '/locales/es/messages', 'GetLocaleMessagesResponse'],
    ['GET', '/locales/es/entries', 'ListLocaleEntriesResponse'],
    ['POST', '/locales/es/entries', 'CreateLocaleEntryResponse'],
    ['PUT', '/locales/es/entries', 'ReplaceLocaleEntriesResponse'],
    ['PATCH', '/locales/es/entries', 'MergeLocaleEntriesResponse'],
    ['PUT', '/locales/es/entries/cart.title', 'UpdateLocaleEntryResponse'],
    ['DELETE', '/locales/es/entries/cart.title', 'DeleteLocaleEntryResponse'],
    ['GET', '/observability/events', 'GetObservabilityEventsResponse'],
    ['GET', '/observability/health', 'GetObservabilityHealthResponse'],
    ['GET', '/observability/metrics', 'GetObservabilityMetricsResponse'],
    ['GET', '/observability/metrics/overview', 'GetObservabilityMetricsOverviewResponse'],
    ['GET', '/observability/audit', 'GetObservabilityAuditLogsResponse'],
    ['GET', '/account', 'GetAccountResponse'],
    ['DELETE', '/account', 'RequestAccountDeleteResponse'],
    ['DELETE', '/account/delete-confirm', 'ConfirmAccountDeleteResponse'],
    ['POST', '/account/login', 'LoginResponse'],
    ['POST', '/account/signup', 'SignupResponse'],
    ['POST', '/account/reset', 'RequestPasswordResetResponse'],
    ['POST', '/account/reset-confirm', 'ConfirmPasswordResetResponse'],
    ['GET', '/account/refresh', 'RefreshTokenResponse'],
    ['PUT', '/account', 'UpdateAccountResponse'],
    ['POST', '/account/password', 'ChangePasswordResponse'],
    ['POST', '/account/logout', 'LogoutResponse'],
    ['GET', '/account/sessions', 'GetSessionsResponse'],
    ['DELETE', `/account/sessions/${ID}`, 'RevokeSessionResponse'],
    ['POST', '/account/verify-request', 'RequestEmailVerificationResponse'],
    ['POST', '/account/verify-confirm', 'ConfirmEmailVerificationResponse'],
    ['GET', '/account/addresses', 'GetAddressesResponse'],
    ['POST', '/account/addresses', 'AddAddressResponse'],
    ['PUT', `/account/addresses/${ID}`, 'UpdateAddressResponse'],
    ['DELETE', `/account/addresses/${ID}`, 'RemoveAddressResponse'],
    ['POST', '/account/logout-all', 'LogoutAllResponse'],
    ['DELETE', '/account/tokens/expired', 'DeleteExpiredTokensResponse'],
    ['GET', '/users', 'ListUsersResponse'],
    ['POST', '/users', 'CreateUserResponse'],
    ['PUT', '/users', 'UpdateUserResponse'],
    ['DELETE', '/users', 'DeleteUserResponse'],
    ['POST', '/users/search', 'SearchUsersResponse'],
    ['GET', `/users/${ID}`, 'GetUserByIdResponse'],
    ['PUT', `/users/${ID}`, 'UpdateUserByIdResponse'],
    ['DELETE', `/users/${ID}`, 'DeleteUserByIdResponse'],
    ['DELETE', `/users/${ID}/hard`, 'HardDeleteUserByIdResponse'],
    ['POST', '/feedback/contact', 'CreateFeedbackRequestResponse'],
    ['GET', '/feedback', 'ListFeedbackRequestsResponse'],
    ['PUT', `/feedback/${ID}`, 'UpdateFeedbackRequestStatusResponse'],
    ['GET', '/products', 'ListProductsResponse'],
    ['POST', '/products', 'CreateProductResponse'],
    ['PUT', '/products', 'UpdateProductResponse'],
    ['DELETE', '/products', 'DeleteProductResponse'],
    ['POST', '/products/search', 'SearchProductsResponse'],
    ['GET', `/products/${ID}`, 'GetProductByIdResponse'],
    ['PUT', `/products/${ID}`, 'UpdateProductByIdResponse'],
    ['DELETE', `/products/${ID}`, 'DeleteProductByIdResponse'],
    ['DELETE', `/products/${ID}/hard`, 'HardDeleteProductByIdResponse'],
    ['GET', '/cart', 'GetCartResponse'],
    ['POST', '/cart', 'UpsertCartItemResponse'],
    ['DELETE', '/cart', 'ClearCartResponse'],
    ['GET', '/cart/summary', 'GetCartSummaryResponse'],
    ['POST', '/cart/checkout', 'CheckoutResponse'],
    ['PUT', `/cart/${ID}`, 'UpdateCartItemByIdResponse'],
    ['DELETE', `/cart/${ID}`, 'RemoveCartItemResponse'],
    ['POST', `/cart/reorder/${ID}`, 'ReorderResponse'],
    ['GET', '/wishlist', 'GetWishlistResponse'],
    ['POST', '/wishlist', 'AddWishlistItemResponse'],
    ['DELETE', `/wishlist/${ID}`, 'RemoveWishlistItemResponse'],
    ['POST', `/wishlist/${ID}/move-to-cart`, 'MoveWishlistItemToCartResponse'],
    ['POST', '/payments/intent', 'CreatePaymentIntentResponse'],
    ['GET', `/payments/order/${ID}`, 'GetPaymentByOrderResponse'],
    ['POST', `/payments/order/${ID}/refund`, 'RefundPaymentByOrderResponse'],
    ['POST', `/payments/${ID}/confirm`, 'ConfirmPaymentResponse'],
    ['GET', '/delivery/methods', 'ListShippingMethodsResponse'],
    ['GET', `/delivery/order/${ID}`, 'GetShipmentByOrderResponse'],
    ['POST', '/delivery/advance', 'AdvanceCourierResponse'],
    ['GET', '/inventory/levels', 'ListInventoryLevelsResponse'],
    ['GET', '/inventory/movements', 'ListStockMovementsResponse'],
    ['POST', '/inventory/receipts', 'ReceiveStockResponse'],
    ['POST', '/inventory/adjustments', 'AdjustStockResponse'],
    ['POST', '/inventory/reservations/sweep', 'SweepReservationsResponse'],
    ['GET', '/orders', 'ListOrdersResponse'],
    ['POST', '/orders', 'CreateOrderResponse'],
    ['PUT', '/orders', 'UpdateOrderResponse'],
    ['DELETE', '/orders', 'DeleteOrderResponse'],
    ['POST', '/orders/search', 'SearchOrdersResponse'],
    ['GET', `/orders/${ID}/invoice`, 'GetOrderInvoiceResponse'],
    ['GET', `/orders/${ID}`, 'GetOrderByIdResponse'],
    ['PUT', `/orders/${ID}`, 'UpdateOrderByIdResponse'],
    ['DELETE', `/orders/${ID}`, 'DeleteOrderByIdResponse'],
    ['DELETE', `/orders/${ID}/hard`, 'HardDeleteOrderByIdResponse'],
    ['POST', `/orders/${ID}/cancel`, 'CancelOrderByIdResponse'],
    ['GET', '/products/categories', 'GetCatalogueFacetsResponse']
];

/**
 * Every operation `openapi.yaml` declares, as `METHOD /path` with the spec's `{param}`
 * placeholders substituted for a concrete value.
 *
 * Read from the spec rather than counted by hand. A hardcoded total only catches a table that
 * shrank, and says nothing about *which* operation is missing — an operation absent from the map
 * is one the generated client happily calls with its response left unvalidated.
 */
const SPEC_OPERATIONS: string[] = (() => {
    // `process.cwd()` is the project root under vitest; `import.meta.url` is not a file URL once
    // the suite has been through the jsdom transform.
    const spec = parse(readFileSync(path.resolve(process.cwd(), 'openapi.yaml'), 'utf8')) as {
        paths: Record<string, Record<string, unknown>>;
    };
    const methods = new Set(['get', 'post', 'put', 'delete', 'patch']);

    return Object.entries(spec.paths).flatMap(([path, item]) =>
        Object.keys(item)
            .filter((method) => methods.has(method))
            // `{id}`, `{productId}`, `{locale}` — the map matches a segment, not a name.
            .map((method) => `${method.toUpperCase()} ${path.replaceAll(/{[^}]+}/g, ID)}`)
    );
})();

describe('routeSchemas table', () => {
    it('covers every operation declared in openapi.yaml', () => {
        // `{locale}` is a language tag, not an ObjectId, but the pattern is `[^/]+` either way,
        // so substituting ID uniformly is enough to exercise the lookup.
        const unmapped = SPEC_OPERATIONS.filter((operation) => {
            const [method, path] = operation.split(' ');
            return !resolveResponseSchema(method, path);
        });

        // Named, not counted: the failure message is the list of operations whose responses go
        // unvalidated, which is the thing someone has to act on.
        expect(unmapped).toEqual([]);
    });

    it('has one table row per declared operation', () => {
        expect(ROUTES).toHaveLength(SPEC_OPERATIONS.length);
    });

    it.each(ROUTES)('%s %s resolves to %s', (method, path, name) => {
        expect(resolveResponseSchema(method, path)).toBe(schemaByName(name));
    });

    /**
     * Both anchors carry weight, and neither is visible in review.
     *
     * Without the trailing `$`, a pattern absorbs deeper paths — `^\/orders\/[^/]+` would claim
     * `/orders/:id/invoice`, validating an invoice against the order schema.
     *
     * Without the leading `^`, it matches anywhere in the string — `\/products$` would claim
     * `/admin/products`.
     *
     * Asserting one representative route per anchor would leave the other fifty unguarded, so
     * both are asserted for every row.
     */
    it.each(ROUTES)('%s %s does not also claim a deeper path', (method, path, name) => {
        expect(resolveResponseSchema(method, `${path}/deeper`)).not.toBe(schemaByName(name));
    });

    it.each(ROUTES)('%s %s does not also claim a prefixed path', (method, path, name) => {
        expect(resolveResponseSchema(method, `/prefixed${path}`)).not.toBe(schemaByName(name));
    });

    /**
     * `[^/]+` — one or more. A `*` would match an *empty* segment, so `/users/` (a trailing
     * slash, which browsers and proxies produce readily) would resolve to the by-id schema and
     * validate a 404 body against it.
     */
    it.each(ROUTES.filter(([, path]) => path.includes(ID)))(
        '%s %s requires a non-empty id segment',
        (method, path, name) => {
            expect(resolveResponseSchema(method, path.replace(ID, ''))).not.toBe(
                schemaByName(name)
            );
        }
    );

    it('maps no two rows to the same schema', () => {
        // Each response schema belongs to exactly one operation. A duplicate means a row was
        // copy-pasted and its schema never updated — the request would be validated against a
        // sibling endpoint's shape, which usually still parses and so fails silently.
        const names = ROUTES.map((route) => route[2]);

        expect(new Set(names).size).toBe(names.length);
    });
});

/*
 * Rows invented for the mechanism tests below.
 *
 * `resolveResponseSchema` is a matcher: method equality, anchored patterns, first match wins. None
 * of that is about which domains exist, and pinning it to `/products` would break a core spec on
 * the day the products module is deleted — the coupling `docs/theory/modules.md` describes.
 *
 * `/widgets` belongs to nobody and expresses every property, including the two traps the anchors
 * exist for: a literal sub-route (`/widgets/:id/detail`) that a `[^/]+` pattern would swallow, and
 * four methods sharing one path. The schema VALUES are arbitrary real ones — only their identity
 * is asserted, never their contents.
 */
const widgetRows: ResponseSchemaRoute[] = [
    { method: 'GET', pattern: /^\/widgets$/, schema: schemas.GetHealthResponse },
    { method: 'POST', pattern: /^\/widgets$/, schema: schemas.GetLocalesResponse },
    { method: 'PUT', pattern: /^\/widgets$/, schema: schemas.ListFeedbackRequestsResponse },
    { method: 'DELETE', pattern: /^\/widgets$/, schema: schemas.CreateFeedbackRequestResponse },
    {
        method: 'GET',
        pattern: /^\/widgets\/[^/]+\/detail$/,
        schema: schemas.GetLocaleDictionaryResponse
    },
    {
        method: 'GET',
        pattern: /^\/widgets\/[^/]+$/,
        schema: schemas.UpdateFeedbackRequestStatusResponse
    }
];

describe('resolveResponseSchema', () => {
    // Replaces the module rows for this block only; the parity table above re-registers the real
    // ones for itself.
    beforeEach(() => registerResponseSchemas(widgetRows));

    it('resolves a simple collection route', () => {
        expect(resolveResponseSchema('GET', '/widgets')).toBe(schemas.GetHealthResponse);
    });

    it('distinguishes methods on the same path', () => {
        // Four operations share `/widgets`; picking the wrong one would validate a creation
        // response against the list schema.
        expect(resolveResponseSchema('GET', '/widgets')).toBe(schemas.GetHealthResponse);
        expect(resolveResponseSchema('POST', '/widgets')).toBe(schemas.GetLocalesResponse);
        expect(resolveResponseSchema('PUT', '/widgets')).toBe(schemas.ListFeedbackRequestsResponse);
        expect(resolveResponseSchema('DELETE', '/widgets')).toBe(
            schemas.CreateFeedbackRequestResponse
        );
    });

    it('resolves a parameterised route', () => {
        expect(resolveResponseSchema('GET', `/widgets/${ID}`)).toBe(
            schemas.UpdateFeedbackRequestStatusResponse
        );
    });

    it('accepts a lowercase method', () => {
        // Axios does not normalise `config.method`; it is commonly lowercase.
        expect(resolveResponseSchema('get', '/widgets')).toBe(schemas.GetHealthResponse);
    });

    it('defaults to GET when no method is given', () => {
        expect(resolveResponseSchema(undefined, '/widgets')).toBe(schemas.GetHealthResponse);
    });

    it('keeps a nested literal segment distinct from an id segment', () => {
        // The anchoring property, stated as behaviour: `/widgets/:id/detail` and `/widgets/:id`
        // are different operations with different response shapes.
        const detail = resolveResponseSchema('GET', `/widgets/${ID}/detail`);
        const widget = resolveResponseSchema('GET', `/widgets/${ID}`);

        expect(detail).toBe(schemas.GetLocaleDictionaryResponse);
        expect(widget).toBe(schemas.UpdateFeedbackRequestStatusResponse);
        expect(detail).not.toBe(widget);
    });

    it('resolves the health route from the root path', () => {
        // A core row, always present whichever modules are enabled.
        expect(resolveResponseSchema('GET', '/')).toBe(schemas.GetHealthResponse);
    });

    it('does not let the root pattern match every path', () => {
        // `^\/$` — if the `$` were dropped, `/` would match everything and every response in the
        // app would be validated against the health schema.
        expect(resolveResponseSchema('GET', '/widgets')).not.toBe(schemas.GetLocalesResponse);
    });

    it('returns undefined for a route absent from the table', () => {
        // Fail-open by design: a missing entry is a maintenance gap, not proof the response is
        // wrong, so the caller warns instead of throwing.
        expect(resolveResponseSchema('GET', '/not-a-real-route')).toBeUndefined();
    });

    it('returns undefined when the path matches but the method does not', () => {
        expect(resolveResponseSchema('PATCH', '/widgets')).toBeUndefined();
    });

    it('ignores the query string when resolving', () => {
        expect(resolveResponseSchema('GET', '/widgets?page=2')).toBe(schemas.GetHealthResponse);
    });

    it('resolves through an absolute url', () => {
        expect(resolveResponseSchema('GET', 'https://api.example.com/widgets')).toBe(
            schemas.GetHealthResponse
        );
    });

    it('keeps the core rows regardless of what the modules register', () => {
        // `registerResponseSchemas` replaces the MODULE rows and keeps core's. `/locales` is
        // core's, so it must still resolve even though only `/widgets` was just registered.
        expect(resolveResponseSchema('GET', '/locales')).toBe(schemas.GetLocalesResponse);
    });
});
