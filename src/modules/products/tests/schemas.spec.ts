/**
 * @module
 * `src/modules/products/schemas.ts` — the product form's price rule and its per-locale
 * `translations` rule.
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
    price: createProductBodyPriceMin + 1,
    translations: { en: { title: 'A lamp' } }
};

describe('productsSchema', () => {
    it('accepts a minimal valid product', () => {
        expect(productsSchema.safeParse(validProduct).success).toBe(true);
    });

    it('rejects a locale whose title is empty', () => {
        expect(
            productsSchema.safeParse({
                ...validProduct,
                translations: { en: { title: '' } }
            }).success
        ).toBe(false);
    });

    it('requires translations at all', () => {
        expect(productsSchema.safeParse({ price: validProduct.price }).success).toBe(false);
    });

    it('accepts an empty translations map — no tab open is a form-flow question, not a schema one', () => {
        expect(productsSchema.safeParse({ ...validProduct, translations: {} }).success).toBe(true);
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
        expect(productsSchema.safeParse({ translations: validProduct.translations }).success).toBe(
            false
        );
    });

    /**
     * `nullish` rather than `optional`: the API answers `null` for an unset field, so a schema
     * accepting only `undefined` would reject its own GET response.
     */
    it.each([
        'id',
        'active',
        'requiresShipping',
        'onHand',
        'imageUrl',
        'createdAt',
        'updatedAt'
    ] as const)('accepts null and undefined for %s', (field) => {
        expect(productsSchema.safeParse({ ...validProduct, [field]: null }).success).toBe(true);
        expect(productsSchema.safeParse({ ...validProduct, [field]: undefined }).success).toBe(
            true
        );
    });

    it('keeps the optional fields it was given', () => {
        const parsed = productsSchema.parse({
            ...validProduct,
            id: 'p1',
            active: true
        });

        expect(parsed).toMatchObject({ id: 'p1', active: true });
    });

    describe('translations — one locale slot', () => {
        it('accepts a locale with a title and a description', () => {
            expect(
                productsSchema.safeParse({
                    ...validProduct,
                    translations: { en: { title: 'A lamp', description: 'Brass' } }
                }).success
            ).toBe(true);
        });

        it('accepts a locale with no description at all', () => {
            expect(
                productsSchema.safeParse({
                    ...validProduct,
                    translations: { en: { title: 'A lamp' } }
                }).success
            ).toBe(true);
        });

        it('validates every open locale independently — one bad title does not hide another', () => {
            const result = productsSchema.safeParse({
                ...validProduct,
                translations: { en: { title: 'A lamp' }, it: { title: '' } }
            });

            expect(result.success).toBe(false);
        });

        it('accepts null — the delete signal — without applying the title rule to it', () => {
            expect(
                productsSchema.safeParse({
                    ...validProduct,
                    translations: { en: { title: 'A lamp' }, it: null }
                }).success
            ).toBe(true);
        });

        /**
         * "Errors say which language": a validation failure's issue path names the LOCALE, not
         * just `title`, so a component can tell which tab owns it (`translation-tab-errors.ts`).
         */
        it('names the failing locale in the issue path, not just the field', () => {
            const result = productsSchema.safeParse({
                ...validProduct,
                translations: { it: { title: '' } }
            });

            expect(result.success).toBe(false);
            expect(result.error?.issues[0]?.path).toEqual(['translations', 'it', 'title']);
        });

        it('rejects an unknown shape for a locale slot — not an object, not null', () => {
            expect(
                productsSchema.safeParse({
                    ...validProduct,
                    translations: { en: 'not an object' }
                }).success
            ).toBe(false);
        });
    });
});
