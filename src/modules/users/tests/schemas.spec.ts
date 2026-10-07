/**
 * @module
 * `src/modules/users/schemas.ts` — the user form's email, username and password rules.
 *
 * The bounds are read from `@api/schemas` rather than retyped, so a contract change moves the
 * tests with the form. The messages themselves belong to `schemas-i18n.spec.ts`; these are the
 * rules.
 */
import { describe, expect, it } from 'vitest';
import { signupBodyPasswordMax, signupBodyPasswordMin, signupBodyUsernameMin } from '@api/schemas';
import { usersPasswordSchema, usersSchema } from '../schemas';

/** A form payload that passes, for tests that vary one field away from valid. */
const validUser = {
    email: 'a@example.com',
    username: 'x'.repeat(signupBodyUsernameMin)
};

describe('usersPasswordSchema', () => {
    /**
     * The bounds come from the contract, so these are boundary tests rather than magic numbers:
     * one under fails, exactly the bound passes.
     */
    it('enforces the contract minimum length at its exact boundary', () => {
        expect(usersPasswordSchema.safeParse('a'.repeat(signupBodyPasswordMin)).success).toBe(true);
        expect(usersPasswordSchema.safeParse('a'.repeat(signupBodyPasswordMin - 1)).success).toBe(
            false
        );
    });

    it('enforces the contract maximum length at its exact boundary', () => {
        expect(usersPasswordSchema.safeParse('a'.repeat(signupBodyPasswordMax)).success).toBe(true);
        expect(usersPasswordSchema.safeParse('a'.repeat(signupBodyPasswordMax + 1)).success).toBe(
            false
        );
    });

    /**
     * No composition rules (NIST SP 800-63B-4): a password is not refused for lacking a mix of
     * character classes, only for its length.
     */
    it.each([
        ['all lowercase', 'a'.repeat(signupBodyPasswordMin)],
        ['all digits', '1'.repeat(signupBodyPasswordMin)],
        ['a passphrase', 'correct horse battery staple']
    ])('accepts %s', (_label, password) => {
        expect(usersPasswordSchema.safeParse(password).success).toBe(true);
    });
});

describe('usersSchema', () => {
    it('accepts a minimal valid user', () => {
        expect(usersSchema.safeParse(validUser).success).toBe(true);
    });

    it.each(['not-an-email', 'a@', '@example.com', '', 'a b@example.com'])(
        'rejects %o as an email',
        (email) => {
            expect(usersSchema.safeParse({ ...validUser, email }).success).toBe(false);
        }
    );

    it('enforces the contract username minimum at its exact boundary', () => {
        const atMinimum = 'x'.repeat(signupBodyUsernameMin);

        expect(usersSchema.safeParse({ ...validUser, username: atMinimum }).success).toBe(true);
        expect(usersSchema.safeParse({ ...validUser, username: atMinimum.slice(1) }).success).toBe(
            false
        );
    });

    /**
     * `nullish` rather than `optional`: the API answers `null` for an unset field, so a schema
     * accepting only `undefined` would reject its own GET response.
     */
    it.each(['id', 'imageUrl', 'admin', 'active', 'createdAt', 'updatedAt'] as const)(
        'accepts null and undefined for %s',
        (field) => {
            expect(usersSchema.safeParse({ ...validUser, [field]: null }).success).toBe(true);
            expect(usersSchema.safeParse({ ...validUser, [field]: undefined }).success).toBe(true);
        }
    );

    it('rejects an empty imageUrl — null is the only valid way to clear it', () => {
        expect(usersSchema.safeParse({ ...validUser, imageUrl: '' }).success).toBe(false);
        expect(usersSchema.safeParse({ ...validUser, imageUrl: null }).success).toBe(true);
    });

    it('rejects a null phone or website, which are optional but not nullable', () => {
        expect(usersSchema.safeParse({ ...validUser, phone: null }).success).toBe(false);
        expect(usersSchema.safeParse({ ...validUser, website: null }).success).toBe(false);
        expect(usersSchema.safeParse({ ...validUser, phone: undefined }).success).toBe(true);
    });

    it.each(['email', 'username'] as const)('requires %s', (field) => {
        const { [field]: _removed, ...withoutField } = validUser;

        expect(usersSchema.safeParse(withoutField).success).toBe(false);
    });
});
