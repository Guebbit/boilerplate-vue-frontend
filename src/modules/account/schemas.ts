/**
 * @module
 * Zod validation schemas for the account forms, with i18n-thunked error messages resolved at
 * parse time. Every length bound is the generated contract constant from `@api/schemas`, never a
 * restated number, so a contract change reaches these forms through `npm run gen:api` alone.
 */
import { z } from 'zod';
import { translate } from '@/i18n';
import {
    addAddressBodyLabelMax,
    addAddressBodyFullNameMax,
    addAddressBodyStreetMax,
    addAddressBodyCityMax,
    addAddressBodyZipMax,
    addAddressBodyPhoneMax,
    loginBodyPasswordMin,
    loginBodyPasswordMax,
    signupBodyPasswordConfirmMin,
    confirmPasswordResetBodyPasswordConfirmMin
} from '@api/schemas';

/**
 * A string capped at a contract length, with the cap named in the message.
 *
 * @param max - The contract's `maxLength`.
 * @returns The schema; empty passes, so presence is the caller's own rule.
 */
const addressText = (max: number) =>
    z.string().max(max, { error: () => translate('profile-page.addresses-too-long', { max }) });

/**
 * A required address field: non-empty, and within its contract length.
 *
 * @param max - The contract's `maxLength`.
 * @param requiredKey - The translation key naming which field is missing.
 * @returns The schema.
 */
const requiredAddressText = (max: number, requiredKey: string) =>
    addressText(max).min(1, { error: () => translate(requiredKey) });

/**
 * The address-book entry form (`AddressInput`): five required strings plus an optional label and
 * phone. Add and replace share the contract's bounds, so the add operation's constants stand for
 * both.
 */
export const addressSchema = z.object({
    label: addressText(addAddressBodyLabelMax),
    fullName: requiredAddressText(
        addAddressBodyFullNameMax,
        'profile-page.addresses-required-full-name'
    ),
    street: requiredAddressText(addAddressBodyStreetMax, 'profile-page.addresses-required-street'),
    city: requiredAddressText(addAddressBodyCityMax, 'profile-page.addresses-required-city'),
    zip: requiredAddressText(addAddressBodyZipMax, 'profile-page.addresses-required-zip'),
    // Picked from an ISO 3166-1 select, so presence is the only rule a visitor can break.
    country: z
        .string()
        .min(1, { error: () => translate('profile-page.addresses-required-country') }),
    phone: addressText(addAddressBodyPhoneMax)
});

/**
 * The sign-in password: the login operation's own bounds.
 */
export const loginPasswordSchema = z
    .string()
    .min(loginBodyPasswordMin, { error: () => translate('users-form.password-required') })
    .max(loginBodyPasswordMax, { error: () => translate('users-form.password-max') });

/**
 * The repeated password on signup. Equality with the first field is the form's own refine.
 */
export const signupPasswordConfirmSchema = z.string().min(signupBodyPasswordConfirmMin, {
    error: () => translate('users-form.password-confirm-required')
});

/**
 * The repeated password on a password reset. Equality with the first field is the form's own
 * refine.
 */
export const resetPasswordConfirmSchema = z
    .string()
    .min(confirmPasswordResetBodyPasswordConfirmMin, {
        error: () => translate('users-form.password-confirm-required')
    });
