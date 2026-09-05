/**
 * @module
 * Declares the response-envelope schema for every account endpoint, keyed by method + URL
 * pattern, so `infrastructure/http` can validate a response against its contract by matching the
 * request that produced it.
 */
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
    },
    { method: 'POST', pattern: /^\/account\/reauth$/, schema: schemas.ReauthResponse },
    { method: 'POST', pattern: /^\/account\/export$/, schema: schemas.ExportAccountDataResponse },
    /*
     * Listed BEFORE `/login/2fa` — `find()` returns the first match, and that pattern is not
     * anchored past `2fa`, so it would otherwise absorb `/login/2fa/send`. Same rule the
     * `/oauth/providers` ordering below already follows.
     */
    {
        method: 'POST',
        pattern: /^\/account\/login\/2fa\/send$/,
        schema: schemas.SendTwoFactorCodeResponse
    },
    {
        method: 'POST',
        pattern: /^\/account\/login\/2fa$/,
        schema: schemas.LoginTwoFactorResponse
    },
    { method: 'GET', pattern: /^\/account\/2fa$/, schema: schemas.GetTwoFactorStatusResponse },
    { method: 'DELETE', pattern: /^\/account\/2fa$/, schema: schemas.DisableTwoFactorResponse },
    {
        method: 'POST',
        pattern: /^\/account\/2fa\/backup-codes$/,
        schema: schemas.RegenerateBackupCodesResponse
    },
    {
        method: 'POST',
        pattern: /^\/account\/2fa\/methods\/[^/]+\/setup$/,
        schema: schemas.SetupTwoFactorMethodResponse
    },
    {
        method: 'POST',
        pattern: /^\/account\/2fa\/methods\/[^/]+\/confirm$/,
        schema: schemas.ConfirmTwoFactorMethodResponse
    },
    {
        method: 'DELETE',
        pattern: /^\/account\/2fa\/methods\/[^/]+$/,
        schema: schemas.RemoveTwoFactorMethodResponse
    },
    /*
     * Listed BEFORE the `:provider` pattern below — `find()` returns the first match, and
     * `/^\/account\/oauth\/[^/]+$/` would otherwise absorb `providers` as if it were a provider
     * name. Same rule the `/orders/:id/invoice` vs `/orders/:id` ordering above already follows.
     */
    {
        method: 'GET',
        pattern: /^\/account\/oauth\/providers$/,
        schema: schemas.ListOAuthProvidersResponse
    },
    /*
     * Both a browser-navigated redirect with no JSON body — `zod.void()` on the generated schema,
     * never actually validated in practice since neither is called through the axios client — but
     * still listed, so this table stays a complete map of the module's contract rather than one
     * with two silent gaps.
     */
    {
        method: 'GET',
        pattern: /^\/account\/oauth\/[^/]+$/,
        schema: schemas.StartOAuthLoginResponse
    },
    {
        method: 'GET',
        pattern: /^\/account\/oauth\/[^/]+\/callback$/,
        schema: schemas.CompleteOAuthLoginResponse
    }
];
