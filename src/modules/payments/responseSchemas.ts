import * as schemas from '@api/schemas';
import type { IResponseSchemaRoute } from '@/infrastructure/http/responseSchemaMap';

/**
 * Response-envelope schemas for every payments endpoint this module calls. Registered through
 * the module manifest, exactly as the wishlist's are.
 */
export const paymentsResponseSchemas: IResponseSchemaRoute[] = [
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
