import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for every wishlist endpoint this module calls. Registered through
 * the module manifest; the rules every row obeys are on {@link ResponseSchemaRoute}.
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
