/**
 * @module
 * The feedback store, transport-mocked like the wishlist's spec: `orvalMutator` is a router keyed
 * on `METHOD /url`, so the generated client and the store under test stay real. What is worth
 * pinning is the inbox reading pages through `POST /feedback/search` (never the browser-cached
 * GET), `pageTotal` coming from the server's own count, and a write patching or evicting the
 * cached row.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useFeedbackStore } from '@/modules/feedback/store.ts';
import { orvalMutator } from '@/infrastructure/http';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

/**
 * Fixture ticket returned by the mocked `orvalMutator` responses below.
 */
const TICKET = {
    id: 'f1',
    email: 'curious@example.com',
    subject: 'A question',
    message: 'About the cats',
    status: 'new',
    // Required by the real contract — absent from the fixture before wiring in `parseOrvalFixture`
    // ever proved it against the schema, exactly the class of gap this file's own bug fixes.
    createdAt: '2026-01-01T00:00:00.000Z'
};

/**
 * The ticket as the mocked API's own state currently holds it — updated by `PATCH /feedback/f1`
 * and cleared by `DELETE /feedback/f1` below, and read back by `POST /feedback/search`. A real
 * backend's list would reflect a write the moment it lands; a frozen `TICKET` snapshot would not,
 * and vue-toolkit 5's active `watchSearchRequests` genuinely refetches the search after every
 * write (it closes the "another store's list could go stale on screen indefinitely" bug), so a
 * stale search fixture would silently overwrite the just-written (or just-deleted) row right back.
 */
let currentTicket: typeof TICKET | undefined;

/**
 * Per-test static response table, keyed by `METHOD /url`; reset in `beforeEach`. The three routes
 * that read or change {@link currentTicket} (`search`, the `PATCH`, the `DELETE`) are handled
 * ahead of this table instead of through it — see `orvalMutator`'s own mock below.
 */
let responses: Record<string, unknown>;

/**
 * The envelope for the three routes that read or change {@link currentTicket} — computed fresh
 * on every call, unlike the static {@link responses} table, since a search after a write or a
 * delete must answer differently than the same route answered before it.
 *
 * @param method - the mocked request's HTTP method
 * @param url - the mocked request's URL
 * @returns the envelope to resolve with, or `undefined` for a route this does not own
 */
const ticketStateEnvelope = (method: string | undefined, url: string | undefined) => {
    if (method === 'POST' && url === '/feedback/search')
        return orvalEnvelope({
            items: currentTicket ? [currentTicket] : [],
            meta: currentTicket
                ? { page: 1, pageSize: 10, totalItems: 31, totalPages: 4 }
                : { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }
        });
    if (method === 'PATCH' && url === '/feedback/f1' && currentTicket) {
        currentTicket = { ...currentTicket, status: 'resolved' };
        return orvalEnvelope(currentTicket);
    }
    if (method === 'DELETE' && url === '/feedback/f1') {
        currentTicket = undefined;
        return orvalEnvelope();
    }
    return undefined;
};

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const method = config.method?.toUpperCase();
        const stateEnvelope = ticketStateEnvelope(method, config.url);
        const key = `${method} ${config.url}`;
        return Promise.resolve(
            parseOrvalFixture(config.method, config.url, stateEnvelope ?? responses[key])
        );
    })
}));

/**
 * The URLs `orvalMutator` was actually called with, in call order.
 */
const requestedUrls = () =>
    vi.mocked(orvalMutator).mock.calls.map((call) => (call[0] as { url: string }).url);

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    currentTicket = { ...TICKET };
    responses = {
        'POST /feedback/contact': orvalEnvelope(TICKET)
    };
});

describe('submitContact', () => {
    it('posts the public form', () =>
        useFeedbackStore()
            .submitContact({
                email: 'curious@example.com',
                subject: 'A question',
                message: 'About the cats'
            })
            .then(() => {
                expect(requestedUrls()).toEqual(['/feedback/contact']);
            }));

    it("passes the honeypot through untouched — deciding what it means is the BE's job", () =>
        useFeedbackStore()
            .submitContact({
                email: 'curious@example.com',
                subject: 'A question',
                message: 'About the cats',
                website: 'https://spam-bot.example'
            })
            .then(() => {
                const [request] = vi.mocked(orvalMutator).mock.calls[0] as [{ data?: unknown }];
                expect(request.data).toMatchObject({ website: 'https://spam-bot.example' });
            }));
});

/**
 * The JSON body of the most recent request — what `POST /feedback/search` reads.
 */
const lastBody = () => {
    const [request] = vi.mocked(orvalMutator).mock.calls.at(-1) ?? [];
    return (request as { data?: Record<string, unknown> } | undefined)?.data;
};

describe('the inbox search', () => {
    /*
     * Through the search, never `GET /feedback`: the GET is browser-cached for 30 seconds, and
     * the contract declares no cache-busting param (the API answers an undeclared one with 422).
     */
    it('reads a page through POST /feedback/search with no query string', () =>
        useFeedbackStore()
            .fetchPaginationRequests()
            .then(() => {
                const [request] = vi.mocked(orvalMutator).mock.calls[0] as [
                    { url: string; method: string; data?: unknown; params?: unknown }
                ];
                expect(request).toMatchObject({
                    url: '/feedback/search',
                    method: 'POST',
                    data: { page: 1, pageSize: 10 }
                });
                expect(request.params).toBeUndefined();
            }));

    it('passes an explicit page and size through', () =>
        useFeedbackStore()
            .fetchPaginationRequests(3, 25)
            .then(() => {
                expect(lastBody()).toMatchObject({ page: 3, pageSize: 25 });
            }));

    it('posts every supported filter', () => {
        const store = useFeedbackStore();
        store.filters = { text: 'cats', status: 'new', email: 'curious@example.com' };

        return store
            .watchSearchRequests()
            .search()
            .then(() => {
                expect(lastBody()).toMatchObject({
                    text: 'cats',
                    status: 'new',
                    email: 'curious@example.com'
                });
            });
    });

    // The toolkit's own pageTotal counts the local cache — one ticket here — not the inbox.
    it("takes pageTotal from the server's meta, not from the rows it holds", () => {
        const store = useFeedbackStore();
        return store
            .watchSearchRequests()
            .search()
            .then(() => {
                expect(store.pageItemList.map(({ id }) => id)).toEqual(['f1']);
                expect(store.pageTotal).toBe(4);
            });
    });

    it('reports a failed search to the supplied error handler', () => {
        const failure = new Error('network down');
        vi.mocked(orvalMutator).mockRejectedValueOnce(failure);
        const onError = vi.fn();

        return useFeedbackStore()
            .watchSearchRequests({ onError })
            .search()
            .catch(() => {})
            .then(() => {
                expect(onError).toHaveBeenCalledWith(failure, expect.anything());
            });
    });
});

describe('updateRequest', () => {
    it("writes the status and caches the API's row, not a local guess", () => {
        const store = useFeedbackStore();
        return store
            .watchSearchRequests()
            .search()
            .then(() => store.updateRequest('f1', { status: 'resolved' }))
            .then(() => {
                const [, request] = vi
                    .mocked(orvalMutator)
                    .mock.calls.map(
                        (call) => call[0] as { url: string; method: string; data?: unknown }
                    );
                expect(request).toMatchObject({
                    url: '/feedback/f1',
                    method: 'PATCH',
                    data: { status: 'resolved' }
                });
                expect(store.requests.f1?.status).toBe('resolved');
            });
    });
});

describe('deleteRequest', () => {
    it('deletes the ticket and drops it from the page on screen', () => {
        const store = useFeedbackStore();
        return store
            .watchSearchRequests()
            .search()
            .then(() => store.deleteRequest('f1'))
            .then(() => {
                // A third request, not two: `deleteTarget` marks the resource's active lists
                // stale on settling, and `watchSearchRequests()` is exactly that — an active
                // watcher — so it refetches on its own (vue-toolkit 5's structural fix for a
                // list going stale on screen indefinitely). The refetch is what proves the ticket
                // is really gone server-side, not just removed from the local cache.
                expect(requestedUrls()).toEqual([
                    '/feedback/search',
                    '/feedback/f1',
                    '/feedback/search'
                ]);
                expect(store.pageItemList).toEqual([]);
            });
    });
});
