import * as schemas from '@api/schemas';
import type { ResponseSchemaRoute } from '@/infrastructure/http/response-schema-map';

/**
 * Response-envelope schemas for every account endpoint this module calls.
 *
 * Registered through the module manifest, so enabling the domain turns its contract validation on
 * and deleting the folder turns it off. Both rules every row obeys are stated once on
 * {@link ResponseSchemaRoute}.
 */
export const accountResponseSchemas: ResponseSchemaRoute[] = [
    { method: 'DELETE', pattern: /^\/account$/, schema: schemas.RequestAccountDeleteResponse },
    {
        method: 'DELETE',
        pattern: /^\/account\/delete-confirm$/,
        schema: schemas.ConfirmAccountDeleteResponse
    },
    { method: 'POST', pattern: /^\/account\/login$/, schema: schemas.LoginResponse },
    { method: 'POST', pattern: /^\/account\/signup$/, schema: schemas.SignupResponse },
    {
        method: 'POST',
        pattern: /^\/account\/reset$/,
        schema: schemas.RequestPasswordResetResponse
    },
    {
        method: 'POST',
        pattern: /^\/account\/reset-confirm$/,
        schema: schemas.ConfirmPasswordResetResponse
    },
    {
        method: 'DELETE',
        pattern: /^\/account\/tokens\/expired$/,
        schema: schemas.DeleteExpiredTokensResponse
    },
    { method: 'PUT', pattern: /^\/account$/, schema: schemas.UpdateAccountResponse },
    { method: 'POST', pattern: /^\/account\/password$/, schema: schemas.ChangePasswordResponse },
    { method: 'POST', pattern: /^\/account\/logout$/, schema: schemas.LogoutResponse },
    { method: 'GET', pattern: /^\/account\/sessions$/, schema: schemas.GetSessionsResponse },
    {
        method: 'DELETE',
        pattern: /^\/account\/sessions\/[^/]+$/,
        schema: schemas.RevokeSessionResponse
    },
    {
        method: 'POST',
        pattern: /^\/account\/verify-request$/,
        schema: schemas.RequestEmailVerificationResponse
    },
    {
        method: 'POST',
        pattern: /^\/account\/verify-confirm$/,
        schema: schemas.ConfirmEmailVerificationResponse
    },
    { method: 'GET', pattern: /^\/account\/addresses$/, schema: schemas.GetAddressesResponse },
    { method: 'POST', pattern: /^\/account\/addresses$/, schema: schemas.AddAddressResponse },
    {
        method: 'PUT',
        pattern: /^\/account\/addresses\/[^/]+$/,
        schema: schemas.UpdateAddressResponse
    },
    {
        method: 'DELETE',
        pattern: /^\/account\/addresses\/[^/]+$/,
        schema: schemas.RemoveAddressResponse
    }
];
