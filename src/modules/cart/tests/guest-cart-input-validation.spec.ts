/**
 * @module
 * The guest cart's quantity rules over EVERY number a caller could hand them, NaN included: `set`
 * keeps the line within range (and keeps what it had for `NaN`), `add` ignores anything that is not a
 * whole number from 1, and no line is ever left that the next read would silently drop.
 */
import { afterEach, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { MAX_GUEST_LINE_QUANTITY, addGuestLine, setGuestLineQuantity } from '@/modules/cart/domain';
import { readGuestCart, writeGuestCart } from '@/modules/cart/composables/guest-cart-storage';

/**
 * One seed for the file.
 */
const RUN = { seed: 20_261_004, numRuns: 300, endOnFailure: true } as const;

afterEach(() => {
    localStorage.clear();
});

/**
 * Any number at all, with the special values named: the default generator reaches `NaN` too
 * rarely to rely on.
 */
const anyNumber = () =>
    fc.oneof(fc.double(), fc.constantFrom(Number.NaN, Infinity, -Infinity, 0, -0));

describe('a quantity that is not a sensible number', () => {
    it('still leaves a line within the range, for any number `set` is given', () => {
        fc.assert(
            fc.property(anyNumber(), (quantity) => {
                const [line] = setGuestLineQuantity(
                    [{ productId: 'p', quantity: 3 }],
                    'p',
                    quantity
                );

                expect(line?.quantity).toBeGreaterThanOrEqual(1);
                expect(line?.quantity).toBeLessThanOrEqual(MAX_GUEST_LINE_QUANTITY);
            }),
            RUN
        );
    });

    it('does not lose the line on the next read, for any number `set` is given', () => {
        fc.assert(
            fc.property(anyNumber(), (quantity) => {
                writeGuestCart(
                    setGuestLineQuantity([{ productId: 'p', quantity: 3 }], 'p', quantity)
                );

                expect(readGuestCart()).toHaveLength(1);
            }),
            RUN
        );
    });

    it('does not add a line that cannot be read back, for any number `add` is given', () => {
        fc.assert(
            fc.property(anyNumber(), (quantity) => {
                const lines = addGuestLine([], 'p', quantity) ?? [];
                writeGuestCart(lines);

                expect(readGuestCart()).toEqual(lines);
            }),
            RUN
        );
    });
});
