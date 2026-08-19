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
        method: 'POST',
        pattern: /^\/payments\/[^/]+\/confirm$/,
        schema: schemas.ConfirmPaymentResponse
    }
];
