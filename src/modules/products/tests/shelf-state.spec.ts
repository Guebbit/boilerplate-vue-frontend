/**
 * @module
 * The shelf ranking the card, the product page and the add-to-cart button share: off sale outranks
 * the server's availability, an absent `purchasable` reads as on sale, and an availability that is
 * not loaded yet reads as nothing at all rather than a guess.
 */
import { describe, expect, it } from 'vitest';
import { shelfStateOf } from '../domain';

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

    it('reads nothing while the availability is not loaded, for a product on sale', () => {
        expect(shelfStateOf({}, undefined)).toBeUndefined();
    });

    it('still reads off sale while the availability is not loaded: the details already say so', () => {
        expect(shelfStateOf({ purchasable: false }, undefined)).toBe('off-sale');
    });
});
