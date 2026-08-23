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
    /*
     * The DTO spelling of the row above — same question, same envelope, different transport.
     * `GET /feedback` used to take these filters in a JSON body; a browser cannot send one, so the
     * backend moved them here. Before the `[^/]+` row for the house order rule, though nothing
     * turns on it yet: `search` is a static segment a by-id wildcard would swallow, and today's
     * wildcard is a PUT.
     */
    {
        method: 'POST',
        pattern: /^\/feedback\/search$/,
        schema: schemas.SearchFeedbackRequestsResponse
    },
    {
        method: 'PUT',
        pattern: /^\/feedback\/[^/]+$/,
        schema: schemas.UpdateFeedbackRequestStatusResponse
    }
];
