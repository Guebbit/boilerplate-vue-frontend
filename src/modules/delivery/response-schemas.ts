/**
 * @module
 * A flat list of {method, URL pattern, schema} rows, one per endpoint, matched by the HTTP
 * layer against every response this module's client functions receive.
 */

import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for every delivery endpoint this module calls. Registered through
 * the module manifest; the rules every row obeys are on {@link ResponseSchemaRoute}.
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
