/**
 * @module
 * The delivery store — transport-mocked like the wishlist's spec. Worth pinning: the methods
 * list mirrors the API, the fulfilment read fills both lists (empty is an answer, not an error),
 * every write sends the body the contract accepts and ends by re-reading the order's fulfilment,
 * and a failure still rejects.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useDeliveryStore } from '../store.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    contractRequest,
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

import {
    aFulfillmentOrder,
    aPreorderFulfillmentOrder,
    aPreorderSummary,
    aShipment
} from '../../../../tests/support/unit/fixtures.ts';

import * as schemas from '@api/schemas';

wireModulesIntoCore();

/**
 * Fixture methods: one with a free-above threshold and no tracking, one flat-rate and tracked.
 */
const METHODS = [
    {
        id: 'standard',
        price: 5,
        currency: 'EUR',
        freeAbove: 100,
        tracked: false,
        requiresAddress: true
    },
    { id: 'express', price: 15, currency: 'EUR', tracked: true, requiresAddress: true }
];

/**
 * The mocked HTTP responses, keyed `METHOD /url`; reset per test in `beforeEach`.
 */
let responses: Record<string, unknown>;

/**
 * The reject envelope `onResponseReject` builds, which is the only shape a store ever catches.
 */
const rejectWith = (status: number, message: string) =>
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the API's error ENVELOPE is this client's rejection contract
    Promise.reject({ success: false, status, message, errors: [{ code: 'STUB_ERROR', message }] });

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        const answer = responses[key];
        if (answer === undefined) return rejectWith(404, `Not found: ${key}`);
        if (answer instanceof Error) return rejectWith(500, answer.message);
        return Promise.resolve(parseOrvalFixture(config.method, config.url, answer));
    })
}));

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        'GET /delivery/methods': orvalEnvelope({ methods: METHODS, shipToCountries: ['IT'] }),
        'GET /delivery/order/o1': orvalEnvelope({
            fulfillmentOrders: [aFulfillmentOrder()],
            shipments: [aShipment({ trackingCode: 'TRK-1' })]
        }),
        'POST /delivery/fulfillment-orders/fo1/shipments': orvalEnvelope(
            aShipment({ id: 's2', trackingCode: 'TRK-2' }),
            201
        ),
        'POST /delivery/fulfillment-orders/fo1/fulfill': orvalEnvelope(
            aShipment({ id: 's3', status: 'delivered' }),
            201
        ),
        'POST /delivery/fulfillment-orders/fo1/hold': orvalEnvelope(
            aFulfillmentOrder({ status: 'on_hold', holdReason: 'high_risk' })
        ),
        'POST /delivery/fulfillment-orders/fo1/release': orvalEnvelope(aFulfillmentOrder()),
        'POST /delivery/fulfillment-orders/fo1/confirm-wait': orvalEnvelope(
            aFulfillmentOrder({ consent: 'confirmed' })
        ),
        'PATCH /delivery/shipments/s1': orvalEnvelope(aShipment({ trackingCode: 'TRK-9' })),
        'POST /delivery/shipments/s1/deliver': orvalEnvelope(aShipment({ status: 'delivered' })),
        'POST /delivery/order/order-3/start': orvalEnvelope({
            id: 'order-3',
            userId: 'u1',
            email: 'shopper@example.com',
            items: [],
            totalItems: 0,
            totalQuantity: 0,
            totalPrice: 0,
            netTotal: 0,
            taxTotal: 0,
            shippingNetAmount: 0,
            shippingTaxAmount: 0,
            taxSummary: [],
            status: 'processing'
        })
    };
});

/**
 * The body a write was sent with, read off the mocked transport.
 *
 * @param method - HTTP method of the call.
 * @param url - URL of the call.
 * @returns The `data` the call carried.
 */
const sentBody = async (method: string, url: string) => {
    const { orvalMutator } = await import('@/infrastructure/http');
    const call = vi
        .mocked(orvalMutator)
        .mock.calls.find(([config]) => config.method === method && config.url === url);
    const data: unknown = call?.[0].data;
    return data;
};

describe('fetchMethods', () => {
    it('mirrors the API list', () => {
        const store = useDeliveryStore();
        return store.fetchMethods().then(() => {
            expect(store.methods.map(({ id }) => id)).toEqual(['standard', 'express']);
        });
    });

    it('takes no query param — the list is unfiltered', async () => {
        const { orvalMutator } = await import('@/infrastructure/http');
        const store = useDeliveryStore();
        return store.fetchMethods().then(() => {
            const call = vi
                .mocked(orvalMutator)
                .mock.calls.find(([config]) => config.url === '/delivery/methods');
            expect(call?.[0].params).toBeUndefined();
        });
    });

    /**
     * The deployment's ship-to list, alongside the methods it was fetched with — narrows
     * the address form's country choices at checkout without a separate round trip.
     */
    it('mirrors the ship-to countries list', () => {
        const store = useDeliveryStore();
        return store.fetchMethods().then(() => {
            expect(store.shipToCountries).toEqual(['IT']);
        });
    });
});

describe('fetchFulfillmentForOrder', () => {
    it('mirrors both lists', () => {
        const store = useDeliveryStore();
        return store.fetchFulfillmentForOrder('o1').then(() => {
            expect(store.fulfillmentOrders.map(({ id }) => id)).toEqual(['fo1']);
            expect(store.shipments.map(({ trackingCode }) => trackingCode)).toEqual(['TRK-1']);
        });
    });

    /**
     * An order not paid yet answers 200 with two empty lists: absence is the answer.
     */
    it('reads two empty lists as "nothing to ship yet"', () => {
        responses['GET /delivery/order/o1'] = orvalEnvelope({
            fulfillmentOrders: [],
            shipments: []
        });
        const store = useDeliveryStore();
        return store.fetchFulfillmentForOrder('o1').then(() => {
            expect(store.fulfillmentOrders).toEqual([]);
            expect(store.shipments).toEqual([]);
        });
    });

    /**
     * A 500 swallowed here would tell the customer nothing has shipped while a parcel is in
     * transit, the one wrong answer this panel can give.
     */
    it('lets a failure through instead of calling it "nothing to ship"', () => {
        responses['GET /delivery/order/o1'] = new Error('Internal Server Error');
        const store = useDeliveryStore();
        return expect(store.fetchFulfillmentForOrder('o1')).rejects.toMatchObject({ status: 500 });
    });
});

describe('start', () => {
    it('resolves once fulfilment starts, without touching the lists — this module owns no order data', () => {
        const store = useDeliveryStore();
        return store.start('order-3').then((result) => {
            expect(result).toBeUndefined();
            expect(store.fulfillmentOrders).toEqual([]);
        });
    });
});

describe('ship', () => {
    it('sends only what it was given, and re-reads the order afterwards', async () => {
        const store = useDeliveryStore();
        const shipment = await store.ship('fo1', {
            lines: [{ productId: 'p1', quantity: 1 }],
            trackingCode: 'TRK-2'
        });

        expect(shipment?.id).toBe('s2');
        expect(
            contractRequest(
                schemas.ShipFulfillmentOrderBody,
                await sentBody('POST', '/delivery/fulfillment-orders/fo1/shipments')
            )
        ).toEqual({ lines: [{ productId: 'p1', quantity: 1 }], trackingCode: 'TRK-2' });
        expect(store.fulfillmentOrders).toHaveLength(1);
    });

    it('carries forced and its reason when overriding', async () => {
        const store = useDeliveryStore();
        await store.ship('fo1', { forced: true, reason: 'warehouse system was down' });

        expect(
            contractRequest(
                schemas.ShipFulfillmentOrderBody,
                await sentBody('POST', '/delivery/fulfillment-orders/fo1/shipments')
            )
        ).toEqual({ forced: true, reason: 'warehouse system was down' });
    });

    it('rejects on a refusal', () => {
        responses['POST /delivery/fulfillment-orders/fo1/shipments'] = new Error(
            'DELIVERY_LINES_INVALID'
        );
        const store = useDeliveryStore();
        return expect(store.ship('fo1')).rejects.toBeDefined();
    });
});

describe('fulfill', () => {
    it('fulfils a digital fulfillment order and re-reads', () => {
        const store = useDeliveryStore();
        return store.fulfill('fo1').then((shipment) => {
            expect(shipment?.status).toBe('delivered');
            expect(store.fulfillmentOrders).toHaveLength(1);
        });
    });

    it('rejects the same way any other refusal does — a 409 on a physical one', () => {
        responses['POST /delivery/fulfillment-orders/fo1/fulfill'] = new Error(
            'DELIVERY_NOT_DIGITAL'
        );
        const store = useDeliveryStore();
        return expect(store.fulfill('fo1')).rejects.toBeDefined();
    });
});

describe('hold and release', () => {
    it('sends the staff reason and note', async () => {
        const store = useDeliveryStore();
        const held = await store.hold('fo1', { reason: 'high_risk', note: 'check the card' });

        expect(held?.status).toBe('on_hold');
        expect(
            contractRequest(
                schemas.HoldFulfillmentOrderBody,
                await sentBody('POST', '/delivery/fulfillment-orders/fo1/hold')
            )
        ).toEqual({ reason: 'high_risk', note: 'check the card' });
    });

    it('releases and re-reads', () => {
        const store = useDeliveryStore();
        return store.release('fo1').then((released) => {
            expect(released?.status).toBe('open');
            expect(store.fulfillmentOrders).toHaveLength(1);
        });
    });
});

/**
 * One page of preorder summaries, claiming a second page exists.
 *
 * @param productId - The product on the page.
 * @param pageNumber - Which page it is.
 */
const summaryPage = (productId: string, pageNumber: number) =>
    orvalEnvelope({
        items: [aPreorderSummary({ productId })],
        meta: { page: pageNumber, pageSize: 100, totalItems: 2, totalPages: 2 }
    });

describe('the preorder board reads', () => {
    it('lists the board with preorder=true added, and keeps the total', async () => {
        responses['GET /delivery/fulfillment-orders'] = orvalEnvelope({
            items: [aPreorderFulfillmentOrder()],
            meta: { page: 1, pageSize: 10, totalItems: 31, totalPages: 4 }
        });
        const { orvalMutator } = await import('@/infrastructure/http');
        const store = useDeliveryStore();

        await store.fetchPreorderBoard({ page: 1, pageSize: 10, late: true });

        expect(store.preorderBoard.map(({ id }) => id)).toEqual(['fo1']);
        expect(store.preorderBoardTotal).toBe(31);
        const call = vi
            .mocked(orvalMutator)
            .mock.calls.find(([config]) => config.url === '/delivery/fulfillment-orders');
        expect(call?.[0].params).toEqual({ page: 1, pageSize: 10, late: true, preorder: true });
    });

    it('reads the summaries page after page until the last', async () => {
        const { orvalMutator } = await import('@/infrastructure/http');
        vi.mocked(orvalMutator)
            .mockImplementationOnce((config) =>
                Promise.resolve(parseOrvalFixture('GET', config.url ?? '', summaryPage('p1', 1)))
            )
            .mockImplementationOnce((config) =>
                Promise.resolve(parseOrvalFixture('GET', config.url ?? '', summaryPage('p2', 2)))
            );
        const store = useDeliveryStore();

        await store.fetchPreorderSummaries();

        expect(store.preorderSummaries.map(({ productId }) => productId)).toEqual(['p1', 'p2']);
    });
});

describe('confirmWait', () => {
    it('answers "keep waiting" with no body and re-reads the order', async () => {
        const store = useDeliveryStore();
        const confirmed = await store.confirmWait('fo1');

        expect(confirmed?.consent).toBe('confirmed');
        expect(
            await sentBody('POST', '/delivery/fulfillment-orders/fo1/confirm-wait')
        ).toBeUndefined();
        expect(store.fulfillmentOrders).toHaveLength(1);
    });

    it('rejects when the server is no longer waiting for an answer', () => {
        responses['POST /delivery/fulfillment-orders/fo1/confirm-wait'] = new Error(
            'DELIVERY_NOT_AWAITING_ANSWER'
        );
        const store = useDeliveryStore();
        return expect(store.confirmWait('fo1')).rejects.toBeDefined();
    });
});

describe('deliver', () => {
    it('records the arrival of one shipment and re-reads', () => {
        const store = useDeliveryStore();
        return store.deliver('s1').then((shipment) => {
            expect(shipment?.status).toBe('delivered');
        });
    });

    it('omits forced/reason when not forcing', async () => {
        const store = useDeliveryStore();
        await store.deliver('s1');

        expect(
            contractRequest(
                schemas.DeliverShipmentBody,
                await sentBody('POST', '/delivery/shipments/s1/deliver')
            )
        ).toEqual({});
    });

    it('carries forced/reason when overriding', async () => {
        const store = useDeliveryStore();
        await store.deliver('s1', true, 'customer disputed delivery');

        expect(
            contractRequest(
                schemas.DeliverShipmentBody,
                await sentBody('POST', '/delivery/shipments/s1/deliver')
            )
        ).toEqual({ forced: true, reason: 'customer disputed delivery' });
    });
});

describe('editTracking', () => {
    it('sends the corrected code and re-reads', async () => {
        const store = useDeliveryStore();
        const shipment = await store.editTracking('s1', 'TRK-9');

        expect(shipment?.trackingCode).toBe('TRK-9');
        expect(
            contractRequest(
                schemas.UpdateShipmentBody,
                await sentBody('PATCH', '/delivery/shipments/s1')
            )
        ).toEqual({ trackingCode: 'TRK-9' });
    });
});
