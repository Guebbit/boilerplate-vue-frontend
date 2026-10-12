/**
 * @module
 * Which lines of a merge answer reach the shopper, and what kind of news each is: a line is
 * listed when its quantity is not what was asked (`reason`), when it is short of stock, or when it
 * could not be added. The numbers are passed through untouched, and none of them is a stock count.
 */
import { describe, expect, it } from 'vitest';
import { changedMergeLines, mergeReportKind } from '../domain';
import type { MergeLineResult } from '@types';

/**
 * A merge answer's line: as asked and in stock unless the case says otherwise.
 *
 * @param line - What differs from "landed as asked, fits the stock".
 * @returns The line as the server answers it.
 */
const aLine = (line: Partial<MergeLineResult> & Pick<MergeLineResult, 'productId'>) =>
    ({ requested: 1, resulting: 1, availability: 'in_stock', ...line }) satisfies MergeLineResult;

describe('changedMergeLines', () => {
    it('keeps a line with a reason, a short line and a gone line, in the answer order', () => {
        expect(
            changedMergeLines([
                aLine({ productId: 'p1', requested: 2, resulting: 5, reason: 'summed' }),
                aLine({ productId: 'p2' }),
                aLine({ productId: 'p3', requested: 1000, resulting: 999, reason: 'capped' }),
                aLine({
                    productId: 'p4',
                    requested: 4,
                    resulting: 4,
                    availability: 'insufficient_stock'
                }),
                aLine({ productId: 'p5', resulting: 0, reason: 'removed' }),
                aLine({ productId: 'p6', availability: 'unavailable' }),
                aLine({ productId: 'p7', availability: 'out_of_stock' }),
                aLine({ productId: 'p8', availability: 'preorder' })
            ]).map(({ productId }) => productId)
        ).toEqual(['p1', 'p3', 'p4', 'p5', 'p6', 'p7']);
    });

    it('carries the numbers and the flag of each kept line untouched', () => {
        expect(
            changedMergeLines([
                aLine({
                    productId: 'p1',
                    requested: 2,
                    resulting: 5,
                    reason: 'summed',
                    availability: 'insufficient_stock'
                })
            ])
        ).toEqual([
            {
                productId: 'p1',
                requested: 2,
                resulting: 5,
                reason: 'summed',
                availability: 'insufficient_stock'
            }
        ]);
    });

    it('does not turn a short line that landed as asked into a changed one', () => {
        const [line] = changedMergeLines([
            aLine({
                productId: 'p1',
                requested: 3,
                resulting: 3,
                availability: 'insufficient_stock'
            })
        ]);

        expect(line?.reason).toBeUndefined();
        expect(line?.availability).toBe('insufficient_stock');
    });

    it('is empty when every line landed as asked and fits the stock', () => {
        expect(changedMergeLines([aLine({ productId: 'p1', requested: 2, resulting: 2 })])).toEqual(
            []
        );
    });

    it('is empty for an answer with no lines', () => {
        expect(changedMergeLines([])).toEqual([]);
    });
});

describe('mergeReportKind', () => {
    it.each([
        ['a removed product', 'gone', { reason: 'removed', availability: 'in_stock' }],
        [
            'a gone product also flagged short',
            'gone',
            { reason: 'removed', availability: 'insufficient_stock' }
        ],
        ['a sold-out line that landed as asked', 'short', { availability: 'out_of_stock' }],
        ['an off-sale line that landed as asked', 'off-sale', { availability: 'unavailable' }],
        ['a summed off-sale line', 'off-sale', { reason: 'summed', availability: 'unavailable' }],
        ['a short line that landed as asked', 'short', { availability: 'insufficient_stock' }],
        [
            'a summed line that is short',
            'short',
            { reason: 'summed', availability: 'insufficient_stock' }
        ],
        ['a summed line in stock', 'changed', { reason: 'summed', availability: 'in_stock' }],
        ['a capped line in stock', 'changed', { reason: 'capped', availability: 'in_stock' }]
    ] as const)('sorts %s as %s', (_name, kind, flags) => {
        expect(mergeReportKind({ productId: 'p1', requested: 2, resulting: 2, ...flags })).toBe(
            kind
        );
    });
});
