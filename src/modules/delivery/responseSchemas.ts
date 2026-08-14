import * as schemas from '@api/schemas';
import type { IResponseSchemaRoute } from '@/infrastructure/http/responseSchemaMap';

/**
 * Response-envelope schemas for every delivery endpoint this module calls. Registered through
 * the module manifest, exactly as the wishlist's are.
 */
export const deliveryResponseSchemas: IResponseSchemaRoute[] = [
    {
        method: 'GET',
        pattern: /^\/delivery\/methods$/,
        schema: schemas.ListShippingMethodsResponse
    },
    {
        method: 'GET',
        pattern: /^\/delivery\/order\/[^/]+$/,
        schema: schemas.GetShipmentByOrderResponse
    },
    { method: 'POST', pattern: /^\/delivery\/advance$/, schema: schemas.AdvanceCourierResponse }
];
