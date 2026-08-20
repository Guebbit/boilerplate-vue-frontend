import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for every orders endpoint this module calls.
 *
 * Registered through the module manifest, so enabling the domain turns its contract validation on
 * and deleting the folder turns it off. Both rules every row obeys are stated once on
 * {@link ResponseSchemaRoute}.
 */
export const ordersResponseSchemas: ResponseSchemaRoute[] = [
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
    { method: 'DELETE', pattern: /^\/orders\/[^/]+$/, schema: schemas.DeleteOrderByIdResponse },
    {
        method: 'DELETE',
        pattern: /^\/orders\/[^/]+\/hard$/,
        schema: schemas.HardDeleteOrderByIdResponse
    },
    {
        method: 'POST',
        pattern: /^\/orders\/[^/]+\/cancel$/,
        schema: schemas.CancelOrderByIdResponse
    }
];
