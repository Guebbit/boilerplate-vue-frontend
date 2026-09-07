/**
 * @module
 * Declares the response-envelope schema for every feedback endpoint, keyed by method + URL
 * pattern, so `infrastructure/http` can validate a response against its contract by matching the
 * request that produced it.
 */
import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for every feedback endpoint this module calls.
 *
 * Registered through the module manifest, so enabling the domain turns its contract validation on
 * and deleting the folder turns it off. Both rules every row obeys are stated once on
 * {@link ResponseSchemaRoute}.
 */
export const feedbackResponseSchemas: ResponseSchemaRoute[] = [
    {
        method: 'POST',
        pattern: /^\/feedback\/contact$/,
        schema: schemas.CreateFeedbackRequestResponse
    },
    { method: 'GET', pattern: /^\/feedback$/, schema: schemas.ListFeedbackRequestsResponse },
    /*
     * The DTO spelling of the row above — same question, same envelope, different transport, used
     * by the inbox's search form (`store.ts`'s `searchRequests`) for filters too broad to trust to
     * a URL. Before the `[^/]+` row for the house order rule: `search` is a static segment a by-id
     * wildcard would swallow, and today's wildcard is a PUT.
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
    },
    {
        method: 'DELETE',
        pattern: /^\/feedback\/[^/]+$/,
        schema: schemas.DeleteFeedbackRequestResponse
    }
];
