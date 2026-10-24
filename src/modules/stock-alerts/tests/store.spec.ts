/**
 * @module
 * The stock-alerts store — whole-list replacement, the "already asked" set, and the shared read.
 *
 * Transport-mocked like the wishlist store's spec: `orvalMutator` is a router keyed on
 * `METHOD /url`, everything above it is real.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useStockAlertsStore } from '../store.ts';
import { orvalMutator } from '@/infrastructure/http';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

/** Canned response per `METHOD /url` key, set by each test before it acts. */
let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        return Promise.resolve(parseOrvalFixture(config.method, config.url, responses[key]));
    })
}));

/** URLs of every request the mocked transport has seen, in call order. */
const requestedUrls = () =>
    vi.mocked(orvalMutator).mock.calls.map((call) => (call[0] as { url: string }).url);

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    const asked = { items: [{ productId: 'p1', createdAt: '2026-10-18T09:00:00Z' }] };
    responses = {
        'GET /stock-alerts': orvalEnvelope(asked),
        'POST /stock-alerts/p1': orvalEnvelope(asked),
        'DELETE /stock-alerts/p1': orvalEnvelope({ items: [] })
    };
});

describe('the stock-alerts store', () => {
    it('replaces the list with what the API answered, and knows which products were asked', async () => {
        const store = useStockAlertsStore();

        await store.fetchStockAlerts();

        expect(store.items).toHaveLength(1);
        expect(store.isAsked('p1')).toBe(true);
        expect(store.isAsked('p2')).toBe(false);
    });

    it('asks with a POST and cancels with a DELETE, each replacing the list', async () => {
        const store = useStockAlertsStore();

        await store.ask('p1');
        expect(store.isAsked('p1')).toBe(true);
        await store.cancel('p1');

        expect(store.isAsked('p1')).toBe(false);
        expect(requestedUrls()).toEqual(['/stock-alerts/p1', '/stock-alerts/p1']);
    });

    it('reads once for fifty buttons on a grid', async () => {
        const store = useStockAlertsStore();

        await Promise.all([store.ensureStockAlerts(), store.ensureStockAlerts()]);
        await store.ensureStockAlerts();

        expect(requestedUrls()).toEqual(['/stock-alerts']);
    });
});
