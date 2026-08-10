import { z } from 'zod';
import { i18n } from '@/utils/i18n.ts';
import { signupBodyUsernameMin, createUserBodyPasswordMin } from '@api/schemas';

/**
 * Validation schemas for the user forms.
 *
 * Every message is a THUNK — `{ error: () => t('…') }`, never `t('…')`. Zod v4 calls it at
 * PARSE time, and `i18n.global.t` resolves against whatever locale is active at that moment, so
 * one module-scope schema speaks every language. That is why these are plain constants and not
 * `createUsersSchema(t)` factories: `useStructureFormValidation` applies `toValue(schema)` inside
 * `validate()` and nowhere else, so a getter would be re-evaluated at exactly the moment a thunk
 * is — same behaviour, more machinery, and one way to get it wrong (passing
 * `createUsersSchema(t)` instead of `() => createUsersSchema(t)` type-checks, runs, and silently
 * freezes the language at setup).
 *
 * `i18n.global.t` rather than `useI18n()`: these are module constants, evaluated outside any
 * component's setup, where the composable is unavailable.
 *
 * This does NOT re-translate an error already on screen — `formErrors` holds resolved strings by
 * then. Pass `{ revalidateOn: locale }` to `useStructureFormValidation` for that.
 */
const t = (key: string) => i18n.global.t(key);

/**
 * Validation schema for an email address.
 */
export const usersEmailSchema = z.email({ error: () => t('users-form.email-invalid') });

/**
 * Validation schema for a username, enforcing the minimum length declared by the API contract.
 */
export const usersUsernameSchema = z
    .string()
    .min(signupBodyUsernameMin, { error: () => t('users-form.username-min') });

/**
 * Validation schema for a password: the contract's minimum length plus one lowercase, one
 * uppercase, one digit and one special character, each with its own message.
 */
export const usersPasswordSchema = z
    .string()
    .min(createUserBodyPasswordMin, { error: () => t('users-form.password-min') })
    .refine((password) => password && /[a-z]/.test(password), {
        error: () => t('users-form.password-minus-required')
    })
    .refine((password) => password && /[A-Z]/.test(password), {
        error: () => t('users-form.password-maius-required')
    })
    .refine((password) => password && /\d/.test(password), {
        error: () => t('users-form.password-number-required')
    })
    .refine((password) => password && /[^\dA-Za-z]/.test(password), {
        error: () => t('users-form.password-special-required')
    });

/**
 * Validation schema of a whole user form: email and username required, everything else
 * optional/nullable.
 */
export const usersSchema = z.object({
    id: z.string().nullish().optional(),
    email: usersEmailSchema,
    username: usersUsernameSchema,
    imageUrl: z.string().nullish().optional(),
    admin: z.boolean().nullish().optional(),
    active: z.boolean().nullish().optional(),
    createdAt: z.string().nullish().optional(),
    updatedAt: z.string().nullish().optional()
});
