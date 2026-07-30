import { z } from 'zod';
import type { TranslateFunction } from '@/utils/i18n.ts';
import { signupBodyUsernameMin, createUserBodyPasswordMin } from '@api/schemas';

/**
 * Builds the validation schema for an email address.
 *
 * @param t - Translate function used to localize the error messages.
 * @returns A Zod email schema.
 */
export const createUsersEmailSchema = (t: TranslateFunction) =>
    z.email(t('users-form.email-invalid'));

/**
 * Builds the validation schema for a username.
 *
 * @param t - Translate function used to localize the error messages.
 * @returns A Zod string schema enforcing the minimum length declared by the API
 *  contract.
 */
export const createUsersUsernameSchema = (t: TranslateFunction) =>
    z.string().min(signupBodyUsernameMin, t('users-form.username-min'));

/**
 * Builds the validation schema for a password.
 *
 * @param t - Translate function used to localize the error messages.
 * @returns A Zod string schema enforcing the contract's minimum length plus one
 *  lowercase, one uppercase, one digit and one special character, each with its
 *  own message.
 */
export const createUsersPasswordSchema = (t: TranslateFunction) =>
    z
        .string()
        .min(createUserBodyPasswordMin, t('users-form.password-min'))
        .refine((password) => password && /[a-z]/.test(password), {
            message: t('users-form.password-minus-required')
        })
        .refine((password) => password && /[A-Z]/.test(password), {
            message: t('users-form.password-maius-required')
        })
        .refine((password) => password && /\d/.test(password), {
            message: t('users-form.password-number-required')
        })
        .refine((password) => password && /[^\dA-Za-z]/.test(password), {
            message: t('users-form.password-special-required')
        });

/**
 * Builds the validation schema of a whole user form.
 *
 * @param t - Translate function used to localize the error messages.
 * @returns A Zod object schema requiring email and username, everything else
 *  being optional/nullable.
 */
export const createUsersSchema = (t: TranslateFunction) =>
    z.object({
        id: z.string().nullish().optional(),
        email: createUsersEmailSchema(t),
        username: createUsersUsernameSchema(t),
        imageUrl: z.string().nullish().optional(),
        admin: z.boolean().nullish().optional(),
        active: z.boolean().nullish().optional(),
        createdAt: z.string().nullish().optional(),
        updatedAt: z.string().nullish().optional()
    });
