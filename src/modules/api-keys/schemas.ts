/**
 * @module
 * Zod validation schema for the credential-mint form, with i18n-thunked error messages resolved
 * at parse time rather than at schema-definition time.
 */
import { z } from 'zod';
import { translate } from '@/infrastructure/i18n';
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
 * Validation schema for the optional expiry: refused when it names a moment already past. The
 * server accepts a past date and mints a credential that is dead on arrival — this floor exists
 * only here, client-side, to catch the mistake before the round trip.
 */
const apiKeyExpiresAtSchema = z
    .string()
    .optional()
    .refine((value) => !value || new Date(value).getTime() > Date.now(), {
        error: () => translate('api-keys-form.expires-at-past')
    });

/**
 * Validation schema for minting a credential: name, at least one permission, an optional expiry.
 */
export const apiKeyCreateSchema = z.object({
    name: apiKeyNameSchema,
    permissions: apiKeyPermissionsSchema,
    expiresAt: apiKeyExpiresAtSchema
});
