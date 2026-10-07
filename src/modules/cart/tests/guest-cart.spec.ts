/**
 * @module
 * The guest cart's rules: growing a line, the two caps that mirror the merge call, clamping, and
 * reading back a storage value nobody can be trusted to have written well.
 */
import { describe, expect, it } from 'vitest';
import {
    MAX_GUEST_LINES,
    MAX_GUEST_LINE_QUANTITY,
    addGuestLine,
    guestCartQuantity,
    parseGuestCart,
    removeGuestLines,
    setGuestLineQuantity,
    subtractGuestLines
} from '../domain';
import type { GuestCartLine } from '../domain';

/**
 * A full cart: as many different products as a guest may hold.
 */
const FULL: GuestCartLine[] = Array.from({ length: MAX_GUEST_LINES }, (_unused, index) => ({
    productId: `p${index}`,
    quantity: 1
}));

describe('addGuestLine', () => {
    it('starts a line for a product that has none', () => {
        expect(addGuestLine([], 'p1', 2)).toEqual([{ productId: 'p1', quantity: 2 }]);
    });

    it('grows the line a product already has, as POST /cart would', () => {
        const lines = [
            { productId: 'p1', quantity: 2 },
            { productId: 'p2', quantity: 1 }
        ];

        expect(addGuestLine(lines, 'p1', 3)).toEqual([
            { productId: 'p1', quantity: 5 },
            { productId: 'p2', quantity: 1 }
        ]);
    });

    it('does not touch the cart it was given', () => {
        const lines = [{ productId: 'p1', quantity: 2 }];

        addGuestLine(lines, 'p1', 3);

        expect(lines).toEqual([{ productId: 'p1', quantity: 2 }]);
    });

    it('stops a line at the most one line may hold, instead of passing it', () => {
        expect(
            addGuestLine([{ productId: 'p1', quantity: MAX_GUEST_LINE_QUANTITY - 1 }], 'p1', 10)
        ).toEqual([{ productId: 'p1', quantity: MAX_GUEST_LINE_QUANTITY }]);
    });

    it('refuses a new product once the cart holds as many as it may', () => {
        expect(addGuestLine(FULL, 'brand-new', 1)).toBeUndefined();
    });

    it('still grows a line already in a full cart', () => {
        const grown = addGuestLine(FULL, 'p0', 1);

        expect(grown).toHaveLength(MAX_GUEST_LINES);
        expect(grown?.[0]).toEqual({ productId: 'p0', quantity: 2 });
    });
});

describe('setGuestLineQuantity', () => {
    const lines = [
        { productId: 'p1', quantity: 2 },
        { productId: 'p2', quantity: 4 }
    ];

    it('sets exactly that line', () => {
        expect(setGuestLineQuantity(lines, 'p2', 7)).toEqual([
            { productId: 'p1', quantity: 2 },
            { productId: 'p2', quantity: 7 }
        ]);
    });

    it('never goes below one: zero is a removal, a different call', () => {
        expect(setGuestLineQuantity(lines, 'p1', 0)[0]?.quantity).toBe(1);
        expect(setGuestLineQuantity(lines, 'p1', -3)[0]?.quantity).toBe(1);
    });

    it('never passes the most a line may hold', () => {
        expect(setGuestLineQuantity(lines, 'p1', 5000)[0]?.quantity).toBe(MAX_GUEST_LINE_QUANTITY);
    });

    it('keeps a whole number', () => {
        expect(setGuestLineQuantity(lines, 'p1', 2.9)[0]?.quantity).toBe(2);
    });

    it('ignores a product with no line', () => {
        expect(setGuestLineQuantity(lines, 'nope', 3)).toEqual(lines);
    });
});

describe('removeGuestLines', () => {
    it('drops the lines of the products named and keeps the order of the rest', () => {
        const lines = [
            { productId: 'a', quantity: 1 },
            { productId: 'b', quantity: 1 },
            { productId: 'c', quantity: 1 }
        ];

        expect(removeGuestLines(lines, ['a', 'c']).map(({ productId }) => productId)).toEqual([
            'b'
        ]);
    });

    it('is a no-op for a product that is not there', () => {
        expect(removeGuestLines([{ productId: 'a', quantity: 1 }], ['z'])).toHaveLength(1);
    });
});

describe('subtractGuestLines', () => {
    it('drops a line that was sent in full', () => {
        expect(
            subtractGuestLines(
                [
                    { productId: 'p1', quantity: 2 },
                    { productId: 'p2', quantity: 1 }
                ],
                [{ productId: 'p1', quantity: 2 }]
            )
        ).toEqual([{ productId: 'p2', quantity: 1 }]);
    });

    it('keeps only the units added after the call was sent', () => {
        expect(
            subtractGuestLines(
                [{ productId: 'p1', quantity: 5 }],
                [{ productId: 'p1', quantity: 2 }]
            )
        ).toEqual([{ productId: 'p1', quantity: 3 }]);
    });

    it('drops a line the guest lowered below what was sent: those units are already on the server', () => {
        expect(
            subtractGuestLines(
                [{ productId: 'p1', quantity: 1 }],
                [{ productId: 'p1', quantity: 2 }]
            )
        ).toEqual([]);
    });

    it('keeps a line that was not sent at all, as it was', () => {
        expect(
            subtractGuestLines(
                [{ productId: 'p7', quantity: 4 }],
                [{ productId: 'p1', quantity: 2 }]
            )
        ).toEqual([{ productId: 'p7', quantity: 4 }]);
    });

    it('does not touch the cart it was given', () => {
        const lines = [{ productId: 'p1', quantity: 5 }];

        subtractGuestLines(lines, [{ productId: 'p1', quantity: 2 }]);

        expect(lines).toEqual([{ productId: 'p1', quantity: 5 }]);
    });

    it('sending nothing takes nothing away', () => {
        expect(subtractGuestLines([{ productId: 'p1', quantity: 2 }], [])).toEqual([
            { productId: 'p1', quantity: 2 }
        ]);
    });
});

describe('guestCartQuantity', () => {
    it('counts units, not lines', () => {
        expect(
            guestCartQuantity([
                { productId: 'a', quantity: 3 },
                { productId: 'b', quantity: 2 }
            ])
        ).toBe(5);
    });

    it('is zero for an empty cart', () => {
        expect(guestCartQuantity([])).toBe(0);
    });
});

describe('parseGuestCart', () => {
    it('reads back what was saved', () => {
        const saved = [
            { productId: 'p1', quantity: 2 },
            { productId: 'p2', quantity: 1 }
        ];

        expect(parseGuestCart(saved)).toEqual(saved);
    });

    it.each([[undefined], [null], ['text'], [42], [{ productId: 'p1', quantity: 1 }]])(
        'reads %j, which is not a list, as an empty cart',
        (stored) => {
            expect(parseGuestCart(stored)).toEqual([]);
        }
    );

    it('drops a line that is not the right shape and keeps the rest', () => {
        expect(
            parseGuestCart([
                { productId: 'ok', quantity: 1 },
                null,
                'text',
                { productId: 'no-quantity' },
                { productId: 7, quantity: 1 },
                { productId: 'bad id!', quantity: 1 },
                { productId: '', quantity: 1 },
                { productId: 'x'.repeat(65), quantity: 1 },
                { productId: 'zero', quantity: 0 },
                { productId: 'fraction', quantity: 1.5 },
                { productId: 'too-many', quantity: MAX_GUEST_LINE_QUANTITY + 1 },
                { productId: 'text-quantity', quantity: '2' }
            ])
        ).toEqual([{ productId: 'ok', quantity: 1 }]);
    });

    it('keeps a line holding exactly the most units the contract allows, and drops one above it', () => {
        expect(parseGuestCart([{ productId: 'p1', quantity: MAX_GUEST_LINE_QUANTITY }])).toEqual([
            { productId: 'p1', quantity: MAX_GUEST_LINE_QUANTITY }
        ]);
        expect(
            parseGuestCart([{ productId: 'p1', quantity: MAX_GUEST_LINE_QUANTITY + 1 }])
        ).toEqual([]);
    });

    it('keeps an id of exactly the longest length the contract allows', () => {
        const id = 'x'.repeat(64);

        expect(parseGuestCart([{ productId: id, quantity: 1 }])).toEqual([
            { productId: id, quantity: 1 }
        ]);
    });

    it('folds the same product listed twice into one line, summed', () => {
        expect(
            parseGuestCart([
                { productId: 'p1', quantity: 2 },
                { productId: 'p1', quantity: 3 }
            ])
        ).toEqual([{ productId: 'p1', quantity: 5 }]);
    });

    it('never returns more products than a cart may hold', () => {
        const many = Array.from({ length: MAX_GUEST_LINES + 20 }, (_unused, index) => ({
            productId: `p${index}`,
            quantity: 1
        }));

        expect(parseGuestCart(many)).toHaveLength(MAX_GUEST_LINES);
    });
});
