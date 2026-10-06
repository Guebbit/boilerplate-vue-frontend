/**
 * @module
 * Zod validation schema for the credential-mint form, with i18n-thunked error messages resolved
 * at parse time rather than at schema-definition time.
 */
import { z } from 'zod';
import { translate } from '@/i18n';
import { mintApiKeyBodyNameMax } from '@api/schemas';

/**
 * Validation schema for the credential's name: required, and bounded by the contract's own
 * maximum length, matching the `users` pattern of importing contract-declared bounds rather than
 * restating them.
 */
const apiKeyNameSchema = z
    .string()
    .min(1, { error: () => translate('api-keys-form.name-required') })
    .max(mintApiKeyBodyNameMax, { error: () => translate('api-keys-form.name-too-long') });

/**
 * Validation schema for the permissions combobox: at least one key, matching the contract's own
 * minimum.
 */
const apiKeyPermissionsSchema = z
    .array(z.string())
    .min(1, { error: () => translate('api-keys-form.permissions-required') });

/**
 * The latest expiry the server accepts: one calendar year from now, the same rule it applies at
 * mint (a request beyond it is a 422).
 *
 * @returns The instant in epoch milliseconds.
 */
const latestExpiry = (): number => {
    const limit = new Date();
    limit.setFullYear(limit.getFullYear() + 1);
    return limit.getTime();
};

/**
 * Validation schema for the expiry: REQUIRED (a credential that never expires is never rotated),
 * refused when it names a moment already past, and refused beyond a year ahead. The server accepts
 * a past date and mints a credential that is dead on arrival — that floor exists only here,
 * client-side, to catch the mistake before the round trip; the ceiling is the server's too.
 */
const apiKeyExpiresAtSchema = z
    .string({ error: () => translate('api-keys-form.expires-at-required') })
    .min(1, { error: () => translate('api-keys-form.expires-at-required') })
    .refine((value) => new Date(value).getTime() > Date.now(), {
        error: () => translate('api-keys-form.expires-at-past')
    })
    .refine((value) => new Date(value).getTime() <= latestExpiry(), {
        error: () => translate('api-keys-form.expires-at-too-far')
    });

/**
 * Validation schema for minting a credential: name, at least one permission, and an expiry.
 */
export const apiKeyCreateSchema = z.object({
    name: apiKeyNameSchema,
    permissions: apiKeyPermissionsSchema,
    expiresAt: apiKeyExpiresAtSchema
});
