/**
 * @module
 * Zod validation schemas for the order forms, with i18n-thunked error messages
 * resolved at parse time rather than at schema-definition time.
 */
import { z } from 'zod';
import { translate } from '@/i18n';
import {
    correctOrderShippingAddressBodyOneFullNameMax,
    correctOrderShippingAddressBodyOneStreetMax,
    correctOrderShippingAddressBodyOneCityMax,
    correctOrderShippingAddressBodyOneZipMax,
    correctOrderShippingAddressBodyOnePhoneMax
} from '@api/schemas';

/**
 * Validation schemas for the order forms.
 * Messages are thunks resolved at parse time — see {@link translate} for why.
 */

/**
 * Validation schema of a whole order form. Every field is optional (most also nullable), since these forms
 * are also used for partial updates.
 */
export const ordersSchema = z.object({
    id: z.string().nullish(),
    userId: z.string().nullish(),
    email: z.email({ error: () => translate('orders-form.email-invalid') }).optional(),
    totalPrice: z.number().nullish(),
    notes: z.string().nullish(),
    createdAt: z.string().nullish(),
    updatedAt: z.string().nullish()
});

/**
 * A trimmed string capped at a contract length, with the cap named in the message.
 *
 * @param max - The contract's `maxLength`.
 * @returns The schema; empty passes, so presence is the caller's own rule.
 */
const addressText = (max: number) =>
    z
        .string()
        .trim()
        .max(max, { error: () => translate('shipping-address-form.error-too-long', { max }) });

/**
 * A required address field: non-empty after trimming, and within its contract length.
 *
 * @param max - The contract's `maxLength`.
 * @returns The schema.
 */
const requiredAddressText = (max: number) =>
    addressText(max).min(1, { error: () => translate('shipping-address-form.error-required') });

/**
 * Staff's corrected shipping address (`correctOrderShippingAddress`): five required strings and an
 * optional phone, cleared by leaving it empty.
 */
export const shippingAddressCorrectionSchema = z.object({
    fullName: requiredAddressText(correctOrderShippingAddressBodyOneFullNameMax),
    street: requiredAddressText(correctOrderShippingAddressBodyOneStreetMax),
    city: requiredAddressText(correctOrderShippingAddressBodyOneCityMax),
    zip: requiredAddressText(correctOrderShippingAddressBodyOneZipMax),
    // Picked from an ISO 3166-1 select, so presence is the only rule an operator can break.
    country: z
        .string()
        .trim()
        .min(1, { error: () => translate('shipping-address-form.error-required') }),
    phone: addressText(correctOrderShippingAddressBodyOnePhoneMax)
});
