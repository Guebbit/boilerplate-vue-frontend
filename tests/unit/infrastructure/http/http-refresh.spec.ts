/**
 * The 401 → refresh → replay flow, driven through the real interceptor chain.
 *
 * This is the one piece of client logic where a bug is both invisible to types and invisible to
 * the e2e suite: a broken refresh does not throw, it just logs the user out at some later moment.
 *
 * It is therefore tested against a real HTTP server (MSW's node interceptor) rather than a stubbed
 * axios adapter. The whole point is that `instance.interceptors.response` runs, that the *replay*
 * goes back through the same instance, and that `_dontRetry` actually stops the second round —
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
    '/account/logout-all'
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
 * @param message - Human-readable reason, echoed into `errors` as the API does.
 * @returns A 401 response carrying the standard reject envelope.
 */
const unauthorized = (message: string) =>
    HttpResponse.json({ success: false, status: 401, message, errors: [message] }, { status: 401 });

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
    )
);

/**
 * Imports the http plugin fresh, with the API base URL stubbed.
 *
 * The module builds its axios instance and registers its interceptors at import time, so the env
 * has to be in place first and the registry has to be reset between cases — otherwise the
 * interceptors stack up and one request runs the chain several times.
 *
 * @returns The freshly imported module, with `orvalMutator` and `getAccessToken` on it.
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
            loadHttp().then(({ orvalMutator, getAccessToken }) =>
                orvalMutator({ url: '/orders', method: 'GET' }).then(() => {
                    expect(getAccessToken()).toBe(FRESH_TOKEN);
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
                    // One refresh and two /orders calls — `_dontRetry` stopped the loop.
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
});
