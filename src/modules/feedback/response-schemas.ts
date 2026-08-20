import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for every feedback endpoint this module calls. Registered through
 * the module manifest; the rules every row obeys are on {@link ResponseSchemaRoute}.
 */
export const feedbackResponseSchemas: ResponseSchemaRoute[] = [
    {
        method: 'POST',
        pattern: /^\/feedback\/contact$/,
        schema: schemas.CreateFeedbackRequestResponse
    },
    { method: 'GET', pattern: /^\/feedback$/, schema: schemas.ListFeedbackRequestsResponse },
    {
        method: 'PUT',
        pattern: /^\/feedback\/[^/]+$/,
        schema: schemas.UpdateFeedbackRequestStatusResponse
    }
];
