/**
 * @module
 * `domain/line-total.ts` — prices summed in whole minor units. Pure, so no mount and no store.
 */
import { describe, expect, it } from 'vitest';
import { lineTotal, linesTotal } from '../domain';

describe('lineTotal', () => {
    it.each([
        [0.1, 3, 2, 0.3],
        [19.99, 3, 2, 59.97],
        [1.13, 100, 2, 113],
        [500, 3, 0, 1500],
        [1.234, 2, 3, 2.468]
    ])(
        'prices %s × %s at %s decimals as %s, with no float drift',
        (unit, quantity, digits, total) => {
            expect(lineTotal(unit, quantity, digits)).toBe(total);
        }
    );
});

describe('linesTotal', () => {
    it('sums the lines in whole minor units', () => {
        expect(
            linesTotal(
                [
                    { unitPrice: 0.1, quantity: 1 },
                    { unitPrice: 0.2, quantity: 1 }
                ],
                2
            )
        ).toBe(0.3);
    });

    it('is zero for no lines', () => {
        expect(linesTotal([], 2)).toBe(0);
    });
});
