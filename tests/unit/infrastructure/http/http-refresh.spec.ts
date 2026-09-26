/**
 * The 401 → refresh → replay flow, driven through the real interceptor chain.
 *
 * This is the one piece of client logic where a bug is both invisible to types and invisible to
 * the e2e suite: a broken refresh does not throw, it just logs the user out at some later moment.
 *
 * It is therefore tested against a real HTTP server (MSW's node interceptor) rather than a stubbed
 * axios adapter. The whole point is that `instance.interceptors.response` runs, that the *replay*
 * goes back through the same instance, and that `_refreshed` actually stops the second round —
 * none of which a hand-rolled adapter would reproduce.
 *
 * `tests/unit/infrastructure/http/http.spec.ts` covers the error-normalisation side of the same
 * module with plain unit stubs; the two are complementary.
 *
 * ── How a case is written ────────────────────────────────────────────────────────────────────
 * The handlers below answer from {@link scenario}, and a case sets the one field it cares about.
 * Everything a case does NOT set is at its default, so what a test changes is exactly what it is
 * about. Assertions read {@link requestLog} — the server's own record of what arrived — because a
 * refresh attempt is not observable from the caller's side without stubbing the code under test.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { createPinia, setActivePinia } from 'pinia';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useReauthPromptStore } from '@/infrastructure/http/reauth-prompt.ts';

/** Base URL the axios instance is built against; also what the handlers below are mounted on. */
const API = 'http://api.test';

/** The token a successful refresh hands back, and therefore what the replay must carry. */
const FRESH_TOKEN = 'fresh-token';

/**
 * Endpoints that must never trigger a refresh, mirroring `refreshExcludedPaths` in
 * `src/infrastructure/http/refresh.ts`.
 *
 * A 401 from any of them is a normal business outcome — wrong password, expired reset link, a
 * session already invalidated — so refreshing there turns a clean error message into an extra
 * round trip and, when the refresh also fails, a misleading session-expired state.
 */
const EXCLUDED_PATHS = [
    '/account/login',
    '/account/signup',
    '/account/reset',
    '/account/reset-confirm',
    '/account/login/2fa',
    '/account/login/2fa/send'
];

/**
 * The same exclusion spelled absolutely.
 *
 * Generated clients send relative urls, but a caller passing an absolute one must get identical
 * treatment or the exclusion silently stops applying to it.
 */
const ABSOLUTE_EXCLUDED_URL = 'https://api.example.com/account/login';

/** One request as the server saw it. */
interface LoggedRequest {
    /** `METHOD /pathname`, which is what the assertions compare against. */
    route: string;
    /** The `Authorization` header, so the replay can be shown to carry the NEW token. */
    authorization?: string;
}

/** How the server should behave for one test. Reset to these defaults before every case. */
interface Scenario {
    /** How many more times `/account/refresh` may succeed; beyond that it answers 401. */
    refreshBudget: number;
    /** Answer the refresh with `200` and an envelope carrying no token — a failure wearing a success status. */
    refreshOmitsToken: boolean;
    /** Whether the protected route accepts {@link FRESH_TOKEN}; `false` makes the replay 401 too. */
    protectedAccepts: boolean;
}

/** @returns The scenario every case starts from: one refresh available, nothing accepted yet. */
const defaultScenario = (): Scenario => ({
    refreshBudget: 1,
    refreshOmitsToken: false,
    protectedAccepts: false
});

/** Requests seen by the server, in arrival order. Cleared before every case. */
let requestLog: LoggedRequest[] = [];

/** What the handlers answer with for the case currently running. */
let scenario: Scenario = defaultScenario();

/**
 * Builds the envelope the API rejects with, so the handlers and the app agree on one error shape.
 *
 * @param message - Human-readable reason, echoed into `errors[0].message` as the API does.
 * @returns A 401 response carrying the standard reject envelope.
 */
const unauthorized = (message: string) =>
    HttpResponse.json(
        { success: false, status: 401, message, errors: [{ code: 'UNAUTHORIZED', message }] },
        { status: 401 }
    );

const server = setupServer(
    /**
     * `GET /account/refresh` — succeeds while the budget lasts, then answers 401 like an expired
     * refresh cookie would.
     */
    http.get(`${API}/account/refresh`, ({ request }) => {
        requestLog.push({
            route: 'GET /account/refresh',
            authorization: request.headers.get('authorization') ?? undefined
        });

        if (scenario.refreshBudget <= 0) return unauthorized('Unauthorized');
        scenario.refreshBudget -= 1;

        return scenario.refreshOmitsToken
            ? HttpResponse.json({ success: true, status: 200, data: {} })
            : HttpResponse.json({ success: true, status: 200, data: { token: FRESH_TOKEN } });
    }),

    /**
     * `GET /orders` — the protected route the flow is triggered from. It answers 401 until it is
     * both told to accept and given the refreshed token, which is what makes the replay visible.
     */
    http.get(`${API}/orders`, ({ request }) => {
        const authorization = request.headers.get('authorization') ?? undefined;
        requestLog.push({ route: 'GET /orders', authorization });

        return scenario.protectedAccepts && authorization === `Bearer ${FRESH_TOKEN}`
            ? HttpResponse.json({ success: true, status: 200, data: { items: [] } })
            : unauthorized('Unauthorized');
    }),

    /** Every excluded path, each answering 401 as the ordinary outcome the exclusion exists for. */
    ...[...EXCLUDED_PATHS, ABSOLUTE_EXCLUDED_URL].map((path) =>
        http.post(path.startsWith('http') ? path : `${API}${path}`, ({ request }) => {
            requestLog.push({ route: `POST ${new URL(request.url).pathname}` });
            return unauthorized('Bad credentials');
        })
    ),

    /**
     * `POST /account/logout-all` — unlike the excluded paths above, a 401 here means an
     * EXPIRED access token, not bad credentials (the backend mounts it behind `isAuth`), so it
     * must go through the same refresh-and-replay as any other protected route.
     */
    http.post(`${API}/account/logout-all`, ({ request }) => {
        const authorization = request.headers.get('authorization') ?? undefined;
        requestLog.push({ route: 'POST /account/logout-all', authorization });

        return scenario.protectedAccepts && authorization === `Bearer ${FRESH_TOKEN}`
            ? HttpResponse.json({ success: true, status: 200 })
            : unauthorized('Unauthorized');
    })
);

/**
 * Imports the http plugin fresh, with the API base URL stubbed.
 *
 * The module builds its axios instance and registers its interceptors at import time, so the env
 * has to be in place first and the registry has to be reset between cases — otherwise the
 * interceptors stack up and one request runs the chain several times.
 *
 * @returns The freshly imported module, with `orvalMutator` on it.
 */
const loadHttp = () => {
    vi.resetModules();
    vi.stubEnv('VITE_API_URL', API);
    return import('@/infrastructure/http');
};

/**
 * Clears the `isAuth` cookie through the prototype setter, the way `stores/session.ts` writes it.
 *
 * @returns Nothing; the cookie is cleared as a side effect.
 */
const clearAuthCookie = () =>
    Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')?.set?.call(
        document,
        'isAuth=; path=/; max-age=0'
    );

/**
 * Every request the server saw, as `METHOD /pathname`.
 *
 * @returns The routes in arrival order — the sequence most assertions here are about.
 */
const routes = () => requestLog.map(({ route }) => route);

/**
 * How many times one route was requested.
 *
 * @param route - The `METHOD /pathname` to count.
 * @returns The number of matching requests the server saw.
 */
const timesRequested = (route: string) =>
    requestLog.filter((request) => request.route === route).length;

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
    setActivePinia(createPinia());
    requestLog = [];
    scenario = defaultScenario();
    clearAuthCookie();
    vi.unstubAllEnvs();
});

describe('401 refresh flow', () => {
    describe('when the refresh succeeds', () => {
        beforeEach(() => {
            scenario.protectedAccepts = true;
        });

        it('refreshes once and replays the original request with the new token', () =>
            loadHttp()
                .then(({ orvalMutator }) =>
                    orvalMutator<{ data: { items: unknown[] } }>({ url: '/orders', method: 'GET' })
                )
                .then((result) => {
                    expect(result.data.items).toEqual([]);
                    expect(routes()).toEqual([
                        'GET /orders',
                        'GET /account/refresh',
                        'GET /orders'
                    ]);
                    expect(requestLog.at(-1)?.authorization).toBe(`Bearer ${FRESH_TOKEN}`);
                }));

        it('stores the refreshed token, so later calls carry it', () =>
            loadHttp().then(({ orvalMutator }) =>
                orvalMutator({ url: '/orders', method: 'GET' }).then(() => {
                    expect(useSessionStore().accessToken).toBe(FRESH_TOKEN);
                })
            ));

        /**
         * `setAccessToken` is the only writer of the JS-readable `isAuth` cookie, and
         * `tryRestoreAuth` reads it on the next boot: without it a signed-in visitor looks like a
         * guest after a reload.
         */
        it('restores the isAuth cookie, not just the in-memory token', () =>
            loadHttp()
                .then(({ orvalMutator }) => orvalMutator({ url: '/orders', method: 'GET' }))
                .then(() => {
                    expect(document.cookie).toContain('isAuth=true');
                }));

        /**
         * Single-flight: two 401s in the same tick must not race the refresh cookie against
         * itself with two `GET /account/refresh` calls.
         */
        it('shares one refresh call between two 401s that arrive together', () =>
            loadHttp().then(({ orvalMutator }) =>
                Promise.all([
                    orvalMutator({ url: '/orders', method: 'GET' }),
                    orvalMutator({ url: '/orders', method: 'GET' })
                ]).then(() => {
                    expect(timesRequested('GET /account/refresh')).toBe(1);
                })
            ));

        /**
         * `POST /account/logout-all` sits behind `isAuth` on the backend, so an expired
         * access token answers it a plain 401 — the same shape any other protected route gets,
         * and one this flow must not treat as a bad-credentials dead end.
         */
        it('refreshes and replays a 401 from /account/logout-all', () =>
            loadHttp()
                .then(({ orvalMutator }) =>
                    orvalMutator({ url: '/account/logout-all', method: 'POST', data: {} })
                )
                .then(() => {
                    expect(routes()).toEqual([
                        'POST /account/logout-all',
                        'GET /account/refresh',
                        'POST /account/logout-all'
                    ]);
                }));
    });

    describe('when the refresh does not produce a usable token', () => {
        /**
         * A 200 whose envelope carries no token is a failed refresh wearing a success status. The
         * caller is owed either a body or a rejection; anything else surfaces as a `TypeError` in
         * whichever store dereferenced it, far from the interceptor that caused it.
         */
        it('rejects with the original error when the refresh answers 200 without a token', () => {
            scenario.refreshOmitsToken = true;

            return loadHttp()
                .then(({ orvalMutator }) =>
                    expect(orvalMutator({ url: '/orders', method: 'GET' })).rejects.toMatchObject({
                        success: false,
                        status: 401
                    })
                )
                .then(() => {
                    // Never replayed: there was no token to replay it with.
                    expect(timesRequested('GET /orders')).toBe(1);
                });
        });

        it('rejects with the original error when the refresh itself fails', () => {
            scenario.refreshBudget = 0;

            return loadHttp()
                .then(({ orvalMutator }) =>
                    expect(orvalMutator({ url: '/orders', method: 'GET' })).rejects.toMatchObject({
                        success: false,
                        status: 401
                    })
                )
                .then(() => {
                    expect(timesRequested('GET /orders')).toBe(1);
                });
        });

        /** `protectedAccepts` stays false, so the replayed request answers 401 as well. */
        it('does not retry a second time when the replay also fails', () =>
            loadHttp()
                .then(({ orvalMutator }) =>
                    expect(orvalMutator({ url: '/orders', method: 'GET' })).rejects.toMatchObject({
                        status: 401
                    })
                )
                .then(() => {
                    // One refresh and two /orders calls — `_refreshed` stopped the loop.
                    expect(timesRequested('GET /account/refresh')).toBe(1);
                    expect(timesRequested('GET /orders')).toBe(2);
                }));
    });

    /**
     * Driven through `orvalMutator` against the real interceptor chain, and asserted on the
     * server's own request log — the only place a refresh attempt is observable without mocking
     * the very code under test.
     */
    describe('when the 401 comes from an excluded endpoint', () => {
        it.each([
            ...EXCLUDED_PATHS,
            ABSOLUTE_EXCLUDED_URL,
            // With a query string: the exclusion matches a PATHNAME, and `?next=` is the shape a
            // sign-in redirect actually arrives in.
            '/account/login?next=/cart'
        ])('never attempts a refresh for a 401 from %s', (url) =>
            loadHttp()
                .then(({ orvalMutator }) =>
                    expect(orvalMutator({ url, method: 'POST', data: {} })).rejects.toMatchObject({
                        status: 401
                    })
                )
                .then(() => {
                    // The endpoint itself was reached...
                    expect(routes().some((route) => route.startsWith('POST '))).toBe(true);
                    // ...and no refresh was attempted off the back of its 401.
                    expect(timesRequested('GET /account/refresh')).toBe(0);
                })
        );
    });

    /**
     * a request may need BOTH a refresh and a step-up, in that order, and each guard must
     * block only its own retry. Before the split, both branches shared one `_dontRetry` flag, so
     * the refresh's own replay already looked "already retried" to the step-up branch — the
     * REAUTH_REQUIRED it came back with surfaced as a generic error instead of the password prompt.
     */
    describe('a request needing both a refresh and a step-up', () => {
        let checkoutCalls = 0;

        beforeEach(() => {
            checkoutCalls = 0;
            server.use(
                http.post(`${API}/checkout`, ({ request }) => {
                    checkoutCalls += 1;
                    const authorization = request.headers.get('authorization') ?? undefined;
                    requestLog.push({ route: 'POST /checkout', authorization });

                    // Call 1: no token yet — a plain 401, the shape that triggers a refresh.
                    if (authorization !== `Bearer ${FRESH_TOKEN}`)
                        return unauthorized('Unauthorized');
                    // Call 2: refreshed, but the backend's `auth_time` is still the old one — the
                    // critical action demands a step-up, same as a request never refreshed at all.
                    if (checkoutCalls === 2)
                        return HttpResponse.json(
                            {
                                success: false,
                                status: 401,
                                message: 'Fresh authentication required',
                                errors: [
                                    {
                                        code: 'REAUTH_REQUIRED',
                                        message: 'Fresh authentication required'
                                    }
                                ]
                            },
                            { status: 401 }
                        );
                    // Call 3: stepped up — the fresh session the second call demanded now exists.
                    return HttpResponse.json({
                        success: true,
                        status: 200,
                        data: { orderId: 'o1' }
                    });
                })
            );
        });

        it('refreshes once, then steps up once, then succeeds', () =>
            loadHttp().then(({ orvalMutator }) => {
                const pending = orvalMutator({ url: '/checkout', method: 'POST', data: {} });

                return vi
                    .waitFor(() => expect(useReauthPromptStore().isOpen).toBe(true))
                    .then(() => {
                        useReauthPromptStore().resolveStepUp();
                        return pending;
                    })
                    .then(() => {
                        expect(routes()).toEqual([
                            'POST /checkout',
                            'GET /account/refresh',
                            'POST /checkout',
                            'POST /checkout'
                        ]);
                    });
            }));
    });
});
