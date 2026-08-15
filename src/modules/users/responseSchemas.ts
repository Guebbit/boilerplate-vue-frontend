import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/responseSchemaMap';

/**
 * Response-envelope schemas for every users endpoint this module calls.
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
