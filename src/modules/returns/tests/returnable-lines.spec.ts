/**
 * @module
 * What the returns form offers: each product's ordered quantity less what earlier returns hold,
 * without goods that carry no right of withdrawal, and only once goods have shipped.
 */
import { describe, expect, it } from 'vitest';
import { isReturnableOrderStatus, returnableLines } from '../domain/returnable-lines.ts';
import { aReturn, anOrder } from '../../../../tests/support/unit/fixtures.ts';
import type { Order } from '@types';

/**
 * One order line, with the fields the arithmetic reads.
 *
 * @param id - the product id
 * @param quantity - how many were ordered
 * @param noWithdrawal - whether the product carries no right of withdrawal
 * @returns an order line
 */
const line = (id: string, quantity: number, noWithdrawal = false): Order['items'][number] => ({
    product: { id, title: `Product ${id}`, price: 10, taxRate: 0.22, noWithdrawal },
    quantity,
    locale: 'en',
    current: null,
    taxAmount: 0,
    netAmount: 0
});

/**
 * A return holding the given lines.
 *
 * @param status - the return's status
 * @param lines - `[productId, quantity]` pairs
 * @returns a return
 */
const returnOf = (status: 'requested' | 'declined', lines: [string, number][]) =>
    aReturn({
        status,
        lines: lines.map(([productId, quantity]) => ({
            productId,
            quantity,
            title: productId,
            unitPrice: 10
        }))
    });

describe('returnableLines', () => {
    it('offers every line with its full quantity when nothing was returned', () => {
        const { items } = anOrder({ items: [line('p1', 3), line('p2', 1)] });

        expect(returnableLines(items, [])).toEqual([
            { productId: 'p1', title: 'Product p1', ordered: 3, remaining: 3 },
            { productId: 'p2', title: 'Product p2', ordered: 1, remaining: 1 }
        ]);
    });

    it('takes off what an earlier return holds, and drops a line that is fully returned', () => {
        const { items } = anOrder({ items: [line('p1', 3), line('p2', 1)] });

        expect(
            returnableLines(items, [
                returnOf('requested', [
                    ['p1', 2],
                    ['p2', 1]
                ])
            ])
        ).toEqual([{ productId: 'p1', title: 'Product p1', ordered: 3, remaining: 1 }]);
    });

    it('does not count a declined return: it holds nothing', () => {
        const { items } = anOrder({ items: [line('p1', 2)] });

        expect(returnableLines(items, [returnOf('declined', [['p1', 2]])])).toHaveLength(1);
    });

    it('leaves out goods with no right of withdrawal', () => {
        const { items } = anOrder({ items: [line('p1', 1, true), line('p2', 1)] });

        expect(returnableLines(items, []).map((entry) => entry.productId)).toEqual(['p2']);
    });

    it('merges a product that sits on two lines into one', () => {
        const { items } = anOrder({ items: [line('p1', 1), line('p1', 2)] });

        expect(returnableLines(items, [])).toEqual([
            { productId: 'p1', title: 'Product p1', ordered: 3, remaining: 3 }
        ]);
    });
});

describe('isReturnableOrderStatus', () => {
    it.each([
        ['shipped', true],
        ['delivered', true],
        ['pending', false],
        ['paid', false],
        ['cancelled', false],
        [undefined, false]
    ])('%s -> %s', (status, expected) => {
        expect(isReturnableOrderStatus(status)).toBe(expected);
    });
});
