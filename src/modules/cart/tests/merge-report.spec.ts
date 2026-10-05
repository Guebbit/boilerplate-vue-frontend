/**
 * @module
 * Which lines of a merge answer reach the shopper, and what kind of news each is: a line is
 * listed when its quantity is not what was asked (`reason`), when it is short of stock, or when it
 * could not be added. The numbers are passed through untouched, and none of them is a stock count.
 */
import { describe, expect, it } from 'vitest';
import { changedMergeLines, mergeReportKind } from '@/modules/cart/domain';
import type { MergeLineResult } from '@types';

/**
 * A merge answer's line: as asked and in stock unless the case says otherwise.
 *
 * @param line - What differs from "landed as asked, fits the stock".
 * @returns The line as the server answers it.
 */
const aLine = (line: Partial<MergeLineResult> & Pick<MergeLineResult, 'productId'>) =>
    ({ requested: 1, resulting: 1, insufficientStock: false, ...line }) satisfies MergeLineResult;

describe('changedMergeLines', () => {
    it('keeps a line with a reason, a short line and a gone line, in the answer order', () => {
        expect(
            changedMergeLines([
                aLine({ productId: 'p1', requested: 2, resulting: 5, reason: 'summed' }),
                aLine({ productId: 'p2' }),
                aLine({ productId: 'p3', requested: 1000, resulting: 999, reason: 'capped' }),
                aLine({ productId: 'p4', requested: 4, resulting: 4, insufficientStock: true }),
                aLine({ productId: 'p5', resulting: 0, reason: 'unavailable' })
            ]).map(({ productId }) => productId)
        ).toEqual(['p1', 'p3', 'p4', 'p5']);
    });

    it('carries the numbers and the flag of each kept line untouched', () => {
        expect(
            changedMergeLines([
                aLine({
                    productId: 'p1',
                    requested: 2,
                    resulting: 5,
                    reason: 'summed',
                    insufficientStock: true
                })
            ])
        ).toEqual([
            {
                productId: 'p1',
                requested: 2,
                resulting: 5,
                reason: 'summed',
                insufficientStock: true
            }
        ]);
    });

    it('does not turn a short line that landed as asked into a changed one', () => {
        const [line] = changedMergeLines([
            aLine({ productId: 'p1', requested: 3, resulting: 3, insufficientStock: true })
        ]);

        expect(line?.reason).toBeUndefined();
        expect(line?.insufficientStock).toBe(true);
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
        ['an unavailable product', 'gone', { reason: 'unavailable', insufficientStock: false }],
        [
            'a gone product also flagged short',
            'gone',
            { reason: 'unavailable', insufficientStock: true }
        ],
        ['a short line that landed as asked', 'short', { insufficientStock: true }],
        ['a summed line that is short', 'short', { reason: 'summed', insufficientStock: true }],
        ['a summed line in stock', 'changed', { reason: 'summed', insufficientStock: false }],
        ['a capped line in stock', 'changed', { reason: 'capped', insufficientStock: false }]
    ] as const)('sorts %s as %s', (_name, kind, flags) => {
        expect(mergeReportKind({ productId: 'p1', requested: 2, resulting: 2, ...flags })).toBe(
            kind
        );
    });
});
