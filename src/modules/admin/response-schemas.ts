/**
 * @module
 * Maps each admin endpoint's method + path pattern to the Zod schema its response envelope must
 * satisfy — one row per call this module makes, read by the response-schema-map middleware.
 */
import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for every admin endpoint this module calls.
 *
 * Registered through the module manifest, so enabling the domain turns its contract validation on
 * and deleting the folder turns it off. Both rules every row obeys are stated once on
 * {@link ResponseSchemaRoute}.
 */
export const adminResponseSchemas: ResponseSchemaRoute[] = [
    {
        method: 'GET',
        pattern: /^\/observability\/events$/,
        schema: schemas.GetObservabilityEventsResponse
    },
    {
        method: 'GET',
        pattern: /^\/observability\/health$/,
        schema: schemas.GetObservabilityHealthResponse
    },
    {
        method: 'GET',
        pattern: /^\/observability\/metrics$/,
        schema: schemas.GetObservabilityMetricsResponse
    },
    {
        method: 'GET',
        pattern: /^\/observability\/metrics\/overview$/,
        schema: schemas.GetObservabilityMetricsOverviewResponse
    },
    {
        method: 'GET',
        pattern: /^\/observability\/audit$/,
        schema: schemas.GetObservabilityAuditLogsResponse
    }
];
