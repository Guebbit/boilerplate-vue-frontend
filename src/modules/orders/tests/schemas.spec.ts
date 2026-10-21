/**
 * @module
 * `src/modules/orders/schemas.ts` — the staff shipping-address correction.
 *
 * The bounds are read from `@api/schemas` rather than retyped, so a contract change moves the
 * tests with the form: one past the bound fails, exactly the bound passes.
 */
import { describe, expect, it } from 'vitest';
import {
    correctOrderShippingAddressBodyOneCityMax,
    correctOrderShippingAddressBodyOneFullNameMax,
    correctOrderShippingAddressBodyOnePhoneMax,
    correctOrderShippingAddressBodyOneStreetMax,
    correctOrderShippingAddressBodyOneZipMax
} from '@api/schemas';
import { shippingAddressCorrectionSchema } from '../schemas';

/** An address that passes, for tests that vary one field away from valid. */
const validAddress = {
    fullName: 'Ada Lovelace',
    street: '1 Main St',
    city: 'London',
    zip: 'N1',
    country: 'GB',
    phone: ''
};

describe('shippingAddressCorrectionSchema', () => {
    it('accepts a minimal valid address', () => {
        expect(shippingAddressCorrectionSchema.safeParse(validAddress).success).toBe(true);
    });

    it.each([
        ['fullName', correctOrderShippingAddressBodyOneFullNameMax],
        ['street', correctOrderShippingAddressBodyOneStreetMax],
        ['city', correctOrderShippingAddressBodyOneCityMax],
        ['zip', correctOrderShippingAddressBodyOneZipMax],
        ['phone', correctOrderShippingAddressBodyOnePhoneMax]
    ])('caps %s at the contract maximum', (field, max) => {
        const parse = (value: string) =>
            shippingAddressCorrectionSchema.safeParse({ ...validAddress, [field]: value }).success;
        expect(parse('a'.repeat(max))).toBe(true);
        expect(parse('a'.repeat(max + 1))).toBe(false);
    });

    it('refuses a required field that is only whitespace', () => {
        expect(
            shippingAddressCorrectionSchema.safeParse({ ...validAddress, street: '   ' }).success
        ).toBe(false);
    });
});
