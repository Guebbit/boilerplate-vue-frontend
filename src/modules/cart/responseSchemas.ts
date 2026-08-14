import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/responseSchemaMap';

/**
 * Response-envelope schemas for every cart endpoint this module calls.
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
