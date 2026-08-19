import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for every payments endpoint this module calls. Registered through
 * the module manifest, exactly as the wishlist's are.
 */
export const paymentsResponseSchemas: ResponseSchemaRoute[] = [
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
        pattern: /^\/payments\/[^/]+\/confirm$/,
        schema: schemas.ConfirmPaymentResponse
    }
];
