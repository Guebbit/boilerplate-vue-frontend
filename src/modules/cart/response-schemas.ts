import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for every cart endpoint this module calls.
 *
 * Registered through the module manifest, so enabling the domain turns its contract validation on
 * and deleting the folder turns it off. Both rules every row obeys are stated once on
 * {@link ResponseSchemaRoute}.
 */
export const cartResponseSchemas: ResponseSchemaRoute[] = [
    { method: 'GET', pattern: /^\/cart$/, schema: schemas.GetCartResponse },
    { method: 'POST', pattern: /^\/cart$/, schema: schemas.UpsertCartItemResponse },
    { method: 'DELETE', pattern: /^\/cart$/, schema: schemas.ClearCartResponse },
    { method: 'GET', pattern: /^\/cart\/summary$/, schema: schemas.GetCartSummaryResponse },
    { method: 'POST', pattern: /^\/cart\/checkout$/, schema: schemas.CheckoutResponse },
    { method: 'PUT', pattern: /^\/cart\/[^/]+$/, schema: schemas.UpdateCartItemByIdResponse },
    { method: 'DELETE', pattern: /^\/cart\/[^/]+$/, schema: schemas.RemoveCartItemResponse },
    {
        method: 'POST',
        pattern: /^\/cart\/reorder\/[^/]+$/,
        schema: schemas.ReorderResponse
    }
];
