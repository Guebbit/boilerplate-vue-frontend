/**
 * @module
 * The board's join of the allowance and the units by state: one row per product from either read,
 * a missing half left absent (never zero), the worst first.
 */
import { describe, expect, it } from 'vitest';
import { preorderRows } from '../domain';
import { aPreorderLevel, aPreorderSummary } from '../../../../tests/support/unit/fixtures.ts';

describe('preorderRows', () => {
    it('joins a product that has both reads into one row', () => {
        const level = aPreorderLevel({ productId: 'p1' });
        const summary = aPreorderSummary({ productId: 'p1' });

        expect(preorderRows([level], [summary])).toEqual([
            { productId: 'p1', title: level.title, releaseDate: level.releaseDate, level, summary }
        ]);
    });

    it('keeps a product that has an allowance and no sales, with no summary', () => {
        const [row] = preorderRows([aPreorderLevel({ productId: 'p1' })], []);

        expect(row?.summary).toBeUndefined();
        expect(row?.level?.productId).toBe('p1');
    });

    it('keeps a product with sales and no allowance row, naming it as its first order did', () => {
        const [row] = preorderRows(
            [],
            [aPreorderSummary({ productId: 'p2', title: 'Frozen name' })]
        );

        expect(row).toMatchObject({ productId: 'p2', title: 'Frozen name' });
        expect(row?.level).toBeUndefined();
        expect(row?.releaseDate).toBeUndefined();
    });

    it('names a product by the live allowance title when both reads know it', () => {
        const [row] = preorderRows(
            [aPreorderLevel({ productId: 'p1', title: 'Live name' })],
            [aPreorderSummary({ productId: 'p1', title: 'Frozen name' })]
        );

        expect(row?.title).toBe('Live name');
    });

    it('lists the most late first, then the most outstanding, then by name', () => {
        const rows = preorderRows(
            [
                aPreorderLevel({ productId: 'a', title: 'Alpha', preordered: 9 }),
                aPreorderLevel({ productId: 'b', title: 'Bravo', preordered: 1 }),
                aPreorderLevel({ productId: 'c', title: 'Charlie', preordered: 1 }),
                aPreorderLevel({ productId: 'd', title: 'Delta', preordered: 1 })
            ],
            [aPreorderSummary({ productId: 'd', late: 2 })]
        );

        expect(rows.map(({ productId }) => productId)).toEqual(['d', 'a', 'b', 'c']);
    });
});
