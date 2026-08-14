import * as schemas from '@api/schemas';
import type { IResponseSchemaRoute } from '@/infrastructure/http/responseSchemaMap';

/**
 * Response-envelope schemas for every inventory endpoint this module calls. Registered through
 * the module manifest, exactly as the wishlist's are.
 */
export const inventoryResponseSchemas: IResponseSchemaRoute[] = [
    {
        method: 'GET',
        pattern: /^\/inventory\/movements(\?.*)?$/,
        schema: schemas.ListStockMovementsResponse
    },
    { method: 'POST', pattern: /^\/inventory\/restock$/, schema: schemas.RestockProductResponse }
];
