/**
 * @module
 * Declares the response-envelope schema for every locales endpoint, keyed by method + URL
 * pattern, so `infrastructure/http` can validate a response against its contract by matching the
 * request that produced it.
 */
import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for every locales endpoint this module calls.
 *
 * Registered through the module manifest, so enabling the domain turns its contract validation on
 * and deleting the folder turns it off. Both rules every row obeys are stated once on
 * {@link ResponseSchemaRoute}.
 */
export const localesResponseSchemas: ResponseSchemaRoute[] = [
    { method: 'POST', pattern: /^\/locales$/, schema: schemas.CreateLocaleResponse },
    { method: 'PUT', pattern: /^\/locales\/[^/]+$/, schema: schemas.UpdateLocaleResponse },
    { method: 'DELETE', pattern: /^\/locales\/[^/]+$/, schema: schemas.DeleteLocaleResponse },
    {
        method: 'GET',
        pattern: /^\/locales\/[^/]+\/entries(\?.*)?$/,
        schema: schemas.ListLocaleEntriesResponse
    },
    {
        method: 'POST',
        pattern: /^\/locales\/[^/]+\/entries$/,
        schema: schemas.CreateLocaleEntryResponse
    },
    {
        method: 'PUT',
        pattern: /^\/locales\/[^/]+\/entries$/,
        schema: schemas.ReplaceLocaleEntriesResponse
    },
    {
        method: 'PATCH',
        pattern: /^\/locales\/[^/]+\/entries$/,
        schema: schemas.MergeLocaleEntriesResponse
    },
    {
        method: 'PUT',
        pattern: /^\/locales\/[^/]+\/entries\/[^/]+$/,
        schema: schemas.UpdateLocaleEntryResponse
    },
    {
        method: 'DELETE',
        pattern: /^\/locales\/[^/]+\/entries\/[^/]+$/,
        schema: schemas.DeleteLocaleEntryResponse
    },
    {
        method: 'GET',
        pattern: /^\/locales\/translations(?:\/[^/]+){2}$/,
        schema: schemas.GetEntityTranslationsResponse
    },
    {
        method: 'PATCH',
        pattern: /^\/locales\/translations(?:\/[^/]+){2}$/,
        schema: schemas.UpsertEntityTranslationsResponse
    }
];
