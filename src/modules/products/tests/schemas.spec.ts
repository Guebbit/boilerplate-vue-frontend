/**
 * @module
 * `src/modules/products/schemas.ts` — the product form's title and price rules.
 *
 * The price minimum is read from `@api/schemas` rather than retyped, so the form cannot drift
 * looser than the contract it was built from; the boundary is asserted on both sides of that
 * number. Messages belong to `schemas-i18n.spec.ts` — these are the rules.
 */
import { describe, expect, it } from 'vitest';
import { createProductBodyPriceMin } from '@api/schemas';
import { productsSchema } from '@/modules/products/schemas';

/** A form payload that passes, for tests that vary one field away from valid. */
const validProduct = {
    title: 'A lamp',
    price: createProductBodyPriceMin + 1
};

describe('productsSchema', () => {
    it('accepts a minimal valid product', () => {
        expect(productsSchema.safeParse(validProduct).success).toBe(true);
    });

    it('rejects an empty title', () => {
        expect(productsSchema.safeParse({ ...validProduct, title: '' }).success).toBe(false);
    });

    it('requires a title at all', () => {
        expect(productsSchema.safeParse({ price: validProduct.price }).success).toBe(false);
    });

    /**
     * The bound comes from the contract, so this is a boundary test rather than a magic number.
     */
    it('accepts exactly the contract minimum price and rejects just under it', () => {
        expect(
            productsSchema.safeParse({ ...validProduct, price: createProductBodyPriceMin }).success
        ).toBe(true);
        expect(
            productsSchema.safeParse({ ...validProduct, price: createProductBodyPriceMin - 0.01 })
                .success
        ).toBe(false);
    });

    it('rejects a negative price', () => {
        expect(productsSchema.safeParse({ ...validProduct, price: -1 }).success).toBe(false);
    });

    it('requires the price to be a number, not a numeric string', () => {
        // The form binds a numeric input; a string here means the coercion upstream was dropped.
        expect(productsSchema.safeParse({ ...validProduct, price: '10' }).success).toBe(false);
    });

    it('requires a price at all', () => {
        expect(productsSchema.safeParse({ title: validProduct.title }).success).toBe(false);
    });

    /**
     * `nullish` rather than `optional`: the API answers `null` for an unset field, so a schema
     * accepting only `undefined` would reject its own GET response.
     */
    it.each(['id', 'description', 'active', 'imageUrl', 'createdAt', 'updatedAt'] as const)(
        'accepts null and undefined for %s',
        (field) => {
            expect(productsSchema.safeParse({ ...validProduct, [field]: null }).success).toBe(true);
            expect(productsSchema.safeParse({ ...validProduct, [field]: undefined }).success).toBe(
                true
            );
        }
    );

    it('keeps the optional fields it was given', () => {
        const parsed = productsSchema.parse({
            ...validProduct,
            id: 'p1',
            description: 'Brass',
            active: true
        });

        expect(parsed).toMatchObject({ id: 'p1', description: 'Brass', active: true });
    });
});
