/**
 * @module
 * Unit tests for the webhooks store, mocking `orvalMutator` directly and inspecting the raw
 * requests sent by the store's actions — same shape as the users/products stores' tests.
 *
 * The tests with no equivalent anywhere else: `createSubscription` and `rotateSecret` both
 * receive a plaintext secret meant to be shown exactly once, and neither may leave it parked in
 * this store's cached state. See `store.ts`'s module docblock for why.
 *
 * Each `it` RETURNS its chain rather than awaiting — vitest fails a test whose returned promise
 * rejects, so the assertions inside a `.then` are as binding as awaited ones. See
 * `docs/tools/unit-testing.md`.
 */
import { asStub } from '../../../../tests/support/stub';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useWebhooksStore } from '@/modules/webhooks/store';
import { orvalMutator } from '@/infrastructure/http';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

const SUBSCRIPTION = {
    id: 'sub1',
    url: 'https://example.com/hook',
    eventTypes: ['order.created'],
    enabled: true,
    consecutiveFailures: 0,
    secretIds: ['sec1'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
};

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) =>
        Promise.resolve(
            parseOrvalFixture(
                config.method,
                config.url,
                config.method?.toUpperCase() === 'DELETE'
                    ? orvalEnvelope()
                    : orvalEnvelope(SUBSCRIPTION)
            )
        )
    )
}));

/**
 * The config handed to `orvalMutator` on its most recent call.
 */
const lastRequest = () => {
    const call = vi.mocked(orvalMutator).mock.calls.at(-1);
    if (!call) throw new Error('orvalMutator was never called');
    return call[0] as { url: string; method: string; data?: unknown; params?: unknown };
};

/**
 * The JSON body of the most recent request.
 */
const lastBody = () => asStub<{ data: Record<string, unknown> }>(lastRequest()).data;

/**
 * The query parameters of the most recent request.
 */
const lastParameters = () => asStub<{ params: Record<string, unknown> }>(lastRequest()).params;

/**
 * Makes the transport answer with a paginated envelope of the given items for this test.
 */
const respondWithItems = (items: unknown[]) =>
    vi.mocked(orvalMutator).mockImplementation((config: { url?: string; method?: string }) =>
        Promise.resolve(
            parseOrvalFixture(
                config.method,
                config.url,
                orvalEnvelope({
                    items,
                    meta: { page: 1, pageSize: 10, totalItems: items.length, totalPages: 1 }
                })
            )
        )
    );

/**
 * Makes the transport answer one call with `data`, verbatim — for responses
 * `parseOrvalFixture`/`orvalEnvelope`'s single-record helper cannot express, namely the
 * secret-carrying create/rotate envelopes (`secret`/`newSecret` are not part of the schema the
 * plain record fixture validates against, since the real contract only declares them on the
 * create/update response schemas specifically).
 */
const respondOnceWith = (data: unknown) =>
    vi
        .mocked(orvalMutator)
        .mockImplementationOnce((config: { url?: string; method?: string }) =>
            Promise.resolve(parseOrvalFixture(config.method, config.url, orvalEnvelope(data)))
        );

describe('useWebhooksStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    describe('createSubscription', () => {
        it('posts to /webhooks/subscriptions', () =>
            useWebhooksStore()
                .createSubscription({
                    url: 'https://example.com/hook',
                    eventTypes: ['order.created']
                })
                .then(() => {
                    expect(lastRequest()).toMatchObject({
                        url: '/webhooks/subscriptions',
                        method: 'POST'
                    });
                    expect(lastBody()).toMatchObject({
                        url: 'https://example.com/hook',
                        eventTypes: ['order.created']
                    });
                }));

        it('returns the plaintext secret to the caller', () => {
            respondOnceWith({ ...SUBSCRIPTION, secret: 'whsec_abc123' });

            return useWebhooksStore()
                .createSubscription({ url: SUBSCRIPTION.url, eventTypes: SUBSCRIPTION.eventTypes })
                .then((created) => {
                    expect(created?.secret).toBe('whsec_abc123');
                });
        });

        it('never parks the plaintext secret in store state', () => {
            respondOnceWith({ ...SUBSCRIPTION, secret: 'whsec_abc123' });

            return useWebhooksStore()
                .createSubscription({ url: SUBSCRIPTION.url, eventTypes: SUBSCRIPTION.eventTypes })
                .then(() => {
                    const store = useWebhooksStore();
                    expect(JSON.stringify(store.subscriptions)).not.toContain('whsec_abc123');
                    expect(store.subscriptions[SUBSCRIPTION.id]).not.toHaveProperty('secret');
                });
        });

        it('still caches the subscription itself, secret aside', () => {
            respondOnceWith({ ...SUBSCRIPTION, secret: 'whsec_abc123' });

            return useWebhooksStore()
                .createSubscription({ url: SUBSCRIPTION.url, eventTypes: SUBSCRIPTION.eventTypes })
                .then(() => {
                    const store = useWebhooksStore();
                    expect(store.subscriptions[SUBSCRIPTION.id]).toMatchObject({
                        id: SUBSCRIPTION.id,
                        url: SUBSCRIPTION.url
                    });
                });
        });
    });

    describe('rotateSecret', () => {
        it('patches with rotateSecret: true', () =>
            useWebhooksStore()
                .rotateSecret('sub1')
                .then(() => {
                    expect(lastRequest()).toMatchObject({
                        url: '/webhooks/subscriptions/sub1',
                        method: 'PATCH'
                    });
                    expect(lastBody()).toMatchObject({ rotateSecret: true });
                }));

        it('returns the plaintext newSecret to the caller', () => {
            respondOnceWith({ ...SUBSCRIPTION, newSecret: 'whsec_def456' });

            return useWebhooksStore()
                .rotateSecret('sub1')
                .then((updated) => {
                    expect(updated?.newSecret).toBe('whsec_def456');
                });
        });

        it('never parks the plaintext newSecret in store state', () => {
            respondOnceWith({ ...SUBSCRIPTION, newSecret: 'whsec_def456' });

            return useWebhooksStore()
                .rotateSecret('sub1')
                .then(() => {
                    const store = useWebhooksStore();
                    expect(JSON.stringify(store.subscriptions)).not.toContain('whsec_def456');
                    expect(store.subscriptions.sub1).not.toHaveProperty('newSecret');
                    expect(store.subscriptions.sub1).not.toHaveProperty('secret');
                });
        });
    });

    describe('removeSecret', () => {
        it('patches with the removeSecretId, over the generic update path', () =>
            useWebhooksStore()
                .removeSecret('sub1', 'sec1')
                .then(() => {
                    expect(lastRequest()).toMatchObject({
                        url: '/webhooks/subscriptions/sub1',
                        method: 'PATCH'
                    });
                    expect(lastBody()).toMatchObject({ removeSecretId: 'sec1' });
                }));
    });

    describe('updateSubscription', () => {
        it('patches ordinary fields', () =>
            useWebhooksStore()
                .updateSubscription('sub1', { enabled: false })
                .then(() => {
                    expect(lastRequest()).toMatchObject({
                        url: '/webhooks/subscriptions/sub1',
                        method: 'PATCH'
                    });
                    expect(lastBody()).toMatchObject({ enabled: false });
                }));
    });

    describe('deleteSubscription', () => {
        it('calls the delete endpoint with the subscription id', () =>
            useWebhooksStore()
                .deleteSubscription('sub1')
                .then(() => {
                    expect(lastRequest()).toMatchObject({
                        url: '/webhooks/subscriptions/sub1',
                        method: 'DELETE'
                    });
                }));
    });

    describe('replayDelivery', () => {
        it('posts to the replay endpoint and updates the cached row in place', () => {
            const DELIVERY = {
                id: 'del1',
                subscriptionId: 'sub1',
                eventId: 'evt1',
                eventType: 'order.created',
                attempt: 2,
                status: 'succeeded',
                responseCode: 200,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z'
            };
            respondOnceWith(DELIVERY);

            return useWebhooksStore()
                .replayDelivery('del1')
                .then(() => {
                    expect(lastRequest()).toMatchObject({
                        url: '/webhooks/deliveries/del1/replay',
                        method: 'POST'
                    });
                    expect(useWebhooksStore().deliveries.del1).toMatchObject({
                        status: 'succeeded',
                        responseCode: 200
                    });
                });
        });
    });

    describe('read paths', () => {
        it('fetchAllSubscriptions requests the full page size', () => {
            respondWithItems([SUBSCRIPTION]);

            return useWebhooksStore()
                .fetchAllSubscriptions()
                .then((result) => {
                    expect(lastRequest()).toMatchObject({
                        url: '/webhooks/subscriptions',
                        method: 'GET'
                    });
                    expect(lastParameters()).toMatchObject({ pageSize: 100 });
                    expect(result).toEqual([SUBSCRIPTION]);
                });
        });

        it('watchSubscriptionsSearch sends the enabled filter', () => {
            respondWithItems([]);
            const store = useWebhooksStore();
            store.subscriptionFilters = { enabled: true };

            return store
                .watchSubscriptionsSearch()
                .search()
                .then(() => {
                    expect(lastRequest()).toMatchObject({
                        url: '/webhooks/subscriptions',
                        method: 'GET'
                    });
                    expect(lastParameters()).toMatchObject({ enabled: true });
                });
        });

        it('watchDeliveriesSearch sends the subscription and status filters', () => {
            respondWithItems([]);
            const store = useWebhooksStore();
            store.deliveryFilters = { subscriptionId: 'sub1', status: 'failed' };

            return store
                .watchDeliveriesSearch()
                .search()
                .then(() => {
                    expect(lastRequest()).toMatchObject({
                        url: '/webhooks/deliveries',
                        method: 'GET'
                    });
                    expect(lastParameters()).toMatchObject({
                        subscriptionId: 'sub1',
                        status: 'failed'
                    });
                });
        });

        it('fetchEventCatalogue requests the event catalogue', () => {
            vi.mocked(orvalMutator).mockImplementation(
                (config: { url?: string; method?: string }) =>
                    Promise.resolve(
                        parseOrvalFixture(
                            config.method,
                            config.url,
                            orvalEnvelope([{ name: 'order.created' }])
                        )
                    )
            );

            return useWebhooksStore()
                .fetchEventCatalogue()
                .then(() => {
                    expect(lastRequest()).toMatchObject({ url: '/webhooks/events', method: 'GET' });
                    expect(useWebhooksStore().eventCatalogue).toEqual([{ name: 'order.created' }]);
                });
        });
    });
});
