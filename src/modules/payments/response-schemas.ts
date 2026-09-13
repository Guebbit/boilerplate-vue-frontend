/**
 * @module
 * Declares the response-envelope schema for every payments endpoint, keyed by method + URL
 * pattern, so `infrastructure/http` can validate a response against its contract by matching the
 * request that produced it.
 */
import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for every payments endpoint this module calls.
 *
 * Registered through the module manifest, so enabling the domain turns its contract validation on
 * and deleting the folder turns it off. Both rules every row obeys are stated once on
 * {@link ResponseSchemaRoute}.
 */
export const paymentsResponseSchemas: ResponseSchemaRoute[] = [
    {
        method: 'GET',
        pattern: /^\/payments\/methods$/,
        schema: schemas.ListPaymentMethodsResponse
    },
    {
        method: 'POST',
        pattern: /^\/payments\/intent$/,
        schema: schemas.CreatePaymentIntentResponse
    },
    {
        method: 'GET',
        pattern: /^\/payments\/order\/[^/]+$/,
        schema: schemas.GetPaymentByOrderResponse
    },
    {
        // Before the confirm row would match: `/payments/order/x/refund` has the same shape as
        // `/payments/{id}/confirm` only in segment count, but the literal tail differs, so the
        // two cannot collide. Kept adjacent to make that readable rather than incidental.
        method: 'POST',
        pattern: /^\/payments\/order\/[^/]+\/refund$/,
        schema: schemas.RefundPaymentByOrderResponse
    },
    {
        method: 'POST',
        pattern: /^\/payments\/order\/[^/]+\/offline$/,
        schema: schemas.RecordOfflinePaymentResponse
    },
    {
        method: 'POST',
        pattern: /^\/payments\/[^/]+\/confirm$/,
        schema: schemas.ConfirmPaymentResponse
    },
    {
        method: 'POST',
        pattern: /^\/payments\/[^/]+\/sync$/,
        schema: schemas.SyncPaymentResponse
    }
];
