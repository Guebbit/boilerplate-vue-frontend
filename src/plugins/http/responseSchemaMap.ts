import * as zod from 'zod';
import * as schemas from '@api/schemas';

/**
 * Maps every `orvalMutator` call site (method + URL) to the Zod schema that validates its
 * response envelope, so `orvalMutator` can catch a live contract violation without being told
 * which operation it is serving.
 *
 * Hand-maintained rather than derived at runtime from `contracts/rest/index.ts` (there is no
 * cheap way to recover "which operation issued this request" from an `AxiosRequestConfig`
 * alone, and parsing the generated client's source in the browser is not an option). Each row
 * mirrors one `orvalMutator<...>(...)` call in that file; `schema` is the matching
 * `<PascalCase-operationId>Response` export from `@api/schemas` — orval's zod codegen names
 * every operation response `PascalCase(operationId) + 'Response'`, so the two files can be
 * diffed by eye when an endpoint is added or removed.
 *
 * If this list and `contracts/rest/index.ts` drift (a new endpoint added to one, not the
 * other), the worst case is a silently-unvalidated request — `resolveResponseSchema` logs a
 * dev-only warning rather than throwing, since a missing map entry is a maintenance gap, not
 * proof the response itself is wrong.
 */
interface IRouteSchema {
    method: string;
    pattern: RegExp;
    schema: zod.ZodTypeAny;
}

// Path patterns are anchored on both ends so a single `[^/]+` segment can never absorb an
// adjacent literal segment (e.g. `^/orders/[^/]+$` must not match `/orders/abc/invoice`).
const routeSchemas: IRouteSchema[] = [
    { method: 'GET', pattern: /^\/$/, schema: schemas.GetHealthResponse },
    {
        method: 'GET',
        pattern: /^\/observability\/events$/,
        schema: schemas.GetObservabilityEventsResponse
    },
    {
        method: 'GET',
        pattern: /^\/observability\/health$/,
        schema: schemas.GetObservabilityHealthResponse
    },
    {
        method: 'GET',
        pattern: /^\/observability\/metrics$/,
        schema: schemas.GetObservabilityMetricsResponse
    },
    {
        method: 'GET',
        pattern: /^\/observability\/metrics\/overview$/,
        schema: schemas.GetObservabilityMetricsOverviewResponse
    },
    {
        method: 'GET',
        pattern: /^\/observability\/audit$/,
        schema: schemas.GetObservabilityAuditLogsResponse
    },
    { method: 'GET', pattern: /^\/locales$/, schema: schemas.GetLocalesResponse },
    {
        method: 'GET',
        pattern: /^\/locales\/[^/]+$/,
        schema: schemas.GetLocaleDictionaryResponse
    },
    { method: 'GET', pattern: /^\/account$/, schema: schemas.GetAccountResponse },
    { method: 'DELETE', pattern: /^\/account$/, schema: schemas.RequestAccountDeleteResponse },
    {
        method: 'DELETE',
        pattern: /^\/account\/delete-confirm$/,
        schema: schemas.ConfirmAccountDeleteResponse
    },
    { method: 'POST', pattern: /^\/account\/login$/, schema: schemas.LoginResponse },
    { method: 'POST', pattern: /^\/account\/signup$/, schema: schemas.SignupResponse },
    {
        method: 'POST',
        pattern: /^\/account\/reset$/,
        schema: schemas.RequestPasswordResetResponse
    },
    {
        method: 'POST',
        pattern: /^\/account\/reset-confirm$/,
        schema: schemas.ConfirmPasswordResetResponse
    },
    { method: 'GET', pattern: /^\/account\/refresh$/, schema: schemas.RefreshTokenResponse },
    { method: 'POST', pattern: /^\/account\/logout-all$/, schema: schemas.LogoutAllResponse },
    {
        method: 'DELETE',
        pattern: /^\/account\/tokens\/expired$/,
        schema: schemas.DeleteExpiredTokensResponse
    },
    { method: 'GET', pattern: /^\/users$/, schema: schemas.ListUsersResponse },
    { method: 'POST', pattern: /^\/users$/, schema: schemas.CreateUserResponse },
    { method: 'PUT', pattern: /^\/users$/, schema: schemas.UpdateUserResponse },
    { method: 'DELETE', pattern: /^\/users$/, schema: schemas.DeleteUserResponse },
    { method: 'POST', pattern: /^\/users\/search$/, schema: schemas.SearchUsersResponse },
    { method: 'GET', pattern: /^\/users\/[^/]+$/, schema: schemas.GetUserByIdResponse },
    { method: 'PUT', pattern: /^\/users\/[^/]+$/, schema: schemas.UpdateUserByIdResponse },
    { method: 'DELETE', pattern: /^\/users\/[^/]+$/, schema: schemas.DeleteUserByIdResponse },
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
    { method: 'GET', pattern: /^\/products$/, schema: schemas.ListProductsResponse },
    { method: 'POST', pattern: /^\/products$/, schema: schemas.CreateProductResponse },
    { method: 'PUT', pattern: /^\/products$/, schema: schemas.UpdateProductResponse },
    { method: 'DELETE', pattern: /^\/products$/, schema: schemas.DeleteProductResponse },
    { method: 'POST', pattern: /^\/products\/search$/, schema: schemas.SearchProductsResponse },
    { method: 'GET', pattern: /^\/products\/[^/]+$/, schema: schemas.GetProductByIdResponse },
    { method: 'PUT', pattern: /^\/products\/[^/]+$/, schema: schemas.UpdateProductByIdResponse },
    {
        method: 'DELETE',
        pattern: /^\/products\/[^/]+$/,
        schema: schemas.DeleteProductByIdResponse
    },
    { method: 'GET', pattern: /^\/cart$/, schema: schemas.GetCartResponse },
    { method: 'POST', pattern: /^\/cart$/, schema: schemas.UpsertCartItemResponse },
    { method: 'DELETE', pattern: /^\/cart$/, schema: schemas.ClearCartResponse },
    { method: 'GET', pattern: /^\/cart\/summary$/, schema: schemas.GetCartSummaryResponse },
    { method: 'POST', pattern: /^\/cart\/checkout$/, schema: schemas.CheckoutResponse },
    { method: 'PUT', pattern: /^\/cart\/[^/]+$/, schema: schemas.UpdateCartItemByIdResponse },
    { method: 'DELETE', pattern: /^\/cart\/[^/]+$/, schema: schemas.RemoveCartItemResponse },
    { method: 'GET', pattern: /^\/orders$/, schema: schemas.ListOrdersResponse },
    { method: 'POST', pattern: /^\/orders$/, schema: schemas.CreateOrderResponse },
    { method: 'PUT', pattern: /^\/orders$/, schema: schemas.UpdateOrderResponse },
    { method: 'DELETE', pattern: /^\/orders$/, schema: schemas.DeleteOrderResponse },
    { method: 'POST', pattern: /^\/orders\/search$/, schema: schemas.SearchOrdersResponse },
    {
        method: 'GET',
        pattern: /^\/orders\/[^/]+\/invoice$/,
        schema: schemas.GetOrderInvoiceResponse
    },
    { method: 'GET', pattern: /^\/orders\/[^/]+$/, schema: schemas.GetOrderByIdResponse },
    { method: 'PUT', pattern: /^\/orders\/[^/]+$/, schema: schemas.UpdateOrderByIdResponse },
    { method: 'DELETE', pattern: /^\/orders\/[^/]+$/, schema: schemas.DeleteOrderByIdResponse }
];

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
 * Looks up the response schema for a request, or `undefined` when the route isn't in the
 * table above (logged separately by the caller — see `orvalMutator`).
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
