/**
 * The fixture factories prove what they build against the generated response schema: a value the
 * contract refuses fails at the factory, and what comes back is the object the test wrote, not
 * Zod's parse of it.
 */
import { describe, expect, it } from 'vitest';
import { aProduct, aShop, aUser } from '../../support/unit/fixtures.ts';
import { asStub } from '../../support/stub.ts';

describe('fixture factories', () => {
    it('refuse an override the contract refuses', () => {
        expect(() => aUser({ email: 'not-an-email' })).toThrow();
    });

    it('refuse a field the contract does not declare', () => {
        // The schemas are strict objects; the cast is the point: a typed override cannot name it.
        expect(() =>
            aUser(asStub<NonNullable<Parameters<typeof aUser>[0]>>({ shoeSize: 42 }))
        ).toThrow();
    });

    it('hand back what the test wrote, with no schema default filled in', () => {
        const product = aProduct();

        expect(Object.keys(product)).not.toContain('requiresShipping');
    });

    it('build every default fixture without an override', () => {
        expect(aShop().currency).toBeTruthy();
    });
});
