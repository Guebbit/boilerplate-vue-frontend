/**
 * @module
 * The tickets store, transport-mocked like the wishlist's spec: `orvalMutator` is a router keyed
 * on `METHOD /url`, so the generated client and the store under test stay real. What is worth
 * pinning is the inbox reading pages through `POST /tickets/search` (never the browser-cached
 * GET), `pageTotal` coming from the server's own count, and a write patching or evicting the
 * cached row.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTicketsStore } from '../store.ts';
import { orvalMutator } from '@/infrastructure/http';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    contractRequest,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

import * as schemas from '@api/schemas';

wireModulesIntoCore();

/**
 * Fixture ticket returned by the mocked `orvalMutator` responses below.
 */
const TICKET = {
    id: 'f1',
    source: 'visitor',
    kind: 'contact',
    routeSet: 'TicketDisplay',
    notes: [],
    overdue: false,
    actions: {
        resolve: true,
        markSpam: true,
        reopen: false,
        assign: true,
        unassign: false,
        note: true,
        delete: true
    },
    email: 'curious@example.com',
    subject: 'A question',
    message: 'About the cats',
    status: 'new',
    // Required by the real contract — absent from the fixture before wiring in `parseOrvalFixture`
    // ever proved it against the schema, exactly the class of gap this file's own bug fixes.
    createdAt: '2026-01-01T00:00:00.000Z'
};

/**
 * The ticket as the mocked API's own state currently holds it — updated by `POST /tickets/f1/resolve`
 * and cleared by `DELETE /tickets/f1` below, and read back by `POST /tickets/search`. A real
 * backend's list would reflect a write the moment it lands; a frozen `TICKET` snapshot would not,
 * and vue-toolkit 5's active `watchSearchRequests` genuinely refetches the search after every
 * write (it closes the "another store's list could go stale on screen indefinitely" bug), so a
 * stale search fixture would silently overwrite the just-written (or just-deleted) row right back.
 */
let currentTicket: typeof TICKET | undefined;

/**
 * Per-test static response table, keyed by `METHOD /url`; reset in `beforeEach`. The three routes
 * that read or change {@link currentTicket} (`search`, the `resolve` door, the `DELETE`) are handled
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
    if (method === 'POST' && url === '/tickets/search')
        return {
            items: currentTicket ? [currentTicket] : [],
            meta: currentTicket
                ? { page: 1, pageSize: 10, totalItems: 31, totalPages: 4 }
                : { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }
        };
    if (method === 'POST' && url === '/tickets/f1/resolve' && currentTicket) {
        currentTicket = { ...currentTicket, status: 'resolved' };
        return currentTicket;
    }
    if (method === 'DELETE' && url === '/tickets/f1') {
        currentTicket = undefined;
        return undefined;
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
        'POST /tickets': TICKET
    };
});

describe('submitContact', () => {
    it('posts the public form', () =>
        useTicketsStore()
            .submitContact({
                email: 'curious@example.com',
                subject: 'A question',
                message: 'About the cats'
            })
            .then(() => {
                expect(requestedUrls()).toEqual(['/tickets']);
            }));

    it("passes the honeypot through untouched — deciding what it means is the BE's job", () =>
        useTicketsStore()
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
 * The JSON body of the most recent request — what `POST /tickets/search` reads.
 */
const lastBody = () => {
    const [request] = vi.mocked(orvalMutator).mock.calls.at(-1) ?? [];
    return (request as { data?: Record<string, unknown> } | undefined)?.data;
};

describe('the inbox search', () => {
    /*
     * Through the search, never `GET /tickets`: the GET is browser-cached for 30 seconds, and
     * the contract declares no cache-busting param (the API answers an undeclared one with 422).
     */
    it('reads a page through POST /tickets/search with no query string', () =>
        useTicketsStore()
            .fetchPaginationRequests()
            .then(() => {
                const [request] = vi.mocked(orvalMutator).mock.calls[0] as [
                    { url: string; method: string; data?: unknown; params?: unknown }
                ];
                expect(request).toMatchObject({
                    url: '/tickets/search',
                    method: 'POST',
                    data: { page: 1, pageSize: 10 }
                });
                expect(contractRequest(schemas.SearchTicketsBody, request.data)).toBeDefined();
                expect(request.params).toBeUndefined();
            }));

    it('passes an explicit page and size through', () =>
        useTicketsStore()
            .fetchPaginationRequests(3, 25)
            .then(() => {
                expect(lastBody()).toMatchObject({ page: 3, pageSize: 25 });
            }));

    it('sends a sort the contract names, and drops one it does not', () => {
        const store = useTicketsStore();
        store.filters = { sort: 'status,-createdAt' };

        return store
            .watchSearchRequests()
            .search()
            .then(() => {
                expect(lastBody()?.sort).toEqual(['status', '-createdAt']);
                store.filters = { sort: 'message' };
                return store.watchSearchRequests().search(true);
            })
            .then(() => {
                expect(lastBody()?.sort).toBeUndefined();
            });
    });

    it('posts every supported filter', () => {
        const store = useTicketsStore();
        store.filters = {
            text: 'cats',
            status: 'new',
            category: 'privacy',
            email: 'curious@example.com'
        };

        return store
            .watchSearchRequests()
            .search()
            .then(() => {
                expect(lastBody()).toMatchObject({
                    text: 'cats',
                    status: 'new',
                    category: 'privacy',
                    email: 'curious@example.com'
                });
            });
    });

    // The toolkit's own pageTotal counts the local cache — one ticket here — not the inbox.
    it("takes pageTotal from the server's meta, not from the rows it holds", () => {
        const store = useTicketsStore();
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

        return useTicketsStore()
            .watchSearchRequests({ onError })
            .search()
            .catch(() => {})
            .then(() => {
                expect(onError).toHaveBeenCalledWith(failure, expect.anything());
            });
    });
});

describe('the status doors', () => {
    it("posts the door with no body and keeps the API's ticket as the current one", () => {
        const store = useTicketsStore();
        return store.resolve('f1').then(() => {
            const [request] = vi
                .mocked(orvalMutator)
                .mock.calls.map(
                    (call) => call[0] as { url: string; method: string; data?: unknown }
                );
            expect(request).toMatchObject({ url: '/tickets/f1/resolve', method: 'POST' });
            expect(request.data).toBeUndefined();
            expect(store.ticket?.status).toBe('resolved');
        });
    });

    it('assigns by posting the user id to the ticket’s assignee', () => {
        responses['PUT /tickets/f1/assignee'] = { ...TICKET, status: 'in_progress' };
        const store = useTicketsStore();
        return store.assign('f1', 'u1').then(() => {
            const [request] = vi
                .mocked(orvalMutator)
                .mock.calls.map(
                    (call) => call[0] as { url: string; method: string; data?: unknown }
                );
            expect(request).toMatchObject({
                url: '/tickets/f1/assignee',
                method: 'PUT',
                data: { userId: 'u1' }
            });
            expect(contractRequest(schemas.AssignTicketBody, request.data)).toEqual({
                userId: 'u1'
            });
        });
    });

    it('appends a note through the thread', () => {
        responses['POST /tickets/f1/notes'] = TICKET;
        return useTicketsStore()
            .addNote('f1', 'Called back')
            .then(() => {
                const [request] = vi.mocked(orvalMutator).mock.calls[0] as [{ data?: unknown }];
                expect(contractRequest(schemas.CreateTicketNoteBody, request.data)).toEqual({
                    body: 'Called back'
                });
            });
    });
});

describe('deleteRequest', () => {
    it('deletes the ticket and drops it from the page on screen', () => {
        const store = useTicketsStore();
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
                    '/tickets/search',
                    '/tickets/f1',
                    '/tickets/search'
                ]);
                expect(store.pageItemList).toEqual([]);
            });
    });
});
