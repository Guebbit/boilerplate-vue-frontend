import { z } from 'zod';
import type { TranslateFunction } from '@/utils/i18n.ts';

/**
 * Zod schema for a valid email
 */
export const createUsersEmailSchema = (t: TranslateFunction) =>
    z.email(t('users-form.email-invalid'));

/**
 * Zod schema for a valid username
 */
export const createUsersUsernameSchema = (t: TranslateFunction) =>
    z.string().min(3, t('users-form.username-min'));

/**
 * Zod schema for a valid password
 */
export const createUsersPasswordSchema = (t: TranslateFunction) =>
    z
        .string()
        .min(8, t('users-form.password-min'))
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
 * User schema
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
