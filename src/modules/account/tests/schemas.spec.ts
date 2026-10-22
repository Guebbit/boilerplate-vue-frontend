/**
 * @module
 * `src/modules/account/schemas.ts` — the address-book entry and the password fields.
 *
 * The bounds are read from `@api/schemas` rather than retyped, so a contract change moves the
 * tests with the form: one past the bound fails, exactly the bound passes.
 */
import { describe, expect, it } from 'vitest';
import {
    addAddressBodyFullNameMax,
    addAddressBodyLabelMax,
    addAddressBodyPhoneMax,
    addAddressBodyStreetMax,
    addAddressBodyZipMax,
    loginBodyPasswordMax,
    loginBodyPasswordMin
} from '@api/schemas';
import { addressSchema, loginPasswordSchema } from '../schemas';

/** An entry that passes, for tests that vary one field away from valid. */
const validAddress = {
    label: '',
    fullName: 'Ada Lovelace',
    street: '1 Main St',
    city: 'London',
    zip: 'N1',
    country: 'GB',
    phone: ''
};

describe('addressSchema', () => {
    it('accepts a minimal valid entry', () => {
        expect(addressSchema.safeParse(validAddress).success).toBe(true);
    });

    it.each([
        ['label', addAddressBodyLabelMax],
        ['fullName', addAddressBodyFullNameMax],
        ['street', addAddressBodyStreetMax],
        ['zip', addAddressBodyZipMax],
        ['phone', addAddressBodyPhoneMax]
    ])('caps %s at the contract maximum', (field, max) => {
        expect(addressSchema.safeParse({ ...validAddress, [field]: 'a'.repeat(max) }).success).toBe(
            true
        );
        expect(
            addressSchema.safeParse({ ...validAddress, [field]: 'a'.repeat(max + 1) }).success
        ).toBe(false);
    });

    it.each(['fullName', 'street', 'city', 'zip', 'country'])('requires %s', (field) => {
        expect(addressSchema.safeParse({ ...validAddress, [field]: '' }).success).toBe(false);
    });
});

describe('loginPasswordSchema', () => {
    it('enforces the login operation bounds at their exact boundaries', () => {
        expect(loginPasswordSchema.safeParse('a'.repeat(loginBodyPasswordMin)).success).toBe(true);
        expect(loginPasswordSchema.safeParse('a'.repeat(loginBodyPasswordMin - 1)).success).toBe(
            false
        );
        expect(loginPasswordSchema.safeParse('a'.repeat(loginBodyPasswordMax)).success).toBe(true);
        expect(loginPasswordSchema.safeParse('a'.repeat(loginBodyPasswordMax + 1)).success).toBe(
            false
        );
    });
});
