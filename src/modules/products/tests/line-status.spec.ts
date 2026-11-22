/**
 * @module
 * `lineStatusOf` — which one thing a saved line is told about its product, from the server's own
 * stock answer plus the product details. Pure: no mount, no store.
 */
import { describe, expect, it } from 'vitest';
import { lineStatusOf, type LineFacts, type LineStatus } from '../domain';

describe('lineStatusOf', () => {
    it.each<[string, LineFacts, LineStatus]>([
        ['a hidden or deleted product', { removed: true, availability: 'in_stock' }, 'removed'],
        [
            'removed outranks off sale',
            { removed: true, purchasable: false, availability: 'out_of_stock' },
            'removed'
        ],
        [
            'an off-sale product, which the server reads as out of stock',
            { removed: false, purchasable: false, availability: 'out_of_stock' },
            'off-sale'
        ],
        ['a sold-out product', { removed: false, availability: 'out_of_stock' }, 'sold-out'],
        [
            'a line above what can be bought',
            { removed: false, availability: 'in_stock', quantity: 6, quantityAvailable: 4 },
            'too-many'
        ],
        [
            'a line equal to what can be bought',
            { removed: false, availability: 'in_stock', quantity: 4, quantityAvailable: 4 },
            'ok'
        ],
        ['a line with no limit', { removed: false, availability: 'in_stock', quantity: 400 }, 'ok'],
        ['a preorder', { removed: false, availability: 'preorder', quantity: 1 }, 'preorder'],
        ['a backorder', { removed: false, availability: 'backorder', quantity: 1 }, 'ships-later'],
        [
            'units past the shelf of an in-stock product',
            { removed: false, availability: 'in_stock', quantity: 3, quantityBackordered: 1 },
            'ships-later'
        ],
        ['a wishlist line, with no quantity', { removed: false, availability: 'in_stock' }, 'ok'],
        ['an availability not loaded yet', { removed: false }, 'ok']
    ])('reads %s', (_name, facts, status) => {
        expect(lineStatusOf(facts)).toBe(status);
    });

    it('lets a line that is too many outrank a preorder or backorder word', () => {
        expect(
            lineStatusOf({
                removed: false,
                availability: 'preorder',
                quantity: 5,
                quantityAvailable: 2
            })
        ).toBe('too-many');
    });
});
