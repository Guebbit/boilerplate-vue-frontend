/**
 * @module
 * The shelf ranking the card, the product page and the add-to-cart button share: off sale outranks
 * the server's availability, an absent `purchasable` reads as on sale, and an availability that is
 * not loaded yet reads as nothing at all rather than a guess.
 */
import { describe, expect, it } from 'vitest';
import { LOW_STOCK_THRESHOLD, shelfStateOf } from '../domain';

describe('shelfStateOf', () => {
    it.each([
        ['on sale with stock', { purchasable: true }, 'in_stock', 'in-stock'],
        ['on sale, sold out', { purchasable: true }, 'out_of_stock', 'out-of-stock'],
        ['off sale, whatever the server says', { purchasable: false }, 'in_stock', 'off-sale'],
        ['off sale and sold out', { purchasable: false }, 'out_of_stock', 'off-sale'],
        ['no purchasable flag, with stock', {}, 'in_stock', 'in-stock'],
        ['no purchasable flag, sold out', {}, 'out_of_stock', 'out-of-stock'],
        ['a preorder', {}, 'preorder', 'preorder'],
        ['an off-sale preorder', { purchasable: false }, 'preorder', 'off-sale'],
        ['a backorder', {}, 'backorder', 'backorder'],
        ['an off-sale backorder', { purchasable: false }, 'backorder', 'off-sale']
    ] as const)('%s reads %s', (_label, product, availability, expected) => {
        expect(shelfStateOf(product, { availability })).toBe(expected);
    });

    it('reads "low stock" for an in-stock product with fewer than the threshold left', () => {
        expect(
            shelfStateOf(
                {},
                { availability: 'in_stock', quantityAvailable: LOW_STOCK_THRESHOLD - 1 }
            )
        ).toBe('low-stock');
        expect(shelfStateOf({}, { availability: 'in_stock', quantityAvailable: 1 })).toBe(
            'low-stock'
        );
    });

    it('reads plain in stock from the threshold up, and when there is no limit', () => {
        expect(
            shelfStateOf({}, { availability: 'in_stock', quantityAvailable: LOW_STOCK_THRESHOLD })
        ).toBe('in-stock');
        expect(shelfStateOf({}, { availability: 'in_stock' })).toBe('in-stock');
    });

    it('lets off sale and sold out outrank a low number', () => {
        expect(
            shelfStateOf({ purchasable: false }, { availability: 'in_stock', quantityAvailable: 1 })
        ).toBe('off-sale');
        expect(shelfStateOf({}, { availability: 'out_of_stock', quantityAvailable: 0 })).toBe(
            'out-of-stock'
        );
    });

    it('reads nothing while the availability is not loaded, for a product on sale', () => {
        expect(shelfStateOf({}, undefined)).toBeUndefined();
    });

    it('still reads off sale while the availability is not loaded: the details already say so', () => {
        expect(shelfStateOf({ purchasable: false }, undefined)).toBe('off-sale');
    });
});
