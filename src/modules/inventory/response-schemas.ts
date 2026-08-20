import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for every inventory endpoint this module calls. Registered through
 * the module manifest; the rules every row obeys are on {@link ResponseSchemaRoute}.
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
    // The sweep button on the ledger page drives this — the operator being one of the "outside
    // ticks" the contract designs for, alongside a production cron.
    {
        method: 'POST',
        pattern: /^\/inventory\/reservations\/sweep$/,
        schema: schemas.SweepReservationsResponse
    }
];
