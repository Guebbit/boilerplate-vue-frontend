/**
 * The delivery store — transport-mocked like the wishlist's spec. Worth pinning: the methods
 * list mirrors the API, `effectivePrice` applies the free-above rule for DISPLAY exactly as the
 * BE prices it for real, and a 404 on the shipment read is "nothing shipped yet".
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useDeliveryStore } from '@/modules/delivery/store.ts';

const METHODS = [
    { id: 'standard', price: 5, freeAbove: 100 },
    { id: 'express', price: 15 }
];

let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        const answer = responses[key];
        if (answer === undefined) return Promise.reject(new Error(`404 ${key}`));
        return Promise.resolve(answer);
    })
}));

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        'GET /delivery/methods': { data: { methods: METHODS } },
        'GET /delivery/order/order-1': {
            data: { id: 's1', orderId: 'order-1', trackingCode: 'TRK-1', status: 'shipped' }
        },
        'POST /delivery/advance': { data: { advanced: 2 } }
    };
});

describe('fetchMethods', () => {
    it('mirrors the API list', () => {
        const store = useDeliveryStore();
        return store.fetchMethods().then(() => {
            expect(store.methods.map(({ id }) => id)).toEqual(['standard', 'express']);
        });
    });
});

describe('effectivePrice', () => {
    it('applies the free-above rule at the threshold and not below it', () => {
        const store = useDeliveryStore();
        expect(store.effectivePrice(METHODS[0]!, 99.99)).toBe(5);
        expect(store.effectivePrice(METHODS[0]!, 100)).toBe(0);
        // No threshold — never free, whatever the basket.
        expect(store.effectivePrice(METHODS[1]!, 1_000_000)).toBe(15);
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
});

describe('advance', () => {
    it('answers how many parcels arrived', () => {
        const store = useDeliveryStore();
        return store.advance().then((advanced) => {
            expect(advanced).toBe(2);
        });
    });
});
