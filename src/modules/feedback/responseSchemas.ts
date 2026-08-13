import * as schemas from '@api/schemas';
import type { IResponseSchemaRoute } from '@/infrastructure/http/responseSchemaMap';

/**
 * Response-envelope schemas for every feedback endpoint this module calls. These three rows
 * lived with the core rows "so that the day someone adds a contact form the response is
 * validated from the first request" — this module is that day, exactly as the core comment
 * prescribed.
 */
export const feedbackResponseSchemas: IResponseSchemaRoute[] = [
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
