/**
 * @module
 * Declares the response-envelope schema for every products endpoint, keyed by method + URL
 * pattern, so `infrastructure/http` can validate a response against its contract by matching the
 * request that produced it.
 */
import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for every products endpoint this module calls.
 *
 * Registered through the module manifest, so enabling the domain turns its contract validation on
 * and deleting the folder turns it off. Both rules every row obeys are stated once on
 * {@link ResponseSchemaRoute}.
 */
export const productsResponseSchemas: ResponseSchemaRoute[] = [
    { method: 'GET', pattern: /^\/products$/, schema: schemas.ListProductsResponse },
    { method: 'POST', pattern: /^\/products$/, schema: schemas.CreateProductResponse },
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
    // PATCH, not PUT: the edit endpoint MERGES rather than replaces, and the choice lives in the
    // method.
    { method: 'PATCH', pattern: /^\/products\/[^/]+$/, schema: schemas.UpdateProductByIdResponse },
    {
        method: 'DELETE',
        pattern: /^\/products\/[^/]+$/,
        schema: schemas.DeleteProductByIdResponse
    },
    {
        method: 'GET',
        pattern: /^\/products\/[^/]+\/admin$/,
        schema: schemas.GetProductAdminResponse
    },
    {
        method: 'DELETE',
        pattern: /^\/products\/[^/]+\/hard$/,
        schema: schemas.HardDeleteProductByIdResponse
    }
];
