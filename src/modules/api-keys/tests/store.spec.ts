/**
 * @module
 * Unit tests for the api-keys store, mocking `orvalMutator` directly and inspecting the raw
 * requests sent by the store's actions — same shape as `webhooks/tests/store.spec.ts`.
 *
 * The tests with no equivalent anywhere else: `mintCredential` receives a plaintext secret meant
 * to be shown exactly once and must not leave it parked in this store's cached state, and
 * `revokeCredential` patches the cached row by hand rather than through `updateTarget`, since the
 * revoke response carries no updated record. See `store.ts`'s module docblock.
 *
 * Each `it` RETURNS its chain rather than awaiting — vitest fails a test whose returned promise
 * rejects, so the assertions inside a `.then` are as binding as awaited ones. See
 * `docs/tools/unit-testing.md`.
 */
import type { ZodType } from 'zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useApiKeysStore } from '../store';
import { orvalMutator } from '@/infrastructure/http';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    contractRequest,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

import * as schemas from '@api/schemas';

wireModulesIntoCore();

/** An API key record (public prefix only), the shape the mocked API returns. */
const API_KEY = {
    id: 'key1',
    name: 'CI integration',
    publicPrefix: 'a1b2c3d4',
    status: 'active' as const,
    permissions: ['products.read'],
    expiresAt: '2027-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    actions: { revoke: true }
};

vi.mock('@/infrastructure/http', () => ({
    // Only ever hit by POST (mint, which requires `secret`) and DELETE (revoke, bodyless) in this
    // file — every GET/search test installs its own list-shaped mock before calling.
    orvalMutator: vi.fn((config: { url: string; method: string }) =>
        Promise.resolve(
            parseOrvalFixture(
                config.method,
                config.url,
                config.method?.toUpperCase() === 'DELETE'
                    ? undefined
                    : { ...API_KEY, secret: 'sk_a1b2c3d4_default' }
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
const lastBody = (schema: ZodType) => contractRequest(schema, lastRequest().data);

/**
 * Makes the transport answer one call with `data`, verbatim — for the secret-carrying mint
 * envelope, which the plain record fixture above cannot express (`secret` is only part of the
 * mint response schema, not the list one).
 */
const respondOnceWith = (data: unknown) =>
    vi
        .mocked(orvalMutator)
        .mockImplementationOnce((config: { url?: string; method?: string }) =>
            Promise.resolve(parseOrvalFixture(config.method, config.url, data))
        );

describe('useApiKeysStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    describe('mintCredential', () => {
        it('posts to /api-keys', () =>
            useApiKeysStore()
                .mintCredential({
                    name: 'CI integration',
                    permissions: ['products.read'],
                    expiresAt: API_KEY.expiresAt
                })
                .then(() => {
                    expect(lastRequest()).toMatchObject({ url: '/api-keys', method: 'POST' });
                    expect(lastBody(schemas.MintApiKeyBody)).toMatchObject({
                        name: 'CI integration',
                        permissions: ['products.read'],
                        expiresAt: API_KEY.expiresAt
                    });
                }));

        it('returns the plaintext secret to the caller', () => {
            respondOnceWith({ ...API_KEY, secret: 'sk_a1b2c3d4_abc123' });

            return useApiKeysStore()
                .mintCredential({
                    name: API_KEY.name,
                    permissions: API_KEY.permissions,
                    expiresAt: API_KEY.expiresAt
                })
                .then((created) => {
                    expect(created?.secret).toBe('sk_a1b2c3d4_abc123');
                });
        });

        it('never parks the plaintext secret in store state', () => {
            respondOnceWith({ ...API_KEY, secret: 'sk_a1b2c3d4_abc123' });

            return useApiKeysStore()
                .mintCredential({
                    name: API_KEY.name,
                    permissions: API_KEY.permissions,
                    expiresAt: API_KEY.expiresAt
                })
                .then(() => {
                    const store = useApiKeysStore();
                    expect(JSON.stringify(store.apiKeys)).not.toContain('sk_a1b2c3d4_abc123');
                    expect(store.apiKeys[API_KEY.id]).not.toHaveProperty('secret');
                });
        });

        it('still caches the credential itself, secret aside', () => {
            respondOnceWith({ ...API_KEY, secret: 'sk_a1b2c3d4_abc123' });

            return useApiKeysStore()
                .mintCredential({
                    name: API_KEY.name,
                    permissions: API_KEY.permissions,
                    expiresAt: API_KEY.expiresAt
                })
                .then(() => {
                    const store = useApiKeysStore();
                    expect(store.apiKeys[API_KEY.id]).toMatchObject({
                        id: API_KEY.id,
                        name: API_KEY.name,
                        status: 'active'
                    });
                    expect(typeof store.apiKeys[API_KEY.id]?.actions.revoke).toBe('boolean');
                });
        });
    });

    describe('revokeCredential', () => {
        it('calls the delete endpoint with the credential id', () =>
            useApiKeysStore()
                .revokeCredential('key1')
                .then(() => {
                    expect(lastRequest()).toMatchObject({
                        url: '/api-keys/key1',
                        method: 'DELETE'
                    });
                }));

        it('patches the cached row with revokedAt, without refetching', () => {
            const store = useApiKeysStore();
            // Seeded by hand rather than via search: the store's own cache, pre-populated the way
            // a prior list load would leave it.
            store.addApiKeyRecord({ ...API_KEY });

            return store.revokeCredential(API_KEY.id).then(() => {
                expect(store.apiKeys[API_KEY.id]?.revokedAt).toEqual(expect.any(String));
                expect(store.apiKeys[API_KEY.id]?.status).toBe('revoked');
                expect(store.apiKeys[API_KEY.id]?.actions.revoke).toBe(false);
            });
        });

        it('does not insert a ghost record for an id the cache never held', () =>
            useApiKeysStore()
                .revokeCredential('never-cached')
                .then(() => {
                    expect(useApiKeysStore().apiKeys['never-cached']).toBeUndefined();
                }));
    });

    describe('search', () => {
        it('watchApiKeysSearch requests the current page', () => {
            vi.mocked(orvalMutator).mockImplementation(
                (config: { url?: string; method?: string }) =>
                    Promise.resolve(
                        parseOrvalFixture(config.method, config.url, {
                            items: [API_KEY],
                            meta: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
                            maxExpiresAt: '2027-10-24T00:00:00.000Z'
                        })
                    )
            );

            return useApiKeysStore()
                .watchApiKeysSearch()
                .search()
                .then(() => {
                    expect(lastRequest()).toMatchObject({ url: '/api-keys', method: 'GET' });
                    expect(useApiKeysStore().apiKeysList).toEqual([API_KEY]);
                    // The ceiling the mint form bounds its date picker by.
                    expect(useApiKeysStore().maxExpiresAt).toBe('2027-10-24T00:00:00.000Z');
                });
        });
    });
});
