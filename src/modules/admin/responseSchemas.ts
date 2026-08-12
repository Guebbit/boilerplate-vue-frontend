import * as schemas from '@api/schemas';
import type { IResponseSchemaRoute } from '@/infrastructure/http/responseSchemaMap';

/**
 * Response-envelope schemas for every admin endpoint this module calls.
 *
 * Registered through the module manifest, so enabling the domain turns its contract validation on
 * and deleting the folder turns it off — no shared table to remember to edit. Path patterns are
 * anchored at both ends so one `[^/]+` segment can never absorb an adjacent literal segment
 * (`^/orders/[^/]+$` must not match `/orders/abc/invoice`); anchoring is also why the order rows
 * are registered in does not matter.
 *
 * Each row mirrors one `orvalMutator<...>(...)` call in `contracts/rest/index.ts`; `schema` is the
 * matching `<PascalCase-operationId>Response` export from `@api/schemas`, so the two can be diffed
 * by eye when an endpoint is added or removed.
 */
export const adminResponseSchemas: IResponseSchemaRoute[] = [
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
