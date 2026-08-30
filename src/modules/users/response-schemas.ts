/**
 * @module
 * Declarative table mapping method+path patterns to the Zod response schema
 * that validates them — consumed by the response-schema-map infrastructure.
 */
import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for every users endpoint this module calls.
 *
 * Registered through the module manifest, so enabling the domain turns its contract validation on
 * and deleting the folder turns it off. Both rules every row obeys are stated once on
 * {@link ResponseSchemaRoute}.
 */
export const usersResponseSchemas: ResponseSchemaRoute[] = [
    { method: 'GET', pattern: /^\/users$/, schema: schemas.ListUsersResponse },
    { method: 'POST', pattern: /^\/users$/, schema: schemas.CreateUserResponse },
    { method: 'PUT', pattern: /^\/users$/, schema: schemas.UpdateUserResponse },
    { method: 'DELETE', pattern: /^\/users$/, schema: schemas.DeleteUserResponse },
    { method: 'POST', pattern: /^\/users\/search$/, schema: schemas.SearchUsersResponse },
    { method: 'GET', pattern: /^\/users\/[^/]+$/, schema: schemas.GetUserByIdResponse },
    { method: 'PUT', pattern: /^\/users\/[^/]+$/, schema: schemas.UpdateUserByIdResponse },
    { method: 'DELETE', pattern: /^\/users\/[^/]+$/, schema: schemas.DeleteUserByIdResponse },
    {
        method: 'DELETE',
        pattern: /^\/users\/[^/]+\/hard$/,
        schema: schemas.HardDeleteUserByIdResponse
    }
];
