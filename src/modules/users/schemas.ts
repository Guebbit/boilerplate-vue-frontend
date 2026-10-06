/**
 * @module
 * Zod validation schemas for the user forms, with i18n-thunked error messages
 * resolved at parse time rather than at schema-definition time.
 */
import { z } from 'zod';
import { translate } from '@/i18n';
import { signupBodyUsernameMin, signupBodyPasswordMin, signupBodyPasswordMax } from '@api/schemas';

/**
 * Validation schema for an email address.
 */
const usersEmailSchema = z.email({ error: () => translate('users-form.email-invalid') });

/**
 * Validation schema for a username, enforcing the minimum length declared by the API contract.
 */
const usersUsernameSchema = z
    .string()
    .min(signupBodyUsernameMin, { error: () => translate('users-form.username-min') });

/**
 * Validation schema for a password: the contract's length bounds and nothing more. No composition
 * rules (NIST SP 800-63B-4): a long passphrase is a good password, and what keeps a weak one out is
 * the server's breached-password check, mirrored here as a non-blocking hint.
 */
export const usersPasswordSchema = z
    .string()
    .min(signupBodyPasswordMin, { error: () => translate('users-form.password-min') })
    .max(signupBodyPasswordMax, { error: () => translate('users-form.password-max') });

/**
 * Validation schema of a whole user form: email and username required, everything else
 * optional/nullable.
 */
export const usersSchema = z.object({
    id: z.string().nullish(),
    email: usersEmailSchema,
    username: usersUsernameSchema,
    // `null` clears the image; `''` is not a valid value the contract accepts (`minLength: 1`).
    imageUrl: z.string().min(1).nullish(),
    phone: z.string().optional(),
    website: z.string().optional(),
    role: z.string().nullish(),
    active: z.boolean().nullish(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish()
});
