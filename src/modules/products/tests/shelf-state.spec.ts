/**
 * @module
 * The shelf ranking the card, the product page and the add-to-cart button share: off sale outranks
 * a preorder with allowance left, which outranks the stock badge, and an absent `purchasable` reads as on sale.
 */
import { describe, expect, it } from 'vitest';
import { shelfStateOf } from '../domain';

describe('shelfStateOf', () => {
    it.each([
        ['on sale with stock', { purchasable: true, inStock: true }, 'in-stock'],
        ['on sale, sold out', { purchasable: true, inStock: false }, 'out-of-stock'],
        ['off sale with stock', { purchasable: false, inStock: true }, 'off-sale'],
        ['off sale and sold out', { purchasable: false, inStock: false }, 'off-sale'],
        ['no purchasable flag, with stock', { inStock: true }, 'in-stock'],
        ['no purchasable flag, sold out', { inStock: false }, 'out-of-stock'],
        ['a preorder with allowance left', { preorder: true, inStock: true }, 'preorder'],
        ['a preorder whose allowance is full', { preorder: true, inStock: false }, 'out-of-stock'],
        ['an off-sale preorder', { purchasable: false, preorder: true, inStock: false }, 'off-sale']
    ] as const)('%s reads %s', (_label, product, expected) => {
        expect(shelfStateOf(product)).toBe(expected);
    });
});
