/**
 * @module
 * Declares the response-envelope schema for every wishlist endpoint, keyed by method + URL
 * pattern, so `infrastructure/http` can validate a response against its contract by matching the
 * request that produced it.
 */
import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for every wishlist endpoint this module calls.
 *
 * Registered through the module manifest, so enabling the domain turns its contract validation on
 * and deleting the folder turns it off. Both rules every row obeys are stated once on
 * {@link ResponseSchemaRoute}.
 */
export const wishlistResponseSchemas: ResponseSchemaRoute[] = [
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
