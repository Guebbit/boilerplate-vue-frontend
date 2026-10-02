/**
 * @module
 * Unit tests for the example store, mocking `orvalMutator` and inspecting the raw requests the
 * store's actions send. Every canned response is run through the real contract schema first
 * (`parseOrvalFixture`), so a fixture that drifts from `openapi.yaml` fails here.
 *
 * Each `it` RETURNS its chain rather than awaiting: vitest fails a test whose returned promise
 * rejects, so the assertions inside a `.then` are as binding as awaited ones. See
 * `docs/tools/unit-testing.md`.
 */
import type { ZodType } from 'zod';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useExampleStore } from '@/modules/example/store';
import { orvalMutator } from '@/infrastructure/http';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    contractRequest,
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

import * as schemas from '@api/schemas';

wireModulesIntoCore();

const EXAMPLE = {
    id: 'a'.repeat(24),
    title: 'A title',
    body: 'A body',
    status: 'draft',
    userId: 'b'.repeat(24),
    ownerName: 'ada',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
};

/**
 * The default answer of the transport: one example, validated against its contract, or an empty
 * envelope for a DELETE. Hoisted with the mock below so the factory can reach it.
 */
const { defaultAnswer } = vi.hoisted(() => ({
    defaultAnswer: {
        current: undefined as undefined | ((config: { url?: string; method?: string }) => unknown)
    }
}));

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url?: string; method?: string }) =>
        Promise.resolve(defaultAnswer.current?.(config))
    )
}));

defaultAnswer.current = (config) =>
    parseOrvalFixture(
        config.method,
        config.url,
        config.method?.toUpperCase() === 'DELETE' ? orvalEnvelope() : orvalEnvelope(EXAMPLE)
    );

/**
 * The config handed to `orvalMutator` on its most recent call.
 */
const lastRequest = () => {
    const call = vi.mocked(orvalMutator).mock.calls.at(-1);
    if (!call) throw new Error('orvalMutator was never called');
    return call[0] as { url: string; method: string; data?: unknown; params?: unknown };
};

/**
 * The JSON body of the most recent request, proven against its contract schema.
 */
const lastBody = (schema: ZodType) => contractRequest(schema, lastRequest().data);

/**
 * Makes the transport answer every call with a page of `items`.
 */
const answerWithPage = (items: unknown[]) =>
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

describe('useExampleStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
        // `answerWithPage` replaces the answer for good, so every case starts from the default one.
        vi.mocked(orvalMutator).mockImplementation((config: { url?: string; method?: string }) =>
            Promise.resolve(defaultAnswer.current?.(config))
        );
    });

    describe('search', () => {
        it('asks for the current page and fills the list', () => {
            answerWithPage([EXAMPLE]);

            return useExampleStore()
                .watchExamplesSearch()
                .search()
                .then(() => {
                    expect(lastRequest()).toMatchObject({ url: '/examples', method: 'GET' });
                    expect(useExampleStore().examplesList).toEqual([EXAMPLE]);
                });
        });

        it('sends the text, status and sort filters', () => {
            answerWithPage([]);
            const store = useExampleStore();
            store.filters.text = 'puppy';
            store.filters.status = 'published';
            store.filters.sort = '-createdAt';

            return store
                .watchExamplesSearch()
                .search()
                .then(() => {
                    expect(lastRequest().params).toMatchObject({
                        text: 'puppy',
                        status: 'published',
                        sort: ['-createdAt']
                    });
                });
        });

        it('leaves a sort the API does not know out of the request', () => {
            answerWithPage([]);
            const store = useExampleStore();
            store.filters.sort = 'price';

            return store
                .watchExamplesSearch()
                .search()
                .then(() => {
                    expect(lastRequest().params).not.toHaveProperty('sort', ['price']);
                });
        });
    });

    describe('fetchExample', () => {
        it('reads one example by id and caches it', () =>
            useExampleStore()
                .fetchExample(EXAMPLE.id)
                .then(() => {
                    expect(lastRequest()).toMatchObject({
                        url: `/examples/${EXAMPLE.id}`,
                        method: 'GET'
                    });
                    expect(useExampleStore().examples[EXAMPLE.id]).toMatchObject({
                        title: 'A title'
                    });
                }));
    });

    describe('createExample', () => {
        it('posts the new example and caches the answer', () =>
            useExampleStore()
                .createExample({ title: 'A title', body: 'A body' })
                .then((created) => {
                    expect(lastRequest()).toMatchObject({ url: '/examples', method: 'POST' });
                    expect(lastBody(schemas.CreateExampleBody)).toEqual({
                        title: 'A title',
                        body: 'A body'
                    });
                    expect(created?.id).toBe(EXAMPLE.id);
                    expect(useExampleStore().examples[EXAMPLE.id]).toBeDefined();
                }));
    });

    describe('updateExample', () => {
        it('merges with a PATCH, never a PUT, so an omitted field stays as it is', () => {
            const store = useExampleStore();
            store.addExampleRecord({ ...EXAMPLE } as never);

            return store.updateExample(EXAMPLE.id, { title: 'Renamed' }).then(() => {
                expect(lastRequest()).toMatchObject({
                    url: `/examples/${EXAMPLE.id}`,
                    method: 'PATCH'
                });
                expect(lastBody(schemas.UpdateExampleByIdBody)).toEqual({ title: 'Renamed' });
            });
        });
    });

    describe('deleteExample', () => {
        it('calls the delete endpoint with the id', () =>
            useExampleStore()
                .deleteExample(EXAMPLE.id)
                .then(() => {
                    expect(lastRequest()).toMatchObject({
                        url: `/examples/${EXAMPLE.id}`,
                        method: 'DELETE'
                    });
                }));
    });

    describe('setCover', () => {
        it('sends the image as multipart to the cover route', () => {
            const image = new File(['x'], 'cover.png', { type: 'image/png' });

            return useExampleStore()
                .setCover(EXAMPLE.id, image)
                .then(() => {
                    expect(lastRequest()).toMatchObject({
                        url: `/examples/${EXAMPLE.id}/cover`,
                        method: 'PUT'
                    });
                    expect(lastRequest().data).toBeInstanceOf(FormData);
                });
        });

        it('replaces the cached example with the one the server answers with', () => {
            const store = useExampleStore();
            store.addExampleRecord({ ...EXAMPLE } as never);
            vi.mocked(orvalMutator).mockImplementationOnce(
                (config: { url?: string; method?: string }) =>
                    Promise.resolve(
                        parseOrvalFixture(
                            config.method,
                            config.url,
                            orvalEnvelope({ ...EXAMPLE, imageUrl: '/images/a.png' })
                        )
                    )
            );

            return store
                .setCover(EXAMPLE.id, new File(['x'], 'cover.png', { type: 'image/png' }))
                .then(() => {
                    expect(store.examples[EXAMPLE.id]?.imageUrl).toBe('/images/a.png');
                });
        });
    });

    describe('fetchPublished', () => {
        it('reads through the public route and returns the example', () =>
            useExampleStore()
                .fetchPublished(EXAMPLE.id)
                .then((found) => {
                    expect(lastRequest()).toMatchObject({
                        url: `/examples/published/${EXAMPLE.id}`,
                        method: 'GET'
                    });
                    expect(found?.title).toBe('A title');
                }));

        it('keeps the answer out of the signed-in cache', () =>
            useExampleStore()
                .fetchPublished(EXAMPLE.id)
                .then(() => {
                    expect(useExampleStore().examples[EXAMPLE.id]).toBeUndefined();
                }));
    });
});
