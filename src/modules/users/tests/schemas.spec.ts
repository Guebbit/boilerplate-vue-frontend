/**
 * @module
 * `src/modules/users/schemas.ts` — the user form's email, username and password rules.
 *
 * The password schema is the reason this file exists: four independent `refine` predicates, each
 * with its own message, and only a case that satisfies every OTHER rule proves which one rejected.
 * The bounds are read from `@api/schemas` rather than retyped, so a contract change moves the
 * tests with the form. The messages themselves belong to `schemas-i18n.spec.ts`; these are the
 * rules.
 */
import { describe, expect, it } from 'vitest';
import { createUserBodyPasswordMin, signupBodyUsernameMin } from '@api/schemas';
import { usersPasswordSchema, usersSchema } from '@/modules/users/schemas';

/**
 * A password long enough to clear the contract minimum, built from one repeated character so a
 * test can add exactly the character class it wants to check.
 */
const longEnough = (fill: string) => fill.repeat(Math.max(createUserBodyPasswordMin, fill.length));

/** A form payload that passes, for tests that vary one field away from valid. */
const validUser = {
    email: 'a@example.com',
    username: 'x'.repeat(signupBodyUsernameMin)
};

describe('usersPasswordSchema', () => {
    it('accepts a password with all four character classes', () => {
        expect(usersPasswordSchema.safeParse(`${longEnough('a')}A1!`).success).toBe(true);
    });

    /**
     * The bound comes from the contract, so this is a boundary test rather than a magic number:
     * one under fails, exactly the minimum passes.
     */
    it('enforces the contract minimum length at its exact boundary', () => {
        const classes = 'aA1!';
        const atMinimum = classes.padEnd(createUserBodyPasswordMin, 'a');
        const belowMinimum = atMinimum.slice(1);

        expect(usersPasswordSchema.safeParse(atMinimum).success).toBe(true);
        expect(usersPasswordSchema.safeParse(belowMinimum).success).toBe(false);
    });

    /**
     * Each case is long enough and carries every class EXCEPT the one named, so the failure can
     * only be that rule — a shorter fixture would be rejected by the length rule instead and the
     * refine would never run.
     */
    it.each([
        ['lowercase', `${longEnough('A')}1!`],
        ['uppercase', `${longEnough('a')}1!`],
        ['a digit', `${longEnough('a')}A!`],
        ['a special character', `${longEnough('a')}A1`]
    ])('rejects a password with no %s', (_rule, password) => {
        expect(usersPasswordSchema.safeParse(password).success).toBe(false);
    });

    it('treats an underscore as a special character', () => {
        // `\W` would exclude it; the schema uses `[^\dA-Za-z]`, which does not.
        expect(usersPasswordSchema.safeParse(`${longEnough('a')}A1_`).success).toBe(true);
    });

    it('names every broken rule at once rather than only the first', () => {
        const result = usersPasswordSchema.safeParse(longEnough('a'));

        expect(result.success).toBe(false);
        // Three classes are missing, so a schema that stopped at the first would report one.
        expect(result.error!.issues.length).toBeGreaterThan(1);
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
