/**
 * @module
 * The pure helpers behind the ship dialog and the "arrives in N shipments" line. Each case is one
 * way the quantities, or the record counts, can disagree with what the server would accept.
 */
import { describe, expect, it } from 'vitest';
import { readShipLines, shipmentCount, shippableLines } from '../domain/ship-lines.ts';
import { aFulfillmentOrder, aShipment } from '../../../../tests/support/unit/fixtures.ts';

/**
 * Two lines: p1 with 2 left, p2 fully shipped already.
 */
const LINES = [
    {
        productId: 'p1',
        title: 'Shirt',
        quantity: 2,
        shippedQuantity: 0,
        cancelledQuantity: 0,
        remaining: 2
    },
    {
        productId: 'p2',
        title: 'Hat',
        quantity: 1,
        shippedQuantity: 1,
        cancelledQuantity: 0,
        remaining: 0
    }
];

describe('shippableLines', () => {
    it('keeps only the lines with units left', () => {
        expect(shippableLines(LINES).map(({ productId }) => productId)).toEqual(['p1']);
    });
});

describe('readShipLines', () => {
    it('sends the lines with a quantity, and drops a zero', () => {
        const two = [...LINES, { ...LINES[0], productId: 'p3', title: 'Scarf' }];

        expect(readShipLines(two, { p1: '1', p3: '0' })).toEqual({
            valid: true,
            lines: [{ productId: 'p1', quantity: 1 }]
        });
    });

    it.each([
        ['more than remains', { p1: '3' }],
        ['a fraction', { p1: '1.5' }],
        ['a negative', { p1: '-1' }],
        ['nothing at all', { p1: '0' }],
        ['an empty field', {}]
    ])('refuses %s', (_name, typed) => {
        expect(readShipLines(LINES, typed).valid).toBe(false);
    });

    it('never asks for a line with nothing remaining', () => {
        expect(readShipLines(LINES, { p1: '2', p2: '1' }).lines).toEqual([
            { productId: 'p1', quantity: 2 }
        ]);
    });
});

describe('shipmentCount', () => {
    it('counts the physical fulfillment orders still to ship from', () => {
        expect(
            shipmentCount(
                [aFulfillmentOrder({ id: 'a' }), aFulfillmentOrder({ id: 'b', number: 2 })],
                []
            )
        ).toBe(2);
    });

    it('leaves out digital and cancelled fulfillment orders, which carry no parcel', () => {
        expect(
            shipmentCount(
                [
                    aFulfillmentOrder({ id: 'a' }),
                    aFulfillmentOrder({ id: 'b', kind: 'digital' }),
                    aFulfillmentOrder({ id: 'c', status: 'cancelled' })
                ],
                []
            )
        ).toBe(1);
    });

    it('does not shrink as the first parcel leaves, and counts several shipments of one group', () => {
        expect(
            shipmentCount(
                [aFulfillmentOrder({ id: 'a', status: 'closed' })],
                [
                    aShipment({ id: 's1', fulfillmentOrderId: 'a' }),
                    aShipment({ id: 's2', fulfillmentOrderId: 'a', number: 2 })
                ]
            )
        ).toBe(2);
    });

    it('does not count a digital fulfilment as a shipment', () => {
        expect(
            shipmentCount(
                [aFulfillmentOrder({ id: 'a', kind: 'digital', status: 'closed' })],
                [aShipment({ fulfillmentOrderId: 'a', status: 'delivered' })]
            )
        ).toBe(0);
    });
});
