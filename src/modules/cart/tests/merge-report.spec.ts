/**
 * @module
 * Which lines of a merge answer reach the shopper, and what kind of news each is: a line is
 * listed when its quantity is not what was asked (`reason`), when stock held it back (a warning),
 * or when it could not be added. The numbers are passed through untouched.
 */
import { describe, expect, it } from 'vitest';
import { changedMergeLines, mergeReportKind } from '../domain';
import type { CartWarning, MergeLineResult } from '@types';

/**
 * A merge answer's line: as asked unless the case says otherwise.
 *
 * @param line - What differs from "landed as asked".
 * @returns The line as the server answers it.
 */
const aLine = (line: Partial<MergeLineResult> & Pick<MergeLineResult, 'productId'>) =>
    ({ requested: 1, resulting: 1, ...line }) satisfies MergeLineResult;

/**
 * An answer's warning for a product.
 *
 * @param warning - The code and numbers; the product defaults to `p1`.
 * @returns The warning as the server answers it.
 */
const aWarning = (warning: Partial<CartWarning> & Pick<CartWarning, 'code'>) =>
    ({ productId: 'p1', requested: 1, resulting: 0, ...warning }) satisfies CartWarning;

describe('changedMergeLines', () => {
    it('keeps a line with a reason, a warned line and a gone line, in the answer order', () => {
        expect(
            changedMergeLines(
                [
                    aLine({ productId: 'p1', requested: 2, resulting: 5, reason: 'summed' }),
                    aLine({ productId: 'p2' }),
                    aLine({ productId: 'p3', requested: 1000, resulting: 999, reason: 'capped' }),
                    aLine({ productId: 'p4', requested: 4, resulting: 3 }),
                    aLine({ productId: 'p5', resulting: 0, reason: 'removed' }),
                    aLine({ productId: 'p6', resulting: 0 })
                ],
                [
                    aWarning({
                        code: 'MERCHANDISE_NOT_ENOUGH_STOCK',
                        productId: 'p4',
                        requested: 4,
                        resulting: 3
                    }),
                    aWarning({ code: 'MERCHANDISE_OUT_OF_STOCK', productId: 'p6', resulting: 0 })
                ]
            ).map(({ productId }) => productId)
        ).toEqual(['p1', 'p3', 'p4', 'p5', 'p6']);
    });

    it('carries the numbers and the warning of each kept line untouched', () => {
        expect(
            changedMergeLines(
                [aLine({ productId: 'p1', requested: 2, resulting: 5, reason: 'summed' })],
                [
                    aWarning({
                        code: 'MERCHANDISE_NOT_ENOUGH_STOCK',
                        productId: 'p1',
                        requested: 7,
                        resulting: 5
                    })
                ]
            )
        ).toEqual([
            {
                productId: 'p1',
                requested: 2,
                resulting: 5,
                reason: 'summed',
                warning: 'MERCHANDISE_NOT_ENOUGH_STOCK'
            }
        ]);
    });

    it('gives each of a product’s two lines its own warning', () => {
        const lines = changedMergeLines(
            [
                aLine({ productId: 'p1', requested: 3, resulting: 2 }),
                aLine({ productId: 'p1', requested: 3, resulting: 2, reason: 'summed' })
            ],
            [
                aWarning({ code: 'MERCHANDISE_NOT_ENOUGH_STOCK', requested: 3, resulting: 2 }),
                aWarning({ code: 'MERCHANDISE_NOT_ENOUGH_STOCK', requested: 5, resulting: 2 })
            ]
        );

        expect(lines.map(({ warning }) => warning)).toEqual([
            'MERCHANDISE_NOT_ENOUGH_STOCK',
            'MERCHANDISE_NOT_ENOUGH_STOCK'
        ]);
    });

    it('is empty when every line landed as asked', () => {
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
        ['a removed product', 'gone', { reason: 'removed' }],
        ['a product the full cart refused', 'gone', { reason: 'cart_full' }],
        [
            'a gone product also warned',
            'gone',
            { reason: 'removed', warning: 'MERCHANDISE_NOT_ENOUGH_STOCK' }
        ],
        ['a sold-out line', 'sold-out', { warning: 'MERCHANDISE_OUT_OF_STOCK' }],
        [
            'a summed sold-out line',
            'sold-out',
            { reason: 'summed', warning: 'MERCHANDISE_OUT_OF_STOCK' }
        ],
        ['a short line', 'short', { warning: 'MERCHANDISE_NOT_ENOUGH_STOCK' }],
        [
            'a summed line that is short',
            'short',
            { reason: 'summed', warning: 'MERCHANDISE_NOT_ENOUGH_STOCK' }
        ],
        ['a summed line', 'changed', { reason: 'summed' }],
        ['a capped line', 'changed', { reason: 'capped' }]
    ] as const)('sorts %s as %s', (_name, kind, flags) => {
        expect(mergeReportKind({ productId: 'p1', requested: 2, resulting: 2, ...flags })).toBe(
            kind
        );
    });
});
