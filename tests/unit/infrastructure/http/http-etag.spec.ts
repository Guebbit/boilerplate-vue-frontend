/**
 * Conditional writes through the real interceptor chain: a read's `ETag` comes back as `If-Match`
 * on the next write, the write's own answer replaces it, an action without a tag forgets it, and a
 * refusal reaches the caller as the API's 412.
 *
 * Against a real HTTP server (MSW's node interceptor) for the same reason `http-refresh.spec.ts`
 * is: what matters is what ARRIVED at the server, and the interceptors' registration order on the
 * shared instance — neither is observable from a stubbed adapter. `etag.spec.ts` covers the same
 * rules on the two interceptors alone.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { createPinia, setActivePinia } from 'pinia';

/** Base URL the axios instance is built against; also what the handlers below are mounted on. */
const API = 'http://api.test';

/** The version the server currently holds for `/products/p1`; a case may move it under the client. */
let serverVersion = 100;

/** Every `If-Match` a `PATCH /products/p1` arrived with (`undefined` for none), in order. */
let patchIfMatch: (string | undefined)[] = [];

/**
 * The tag for a version, quoted as the API sends it.
 *
 * @param version - The row's version.
 */
const tag = (version: number) => `"${version.toString()}"`;

/** MSW server answering this file's stub endpoints (`setupServer` intercepts requests in Node). */
const server = setupServer(
    /** The editor's read: answers the current tag. */
    http.get(`${API}/products/p1/admin`, () =>
        HttpResponse.json(
            { success: true, status: 200, data: { id: 'p1' } },
            { headers: { ETag: tag(serverVersion) } }
        )
    ),

    /** The write: runs only on the current tag (or no header), and answers the NEW one. */
    http.patch(`${API}/products/p1`, ({ request }) => {
        const sent = request.headers.get('if-match') ?? undefined;
        patchIfMatch.push(sent);

        if (sent !== undefined && sent !== tag(serverVersion))
            return HttpResponse.json(
                {
                    success: false,
                    status: 412,
                    message: 'Precondition Failed',
                    errors: [{ code: 'PRECONDITION_FAILED', message: 'Precondition failed' }]
                },
                { status: 412 }
            );

        serverVersion += 100;
        return HttpResponse.json(
            { success: true, status: 200, data: { id: 'p1' } },
            { headers: { ETag: tag(serverVersion) } }
        );
    }),

    /** An action: changes the row and answers no tag. */
    http.post(`${API}/products/p1/restore`, () => {
        serverVersion += 100;
        return HttpResponse.json({ success: true, status: 200, data: { id: 'p1' } });
    })
);

/**
 * Imports the http plugin fresh, with the API base URL stubbed — the instance and its
 * interceptors (and the tag memory) are built at import time, so each case starts with none.
 */
const loadHttp = () => {
    vi.resetModules();
    vi.stubEnv('VITE_API_URL', API);
    return import('@/infrastructure/http');
};

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
    setActivePinia(createPinia());
    serverVersion = 100;
    patchIfMatch = [];
    vi.unstubAllEnvs();
});

describe('conditional writes over the wire', () => {
    it('sends the tag the editor read as If-Match on the write', () =>
        loadHttp().then(({ orvalMutator }) =>
            orvalMutator({ url: '/products/p1/admin', method: 'GET' })
                .then(() => orvalMutator({ url: '/products/p1', method: 'PATCH', data: {} }))
                .then(() => {
                    expect(patchIfMatch).toEqual([tag(100)]);
                })
        ));

    it("chains a second edit on the first edit's own answer", () =>
        loadHttp().then(({ orvalMutator }) =>
            orvalMutator({ url: '/products/p1/admin', method: 'GET' })
                .then(() => orvalMutator({ url: '/products/p1', method: 'PATCH', data: {} }))
                .then(() => orvalMutator({ url: '/products/p1', method: 'PATCH', data: {} }))
                .then(() => {
                    expect(patchIfMatch).toEqual([tag(100), tag(200)]);
                })
        ));

    it('writes unconditionally when the resource was never read', () =>
        loadHttp().then(({ orvalMutator }) =>
            orvalMutator({ url: '/products/p1', method: 'PATCH', data: {} }).then(() => {
                expect(patchIfMatch).toEqual([undefined]);
            })
        ));

    it("reaches the caller as the API's 412 when the record moved after it was read", () =>
        loadHttp().then(({ orvalMutator }) =>
            orvalMutator({ url: '/products/p1/admin', method: 'GET' })
                .then(() => {
                    serverVersion = 500;
                })
                .then(() => orvalMutator({ url: '/products/p1', method: 'PATCH', data: {} }))
                .then(
                    () => {
                        throw new Error('the stale write was accepted');
                    },
                    (error: unknown) => {
                        expect(error).toMatchObject({
                            status: 412,
                            errors: [{ code: 'PRECONDITION_FAILED' }]
                        });
                    }
                )
        ));

    it('forgets the tag after an action that answers none, so the next edit is not refused for it', () =>
        loadHttp().then(({ orvalMutator }) =>
            orvalMutator({ url: '/products/p1/admin', method: 'GET' })
                .then(() => orvalMutator({ url: '/products/p1/restore', method: 'POST' }))
                .then(() => orvalMutator({ url: '/products/p1', method: 'PATCH', data: {} }))
                .then(() => {
                    expect(patchIfMatch).toEqual([undefined]);
                })
        ));
});
