import { z } from 'zod';
import { translate } from '@/utils/i18n.ts';
import { signupBodyUsernameMin, createUserBodyPasswordMin } from '@api/schemas';

/**
 * Validation schemas for the user forms.
 * Messages are thunks resolved at parse time — see {@link translate} for why.
 */

/**
 * Validation schema for an email address.
 */
export const usersEmailSchema = z.email({ error: () => translate('users-form.email-invalid') });

/**
 * Validation schema for a username, enforcing the minimum length declared by the API contract.
 */
export const usersUsernameSchema = z
    .string()
    .min(signupBodyUsernameMin, { error: () => translate('users-form.username-min') });

/**
 * Validation schema for a password: the contract's minimum length plus one lowercase, one
 * uppercase, one digit and one special character, each with its own message.
 */
export const usersPasswordSchema = z
    .string()
    .min(createUserBodyPasswordMin, { error: () => translate('users-form.password-min') })
    .refine((password) => password && /[a-z]/.test(password), {
        error: () => translate('users-form.password-minus-required')
    })
    .refine((password) => password && /[A-Z]/.test(password), {
        error: () => translate('users-form.password-maius-required')
    })
    .refine((password) => password && /\d/.test(password), {
        error: () => translate('users-form.password-number-required')
    })
    .refine((password) => password && /[^\dA-Za-z]/.test(password), {
        error: () => translate('users-form.password-special-required')
    });

/**
 * Validation schema of a whole user form: email and username required, everything else
 * optional/nullable.
 */
export const usersSchema = z.object({
    id: z.string().nullish(),
    email: usersEmailSchema,
    username: usersUsernameSchema,
    imageUrl: z.string().nullish(),
    admin: z.boolean().nullish(),
    active: z.boolean().nullish(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish()
});
