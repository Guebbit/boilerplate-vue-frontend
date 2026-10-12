/**
 * @module
 * The stats store, transport-mocked like the payments one: `orvalMutator` is a router keyed on
 * `METHOD /url`, validated against the contract's own schemas, so a fixture that drifts from the
 * spec fails here. What is worth pinning is that one load fires every block with the period's
 * days, and that a block's answer is held as the API gave it, untouched.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useStatsStore } from '../store.ts';
import { orvalMutator } from '@/infrastructure/http';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

/** The shop zone every period reports. */
const PERIOD = { from: '2026-10-01', to: '2026-10-07', interval: 'day', timeZone: 'Europe/Rome' };

/** One set of figures; every field the contract requires. */
const figures = (totalSales: number) => ({
    orders: 2,
    unitsOrdered: 3,
    unitsReversed: 1,
    netUnits: 2,
    grossSales: 80,
    discounts: 0,
    reversals: 10,
    netSales: 70,
    shipping: 5,
    taxes: 15.4,
    totalSales,
    refunds: 12,
    averageOrderValue: 40
});

/** Canned answers per `METHOD /url`; a missing key rejects like an unknown route. */
let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        const answer = responses[key];
        if (answer === undefined)
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the API's error ENVELOPE is this client's rejection contract
            return Promise.reject({ success: false, status: 404, message: `Not found: ${key}` });
        return Promise.resolve(parseOrvalFixture(config.method, config.url, answer));
    })
}));

/** The params of the request whose URL is `url`. */
const parametersOf = (url: string): unknown =>
    (
        vi
            .mocked(orvalMutator)
            .mock.calls.find((call) => (call[0] as { url: string }).url === url)?.[0] as
            { params?: unknown } | undefined
    )?.params;

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        'GET /stats/sales': orvalEnvelope({
            period: PERIOD,
            currencies: [
                {
                    currency: 'EUR',
                    totals: figures(90),
                    previous: figures(60),
                    buckets: [{ start: '2026-09-30T22:00:00.000Z', figures: figures(90) }]
                }
            ]
        }),
        'GET /stats/products': orvalEnvelope({
            period: PERIOD,
            products: [
                {
                    productId: 'p1',
                    title: 'Kibble',
                    currency: 'EUR',
                    unitsOrdered: 3,
                    unitsReversed: 1,
                    netUnits: 2,
                    netSales: 40
                }
            ]
        }),
        'GET /stats/categories': orvalEnvelope({
            period: PERIOD,
            categories: [{ category: 'Food', currency: 'EUR', unitsOrdered: 3, netSales: 40 }]
        }),
        'GET /stats/payments': orvalEnvelope({
            period: PERIOD,
            rows: [{ method: 'card', provider: 'fake', currency: 'EUR', payments: 2, amount: 90 }]
        }),
        'GET /stats/operations': orvalEnvelope({
            period: PERIOD,
            cancellation: { placed: 4, cancelled: 1, rate: 0.25 },
            returns: { unitsOrdered: 3, unitsReturned: 1, rate: 0.33 },
            refunds: [{ currency: 'EUR', invoiced: 90, credited: 12, rate: 0.13 }]
        }),
        'GET /stats/customers': orvalEnvelope({
            period: PERIOD,
            customers: 2,
            newCustomers: 1,
            returningCustomers: 1,
            returningRate: 0.5
        }),
        'GET /stats/pipeline': orvalEnvelope({
            awaitingTransfers: [{ currency: 'EUR', count: 2, amount: 50 }],
            paidNotShipped: 3
        }),
        'GET /stats/products/p1': orvalEnvelope({
            period: PERIOD,
            productId: 'p1',
            title: 'Kibble',
            buckets: [{ start: '2026-09-30T22:00:00.000Z', unitsOrdered: 3, unitsReversed: 1 }]
        })
    };
});

describe('loadDashboard', () => {
    it('fires every block with the period and holds each answer as given', () => {
        const store = useStatsStore();
        return store
            .loadDashboard({ from: '2026-10-01', to: '2026-10-07', interval: 'day' })
            .then(() => {
                expect(store.sales?.currencies[0].totals.totalSales).toBe(90);
                expect(store.products?.products[0].title).toBe('Kibble');
                expect(store.categories?.categories[0].category).toBe('Food');
                expect(store.paymentMix?.rows[0].provider).toBe('fake');
                expect(store.operations?.cancellation.rate).toBe(0.25);
                expect(store.customers?.returningCustomers).toBe(1);
                expect(store.pipeline?.paidNotShipped).toBe(3);
                expect(parametersOf('/stats/sales')).toEqual({
                    from: '2026-10-01',
                    to: '2026-10-07',
                    interval: 'day'
                });
                expect(parametersOf('/stats/products')).toEqual({
                    from: '2026-10-01',
                    to: '2026-10-07',
                    limit: 10
                });
            });
    });

    it('sends the pipeline no period: it is a snapshot of now', () => {
        const store = useStatsStore();
        return store
            .loadDashboard({ from: '2026-10-01', to: '2026-10-07', interval: 'day' })
            .then(() => {
                expect(parametersOf('/stats/pipeline')).toBeUndefined();
            });
    });

    it('rejects when one block fails, so the page can say so', () => {
        delete responses['GET /stats/customers'];
        const store = useStatsStore();
        return expect(
            store.loadDashboard({ from: '2026-10-01', to: '2026-10-07', interval: 'day' })
        ).rejects.toMatchObject({ status: 404 });
    });
});

describe('loadProductSales', () => {
    it('reads one product with the period', () => {
        const store = useStatsStore();
        return store
            .loadProductSales('p1', { from: '2026-10-01', to: '2026-10-07', interval: 'week' })
            .then((series) => {
                expect(series?.title).toBe('Kibble');
                expect(store.productSeries?.buckets).toHaveLength(1);
                expect(parametersOf('/stats/products/p1')).toEqual({
                    from: '2026-10-01',
                    to: '2026-10-07',
                    interval: 'week'
                });
            });
    });
});
