/**
 * @module
 * `leftOutByReorder` — which lines of a past order the cart did not get back. Pure, so the
 * cases are plain arrays.
 */
import { describe, expect, it } from 'vitest';
import { leftOutByReorder } from '@/modules/orders/domain';

describe('leftOutByReorder', () => {
    it('names nothing when every product landed', () => {
        const lines = [{ product: { id: 'a', title: 'Alpha' } }, { product: { id: 'b' } }];

        expect(leftOutByReorder(lines, ['b', 'a'])).toEqual([]);
    });

    it('names the products the cart lacks, in the order the lines came', () => {
        const lines = [
            { product: { id: 'a', title: 'Alpha' } },
            { product: { id: 'b', title: 'Beta' } },
            { product: { id: 'c', title: 'Gamma' } }
        ];

        expect(leftOutByReorder(lines, ['b'])).toEqual(['Alpha', 'Gamma']);
    });

    it('falls back to the id when the frozen line has no title', () => {
        expect(leftOutByReorder([{ product: { id: 'p9', title: '' } }], [])).toEqual(['p9']);
    });
});
