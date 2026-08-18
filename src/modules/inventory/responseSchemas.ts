import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/responseSchemaMap';

/**
 * Response-envelope schemas for every inventory endpoint this module calls. Registered through
 * the module manifest, exactly as the wishlist's are.
 */
export const inventoryResponseSchemas: ResponseSchemaRoute[] = [
    {
        method: 'GET',
        pattern: /^\/inventory\/levels(\?.*)?$/,
        schema: schemas.ListInventoryLevelsResponse
    },
    {
        method: 'GET',
        pattern: /^\/inventory\/movements(\?.*)?$/,
        schema: schemas.ListStockMovementsResponse
    },
    { method: 'POST', pattern: /^\/inventory\/receipts$/, schema: schemas.ReceiveStockResponse },
    { method: 'POST', pattern: /^\/inventory\/adjustments$/, schema: schemas.AdjustStockResponse },
    /*
     * The sweep is a maintenance call this app never makes — a scheduler does. Registered anyway,
     * because the module owns `/inventory/*` and a route the contract declares but nothing maps
     * is a response that would ship unvalidated the day something starts calling it.
     */
    {
        method: 'POST',
        pattern: /^\/inventory\/reservations\/sweep$/,
        schema: schemas.SweepReservationsResponse
    }
];
