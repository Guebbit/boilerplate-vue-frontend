/**
 * @module
 * The delivery store — transport-mocked like the wishlist's spec. Worth pinning: the methods
 * list mirrors the API, `effectivePrice` applies the free-above rule for DISPLAY exactly as the
 * BE prices it for real, and a 404 on the shipment read is "nothing shipped yet" while any other
 * failure still rejects.
 *
 * The stub rejects with the envelope `onResponseReject` builds. The store tells "nothing shipped
 * yet" from a real failure by reading `status` off it, so nothing else would tell the two apart.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useDeliveryStore } from '@/modules/delivery/store.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

/**
 * Fixture methods: one with a free-above threshold and no tracking, one flat-rate and tracked.
 */
const METHODS = [
    { id: 'standard', price: 5, freeAbove: 100, tracked: false },
    { id: 'express', price: 15, tracked: true }
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
        'GET /delivery/methods': orvalEnvelope({ methods: METHODS }),
        'GET /delivery/order/order-1': orvalEnvelope({
            id: 's1',
            orderId: 'order-1',
            trackingCode: 'TRK-1',
            status: 'shipped'
        }),
        'POST /delivery/order/order-2/ship': orvalEnvelope({
            id: 's2',
            orderId: 'order-2',
            trackingCode: 'TRK-2',
            status: 'shipped'
        }),
        'POST /delivery/order/order-1/deliver': orvalEnvelope({
            id: 's1',
            orderId: 'order-1',
            trackingCode: 'TRK-1',
            status: 'delivered'
        })
    };
});

describe('fetchMethods', () => {
    it('mirrors the API list', () => {
        const store = useDeliveryStore();
        return store.fetchMethods().then(() => {
            expect(store.methods.map(({ id }) => id)).toEqual(['standard', 'express']);
        });
    });

    it('omits the weight param when not given one', async () => {
        const { orvalMutator } = await import('@/infrastructure/http');
        const store = useDeliveryStore();
        return store.fetchMethods().then(() => {
            const call = vi
                .mocked(orvalMutator)
                .mock.calls.find(([config]) => config.url === '/delivery/methods');
            expect(call?.[0].params).toBeUndefined();
        });
    });

    it('forwards a given weight as the query param', async () => {
        const { orvalMutator } = await import('@/infrastructure/http');
        const store = useDeliveryStore();
        return store.fetchMethods(1500).then(() => {
            const call = vi
                .mocked(orvalMutator)
                .mock.calls.find(([config]) => config.url === '/delivery/methods');
            expect(call?.[0].params).toEqual({ weight: 1500 });
        });
    });
});

describe('effectivePrice', () => {
    it('applies the free-above rule at the threshold and not below it', () => {
        const store = useDeliveryStore();
        expect(store.effectivePrice(METHODS[0], 99.99)).toBe(5);
        expect(store.effectivePrice(METHODS[0], 100)).toBe(0);
        // No threshold — never free, whatever the basket.
        expect(store.effectivePrice(METHODS[1], 1_000_000)).toBe(15);
    });
});

describe('fetchShipmentForOrder', () => {
    it('mirrors the parcel, and reads a 404 as "nothing shipped yet"', () => {
        const store = useDeliveryStore();
        return store
            .fetchShipmentForOrder('order-1')
            .then(() => {
                expect(store.shipment?.trackingCode).toBe('TRK-1');
                responses = {};
                return store.fetchShipmentForOrder('order-1');
            })
            .then((shipment) => {
                expect(shipment).toBeUndefined();
                expect(store.shipment).toBeUndefined();
            });
    });

    /**
     * Only 404 means "nothing shipped yet". A 500 swallowed here tells the customer their order
     * has not shipped while the parcel is in transit, which is the one wrong answer this panel
     * can give.
     */
    it('lets any other failure through instead of calling it "nothing shipped yet"', () => {
        responses = { 'GET /delivery/order/order-1': new Error('Internal Server Error') };
        const store = useDeliveryStore();
        return expect(store.fetchShipmentForOrder('order-1')).rejects.toMatchObject({
            status: 500
        });
    });
});

describe('ship', () => {
    it('records the handover and stores the shipment', () => {
        const store = useDeliveryStore();
        return store.ship('order-2', 'TRK-2').then((shipment) => {
            expect(shipment?.status).toBe('shipped');
            expect(store.shipment?.trackingCode).toBe('TRK-2');
        });
    });

    it('omits forced/reason when not forcing', async () => {
        const { orvalMutator } = await import('@/infrastructure/http');
        const store = useDeliveryStore();
        return store.ship('order-2', 'TRK-2').then(() => {
            const call = vi
                .mocked(orvalMutator)
                .mock.calls.find(([config]) => config.url === '/delivery/order/order-2/ship');
            expect(call?.[0].data).toEqual({ trackingCode: 'TRK-2' });
        });
    });

    it('carries forced/reason when overriding', async () => {
        const { orvalMutator } = await import('@/infrastructure/http');
        const store = useDeliveryStore();
        return store.ship('order-2', 'TRK-2', true, 'warehouse system was down').then(() => {
            const call = vi
                .mocked(orvalMutator)
                .mock.calls.find(([config]) => config.url === '/delivery/order/order-2/ship');
            expect(call?.[0].data).toEqual({
                trackingCode: 'TRK-2',
                forced: true,
                reason: 'warehouse system was down'
            });
        });
    });
});

describe('deliver', () => {
    it('records the arrival and stores the shipment', () => {
        const store = useDeliveryStore();
        return store.deliver('order-1').then((shipment) => {
            expect(shipment?.status).toBe('delivered');
            expect(store.shipment?.status).toBe('delivered');
        });
    });

    it('carries forced/reason when overriding', async () => {
        const { orvalMutator } = await import('@/infrastructure/http');
        const store = useDeliveryStore();
        return store.deliver('order-1', true, 'customer disputed delivery').then(() => {
            const call = vi
                .mocked(orvalMutator)
                .mock.calls.find(([config]) => config.url === '/delivery/order/order-1/deliver');
            expect(call?.[0].data).toEqual({ forced: true, reason: 'customer disputed delivery' });
        });
    });
});
