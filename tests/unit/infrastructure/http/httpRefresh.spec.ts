/**
 * The 401 → refresh → replay flow, driven through the real interceptor chain.
 *
 * This is the one piece of client logic where a bug is both invisible to types and invisible to
 * the e2e suite: a broken refresh does not throw, it just logs the user out at some later moment.
 *
 * It is therefore tested against a real HTTP server (MSW's node interceptor) rather than a
 * stubbed axios adapter. The whole point is that `instance.interceptors.response` runs, that the
 * *replay* goes back through the same instance, and that `_dontRetry` actually stops the second
 * round — none of which a hand-rolled adapter would reproduce.
 *
 * `tests/unit/infrastructure/http/http.spec.ts` covers the error-normalisation side of the same module with
 * plain unit stubs; the two are complementary.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { createPinia, setActivePinia } from 'pinia';

const API = 'http://api.test';

/** Requests seen by the server, in order, as `METHOD path` plus the bearer token sent. */
let requestLog: { route: string; authorization?: string }[] = [];

/** Number of times /account/refresh may still succeed; anything beyond answers 401. */
let refreshBudget = 1;

/** Whether the protected route accepts the token it is given. */
let protectedAccepts = false;

/** Mirrors `refreshExcludedPaths` in `src/infrastructure/http/index.ts`. */
const EXCLUDED_PATHS = [
    '/account/login',
    '/account/signup',
    '/account/reset',
    '/account/reset-confirm',
    '/account/logout-all'
];

/**
 * The same exclusion, spelled absolutely. Generated clients send relative urls, but a caller
 * passing an absolute one must get the same treatment or the exclusion silently stops applying.
 */
const ABSOLUTE_EXCLUDED_URL = 'https://api.example.com/account/login';

const server = setupServer(
    http.get(`${API}/account/refresh`, ({ request }) => {
        requestLog.push({
            route: 'GET /account/refresh',
            authorization: request.headers.get('authorization') ?? undefined
        });
        if (refreshBudget <= 0)
            return HttpResponse.json(
                { success: false, status: 401, message: 'Unauthorized', errors: ['Unauthorized'] },
                { status: 401 }
            );
        refreshBudget -= 1;
        return HttpResponse.json({ success: true, status: 200, data: { token: 'fresh-token' } });
    }),

    http.get(`${API}/orders`, ({ request }) => {
        const authorization = request.headers.get('authorization') ?? undefined;
        requestLog.push({ route: 'GET /orders', authorization });
        if (protectedAccepts && authorization === 'Bearer fresh-token')
            return HttpResponse.json({ success: true, status: 200, data: { items: [] } });
        return HttpResponse.json(
            { success: false, status: 401, message: 'Unauthorized', errors: ['Unauthorized'] },
            { status: 401 }
        );
    }),

    // Every path on the refresh-exclusion list, plus one spelled as an absolute URL. Each
    // answers 401 as a normal business outcome (wrong password, expired reset link, session
    // already invalidated) — the case the exclusion list exists for.
    ...[...EXCLUDED_PATHS, ABSOLUTE_EXCLUDED_URL].map((path) =>
        http.post(path.startsWith('http') ? path : `${API}${path}`, ({ request }) => {
            requestLog.push({ route: `POST ${new URL(request.url).pathname}` });
            return HttpResponse.json(
                {
                    success: false,
                    status: 401,
                    message: 'Unauthorized',
                    errors: ['Bad credentials']
                },
                { status: 401 }
            );
        })
    )
);

/**
 * Imports the http plugin fresh, with the API base URL stubbed.
 *
 * The module builds its axios instance and registers its interceptors at import time, so the
 * env has to be in place first and the registry has to be reset between tests — otherwise the
 * interceptors stack up across cases.
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
    requestLog = [];
    refreshBudget = 1;
    protectedAccepts = false;
    vi.unstubAllEnvs();
});

describe('401 refresh flow', () => {
    it('refreshes once and replays the original request with the new token', () => {
        protectedAccepts = true;

        return loadHttp()
            .then(({ orvalMutator }) =>
                orvalMutator<{ data: { items: unknown[] } }>({ url: '/orders', method: 'GET' })
            )
            .then((result) => {
                expect(result.data.items).toEqual([]);
                expect(requestLog.map(({ route }) => route)).toEqual([
                    'GET /orders',
                    'GET /account/refresh',
                    'GET /orders'
                ]);
                expect(requestLog.at(-1)?.authorization).toBe('Bearer fresh-token');
            });
    });

    it('stores the refreshed token on the profile, so later calls carry it', () => {
        protectedAccepts = true;

        return loadHttp().then(({ orvalMutator, getAccessToken }) =>
            orvalMutator({ url: '/orders', method: 'GET' }).then(() => {
                expect(getAccessToken()).toBe('fresh-token');
            })
        );
    });

    it('does not retry a second time when the replay also fails', () =>
        // protectedAccepts stays false: the replayed request 401s as well.
        loadHttp()
            .then(({ orvalMutator }) =>
                expect(orvalMutator({ url: '/orders', method: 'GET' })).rejects.toMatchObject({
                    status: 401
                })
            )
            .then(() => {
                // Exactly one refresh and exactly two /orders calls — `_dontRetry` stopped the
                // loop.
                expect(
                    requestLog.filter(({ route }) => route === 'GET /account/refresh')
                ).toHaveLength(1);
                expect(requestLog.filter(({ route }) => route === 'GET /orders')).toHaveLength(2);
            }));

    it('rejects with the original error when the refresh itself fails', () => {
        refreshBudget = 0;

        return loadHttp()
            .then(({ orvalMutator }) =>
                expect(orvalMutator({ url: '/orders', method: 'GET' })).rejects.toMatchObject({
                    success: false,
                    status: 401
                })
            )
            .then(() => {
                expect(requestLog.filter(({ route }) => route === 'GET /orders')).toHaveLength(1);
            });
    });

    /**
     * Each excluded endpoint answers 401 as a normal business outcome, so refreshing there turns
     * a clean error message into an extra round trip and — when the refresh also fails — a
     * misleading session-expired state.
     *
     * Driven through `orvalMutator` against the real interceptor chain, and asserted on the
     * server's own request log — the only place a refresh attempt is observable without
     * mocking the very code under test.
     */
    it.each([...EXCLUDED_PATHS, ABSOLUTE_EXCLUDED_URL])(
        'never attempts a refresh for a 401 from %s',
        (url) =>
            loadHttp()
                .then(({ orvalMutator }) =>
                    expect(orvalMutator({ url, method: 'POST', data: {} })).rejects.toMatchObject({
                        status: 401
                    })
                )
                .then(() => {
                    // The endpoint itself was reached...
                    expect(requestLog.some(({ route }) => route.startsWith('POST '))).toBe(true);
                    // ...and no refresh was attempted off the back of its 401.
                    expect(requestLog.some(({ route }) => route === 'GET /account/refresh')).toBe(
                        false
                    );
                })
    );
});
