/**
 * @module
 * Declares the response-envelope schema for every delivery endpoint, keyed by method + URL
 * pattern, so `infrastructure/http` can validate a response against its contract by matching the
 * request that produced it.
 */

import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for every delivery endpoint this module calls.
 *
 * Registered through the module manifest, so enabling the domain turns its contract validation on
 * and deleting the folder turns it off. Both rules every row obeys are stated once on
 * {@link ResponseSchemaRoute}.
 */
export const deliveryResponseSchemas: ResponseSchemaRoute[] = [
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
