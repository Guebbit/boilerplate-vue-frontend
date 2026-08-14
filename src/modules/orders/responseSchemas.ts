import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/responseSchemaMap';

/**
 * Response-envelope schemas for every orders endpoint this module calls.
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
