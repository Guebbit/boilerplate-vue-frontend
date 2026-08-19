import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for every products endpoint this module calls.
 *
 * Registered through the module manifest, so enabling the domain turns its contract validation on
 * and deleting the folder turns it off — no shared table to remember to edit. Path patterns are
 * anchored at both ends so one `[^/]+` segment can never absorb an adjacent literal segment
 * (`^/orders/[^/]+$` must not match `/orders/abc/invoice`); anchoring is also why the order rows
 * are registered in does not matter.
 *
 * Each row mirrors one `orvalMutator<...>(...)` call in `contracts/rest/index.ts`; `schema` is the
 * matching `<PascalCase-operationId>Response` export from `@api/schemas`, so the two can be diffed
 * by eye when an endpoint is added or removed.
 */
export const productsResponseSchemas: ResponseSchemaRoute[] = [
    { method: 'GET', pattern: /^\/products$/, schema: schemas.ListProductsResponse },
    { method: 'POST', pattern: /^\/products$/, schema: schemas.CreateProductResponse },
    { method: 'PUT', pattern: /^\/products$/, schema: schemas.UpdateProductResponse },
    { method: 'DELETE', pattern: /^\/products$/, schema: schemas.DeleteProductResponse },
    { method: 'POST', pattern: /^\/products\/search$/, schema: schemas.SearchProductsResponse },
    /* Before the `[^/]+` by-id row: `find()` returns the first match, and `categories` is a
     * static segment the wildcard would otherwise swallow — the same order rule the invoice row
     * follows in orders. */
    {
        method: 'GET',
        pattern: /^\/products\/categories$/,
        schema: schemas.GetCatalogueFacetsResponse
    },
    { method: 'GET', pattern: /^\/products\/[^/]+$/, schema: schemas.GetProductByIdResponse },
    { method: 'PUT', pattern: /^\/products\/[^/]+$/, schema: schemas.UpdateProductByIdResponse },
    {
        method: 'DELETE',
        pattern: /^\/products\/[^/]+$/,
        schema: schemas.DeleteProductByIdResponse
    },
    {
        method: 'DELETE',
        pattern: /^\/products\/[^/]+\/hard$/,
        schema: schemas.HardDeleteProductByIdResponse
    }
];
