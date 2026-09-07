/**
 * @module
 * Declares the response-envelope schema for every inventory endpoint, keyed by method + URL
 * pattern, so `infrastructure/http` can validate a response against its contract by matching the
 * request that produced it.
 */
import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for every inventory endpoint this module calls.
 *
 * Registered through the module manifest, so enabling the domain turns its contract validation on
 * and deleting the folder turns it off. Both rules every row obeys are stated once on
 * {@link ResponseSchemaRoute}.
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
