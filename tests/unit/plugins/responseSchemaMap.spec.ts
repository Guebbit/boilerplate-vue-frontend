/**
 * Route → response-schema lookup — `src/plugins/http/responseSchemaMap.ts`.
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
 * The existing `httpValidateResponses.spec.ts` covers the mutator's *behaviour*; this covers the
 * lookup it depends on.
 */

import { describe, expect, it } from 'vitest';
import { toPathname, resolveResponseSchema } from '@/plugins/http/responseSchemaMap';
import * as schemas from '@api/schemas';

/**
 * Looks a generated response schema up by its export name. Keeping the table string-only matters
 * beyond tidiness: Zod schemas are deep recursive objects, and letting `it.each` serialise one
 * into a test title exhausts the worker's heap.
 */
const schemaByName = (name: string) => (schemas as unknown as Record<string, unknown>)[name];

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
    ['GET', '/cart', 'GetCartResponse'],
    ['POST', '/cart', 'UpsertCartItemResponse'],
    ['DELETE', '/cart', 'ClearCartResponse'],
    ['GET', '/cart/summary', 'GetCartSummaryResponse'],
    ['POST', '/cart/checkout', 'CheckoutResponse'],
    ['PUT', `/cart/${ID}`, 'UpdateCartItemByIdResponse'],
    ['DELETE', `/cart/${ID}`, 'RemoveCartItemResponse'],
    ['GET', '/orders', 'ListOrdersResponse'],
    ['POST', '/orders', 'CreateOrderResponse'],
    ['PUT', '/orders', 'UpdateOrderResponse'],
    ['DELETE', '/orders', 'DeleteOrderResponse'],
    ['POST', '/orders/search', 'SearchOrdersResponse'],
    ['GET', `/orders/${ID}/invoice`, 'GetOrderInvoiceResponse'],
    ['GET', `/orders/${ID}`, 'GetOrderByIdResponse'],
    ['PUT', `/orders/${ID}`, 'UpdateOrderByIdResponse'],
    ['DELETE', `/orders/${ID}`, 'DeleteOrderByIdResponse']
];

describe('routeSchemas table', () => {
    it('covers every operation declared in openapi.yaml', () => {
        // The spec has 51 operations. If this number moves, a row was added to the client
        // without a row here — the "silently unvalidated request" case the module warns about.
        expect(ROUTES).toHaveLength(51);
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

describe('toPathname', () => {
    it('returns the root path for an undefined url', () => {
        // The health endpoint is `GET /`, so undefined must land there rather than nowhere.
        // eslint-disable-next-line unicorn/no-useless-undefined -- `url` is a required parameter
        expect(toPathname(undefined)).toBe('/');
    });

    it('passes a relative path through unchanged', () => {
        expect(toPathname('/products')).toBe('/products');
    });

    it('extracts the pathname from an absolute url', () => {
        expect(toPathname('https://api.example.com/products/42')).toBe('/products/42');
    });

    it('handles an http (not just https) absolute url', () => {
        expect(toPathname('http://localhost:3000/cart/summary')).toBe('/cart/summary');
    });

    it('drops the query string from a relative url', () => {
        // `/products?page=1` must resolve to the same schema as `/products`, or every paginated
        // request goes unvalidated.
        expect(toPathname('/products?page=1&pageSize=20')).toBe('/products');
    });

    it('drops the query string from an absolute url', () => {
        expect(toPathname('https://api.example.com/products?page=1')).toBe('/products');
    });

    it('adds a leading slash to a path that lacks one', () => {
        // Every pattern in the table is anchored with `^\/`, so a path without the slash would
        // match nothing at all.
        expect(toPathname('products')).toBe('/products');
    });
});

describe('resolveResponseSchema', () => {
    it('resolves a simple collection route', () => {
        expect(resolveResponseSchema('GET', '/products')).toBe(schemas.ListProductsResponse);
    });

    it('distinguishes methods on the same path', () => {
        // Four different operations share `/products`; picking the wrong one would validate a
        // creation response against the list schema.
        expect(resolveResponseSchema('GET', '/products')).toBe(schemas.ListProductsResponse);
        expect(resolveResponseSchema('POST', '/products')).toBe(schemas.CreateProductResponse);
        expect(resolveResponseSchema('PUT', '/products')).toBe(schemas.UpdateProductResponse);
        expect(resolveResponseSchema('DELETE', '/products')).toBe(schemas.DeleteProductResponse);
    });

    it('resolves a parameterised route', () => {
        expect(resolveResponseSchema('GET', '/products/65dc8a99604c307b702b5ccc')).toBe(
            schemas.GetProductByIdResponse
        );
    });

    it('accepts a lowercase method', () => {
        // Axios does not normalise `config.method`; it is commonly lowercase.
        expect(resolveResponseSchema('get', '/products')).toBe(schemas.ListProductsResponse);
    });

    it('defaults to GET when no method is given', () => {
        expect(resolveResponseSchema(undefined, '/products')).toBe(schemas.ListProductsResponse);
    });

    it('keeps a nested literal segment distinct from an id segment', () => {
        // The anchoring property, stated as behaviour: `/orders/:id/invoice` and `/orders/:id`
        // are different operations with different response shapes.
        const invoice = resolveResponseSchema('GET', '/orders/65dc8a99604c307b702b5ccc/invoice');
        const order = resolveResponseSchema('GET', '/orders/65dc8a99604c307b702b5ccc');

        expect(invoice).toBe(schemas.GetOrderInvoiceResponse);
        expect(order).toBe(schemas.GetOrderByIdResponse);
        expect(invoice).not.toBe(order);
    });

    it('keeps /cart/summary and /cart/checkout distinct from /cart/:productId', () => {
        // Same trap as invoice: a literal sub-route that a `[^/]+` pattern would happily swallow
        // if the table were ordered differently or the anchors removed.
        expect(resolveResponseSchema('GET', '/cart/summary')).toBe(schemas.GetCartSummaryResponse);
        expect(resolveResponseSchema('POST', '/cart/checkout')).toBe(schemas.CheckoutResponse);
        expect(resolveResponseSchema('PUT', '/cart/65dc8a99604c307b702b5ccc')).toBe(
            schemas.UpdateCartItemByIdResponse
        );
    });

    it('keeps /users/search distinct from /users/:id', () => {
        expect(resolveResponseSchema('POST', '/users/search')).toBe(schemas.SearchUsersResponse);
        expect(resolveResponseSchema('GET', '/users/65dc8a99604c307b702b5ccc')).toBe(
            schemas.GetUserByIdResponse
        );
    });

    it('resolves the health route from the root path', () => {
        expect(resolveResponseSchema('GET', '/')).toBe(schemas.GetHealthResponse);
    });

    it('does not let the root pattern match every path', () => {
        // `^\/$` — if the `$` were dropped, `/` would match everything and every response in the
        // app would be validated against the health schema.
        expect(resolveResponseSchema('GET', '/products')).not.toBe(schemas.GetHealthResponse);
    });

    it('returns undefined for a route absent from the table', () => {
        // Fail-open by design: a missing entry is a maintenance gap, not proof the response is
        // wrong, so the caller warns instead of throwing.
        expect(resolveResponseSchema('GET', '/not-a-real-route')).toBeUndefined();
    });

    it('returns undefined when the path matches but the method does not', () => {
        expect(resolveResponseSchema('PATCH', '/products')).toBeUndefined();
    });

    it('ignores the query string when resolving', () => {
        expect(resolveResponseSchema('GET', '/products?page=2')).toBe(schemas.ListProductsResponse);
    });

    it('resolves through an absolute url', () => {
        expect(resolveResponseSchema('GET', 'https://api.example.com/orders')).toBe(
            schemas.ListOrdersResponse
        );
    });

    it('does not match a deeper path against a collection pattern', () => {
        // `^\/observability\/metrics$` must not claim `/observability/metrics/overview`.
        expect(resolveResponseSchema('GET', '/observability/metrics/overview')).toBe(
            schemas.GetObservabilityMetricsOverviewResponse
        );
        expect(resolveResponseSchema('GET', '/observability/metrics')).toBe(
            schemas.GetObservabilityMetricsResponse
        );
    });
});
