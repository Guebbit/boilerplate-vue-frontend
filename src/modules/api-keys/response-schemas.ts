/**
 * @module
 * Declares the response-envelope schema for every api-keys endpoint, keyed by method + URL
 * pattern, so `infrastructure/http` can validate a response against its contract by matching the
 * request that produced it.
 */
import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for every api-keys endpoint this module calls.
 *
 * Registered through the module manifest, so enabling the domain turns its contract validation on
 * and deleting the folder turns it off. Both rules every row obeys are stated once on
 * {@link ResponseSchemaRoute}.
 */
export const apiKeysResponseSchemas: ResponseSchemaRoute[] = [
    {
        method: 'GET',
        pattern: /^\/api-keys$/,
        schema: schemas.ListApiKeysResponse
    },
    {
        method: 'POST',
        pattern: /^\/api-keys$/,
        schema: schemas.MintApiKeyResponse
    },
    {
        method: 'DELETE',
        pattern: /^\/api-keys\/[^/]+$/,
        schema: schemas.RevokeApiKeyResponse
    }
];
