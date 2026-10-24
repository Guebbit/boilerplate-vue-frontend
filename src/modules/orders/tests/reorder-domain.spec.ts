/**
 * @module
 * `reorderOutcome` — what a reorder answer says did not land cleanly. Pure, so the cases are
 * plain arrays.
 */
import { describe, expect, it } from 'vitest';
import type { MergeLineResult } from '@types';
import { reorderOutcome } from '../domain';

/**
 * One result of the answer.
 *
 * @param productId - the product the line is for
 * @param reason - why it did not land as asked, if it did not
 * @returns a result for the line
 */
const result = (productId: string, reason?: MergeLineResult['reason']): MergeLineResult => ({
    productId,
    requested: 1,
    resulting: 1,
    availability: 'in_stock',
    ...(reason ? { reason } : {})
});

describe('reorderOutcome', () => {
    it('names nothing when every line landed, a sum included', () => {
        const lines = [{ product: { id: 'a', title: 'Alpha' } }, { product: { id: 'b' } }];

        expect(reorderOutcome(lines, [result('b', 'summed'), result('a')])).toEqual({
            gone: [],
            capped: []
        });
    });

    it('sorts removed and capped lines apart, in the order the answer came', () => {
        const lines = [
            { product: { id: 'a', title: 'Alpha' } },
            { product: { id: 'b', title: 'Beta' } },
            { product: { id: 'c', title: 'Gamma' } },
            { product: { id: 'd', title: 'Delta' } }
        ];

        expect(
            reorderOutcome(lines, [
                result('a', 'removed'),
                result('b'),
                result('c', 'capped'),
                result('d', 'removed')
            ])
        ).toEqual({ gone: ['Alpha', 'Delta'], capped: ['Gamma'] });
    });

    it('falls back to the id when the frozen line has no title', () => {
        expect(
            reorderOutcome([{ product: { id: 'p9', title: '' } }], [result('p9', 'removed')])
        ).toEqual({ gone: ['p9'], capped: [] });
    });
});
