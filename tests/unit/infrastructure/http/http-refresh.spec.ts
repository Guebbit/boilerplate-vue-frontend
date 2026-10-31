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
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../support/unit/msw-server.ts';
import { deleteCookie } from '@guebbit/js-toolkit';
import { createPinia, setActivePinia } from 'pinia';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useReauthPromptStore } from '@/infrastructure/http/reauth-prompt.ts';
import { aProblem } from '../../../support/unit/fixtures.ts';
import { ROUTES } from '@api/routes';

/** Base URL the axios instance is built against; also what the handlers below are mounted on. */
const API = 'http://api.test';

/** The token a successful refresh hands back, and therefore what the replay must carry. */
const FRESH_TOKEN = 'fresh-token';

/**
 * Endpoints that must never trigger a refresh. The contract marks them (`x-no-refresh`, which
 * the generated route table carries as `noRefresh`); the first test below holds this list equal
 * to those rows.
 *
 * A 401 from any of them is a normal business outcome — wrong password, expired reset link, a
 * session already invalidated — so refreshing there turns a clean error message into an extra
 * round trip and, when the refresh also fails, a misleading session-expired state.
 */
const EXCLUDED_PATHS = [
    '/account/login',
    '/account/signup',
    '/account/password/reset',
    '/account/password/reset/confirm',
    '/account/login/2fa',
    '/account/login/2fa/send',
    '/account/login/restore',
    '/account/restore'
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
    /** Whether the protected route answers `401 SESSION_IDLE`: a staff session that idled out. */
    protectedIdle: boolean;
    /** Whether the protected route answers `403`: the rules changed under a live session. */
    protectedForbidden: boolean;
    /** Whether `GET /account` (the read that carries the abilities) itself answers `403`. */
    abilitiesForbidden: boolean;
}

/** @returns The scenario every case starts from: one refresh available, nothing accepted yet. */
const defaultScenario = (): Scenario => ({
    refreshBudget: 1,
    refreshOmitsToken: false,
    protectedAccepts: false,
    protectedIdle: false,
    protectedForbidden: false,
    abilitiesForbidden: false
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
    HttpResponse.json(aProblem(401, [{ code: 'UNAUTHORIZED', message }]), { status: 401 });

/** This file's stub endpoints, registered on the shared MSW server before each test. */
const handlers = [
    /**
     * `POST /account/refresh` — succeeds while the budget lasts, then answers 401 like an expired
     * refresh cookie would.
     */
    http.post(`${API}/account/refresh`, ({ request }) => {
        requestLog.push({
            route: 'POST /account/refresh',
            authorization: request.headers.get('authorization') ?? undefined
        });

        if (scenario.refreshBudget <= 0) return unauthorized('Unauthorized');
        scenario.refreshBudget -= 1;

        return scenario.refreshOmitsToken
            ? HttpResponse.json({})
            : HttpResponse.json({
                  token: FRESH_TOKEN,
                  abilities: {
                      platform: [],
                      tenant: [],
                      version: 1,
                      grantableRoles: [],
                      secondFactorRequired: false
                  }
              });
    }),

    /**
     * `GET /orders` — the protected route the flow is triggered from. It answers 401 until it is
     * both told to accept and given the refreshed token, which is what makes the replay visible.
     */
    http.get(`${API}/orders`, ({ request }) => {
        const authorization = request.headers.get('authorization') ?? undefined;
        requestLog.push({ route: 'GET /orders', authorization });

        if (scenario.protectedForbidden)
            return HttpResponse.json(aProblem(403, [{ code: 'FORBIDDEN', message: 'Forbidden' }]), {
                status: 403
            });

        if (scenario.protectedIdle)
            return HttpResponse.json(
                aProblem(401, [{ code: 'SESSION_IDLE', message: 'Your session ended.' }]),
                { status: 401 }
            );

        return scenario.protectedAccepts && authorization === `Bearer ${FRESH_TOKEN}`
            ? HttpResponse.json({ items: [] })
            : unauthorized('Unauthorized');
    }),

    /** `GET /account` — what a 403 sends the session back to read: it carries the abilities. */
    http.get(`${API}/account`, () => {
        requestLog.push({ route: 'GET /account' });
        return scenario.abilitiesForbidden
            ? HttpResponse.json(aProblem(403, [{ code: 'FORBIDDEN', message: 'Forbidden' }]), {
                  status: 403
              })
            : HttpResponse.json({
                  id: '1',
                  email: 'a@b.c',
                  username: 'ada',
                  abilities: {
                      platform: [],
                      tenant: [],
                      version: 1,
                      grantableRoles: [],
                      secondFactorRequired: false
                  },
                  activity: { lastActiveAt: '2026-01-01T00:00:00.000Z' }
              });
    }),

    /** Every excluded path, each answering 401 as the ordinary outcome the exclusion exists for. */
    ...[...EXCLUDED_PATHS, ABSOLUTE_EXCLUDED_URL].map((path) =>
        http.post(path.startsWith('http') ? path : `${API}${path}`, ({ request }) => {
            requestLog.push({ route: `POST ${new URL(request.url).pathname}` });
            return unauthorized('Bad credentials');
        })
    ),

    /**
     * `DELETE /account/sessions` — unlike the excluded paths above, a 401 here means an
     * EXPIRED access token, not bad credentials (the backend mounts it behind `isAuth`), so it
     * must go through the same refresh-and-replay as any other protected route.
     */
    http.delete(`${API}/account/sessions`, ({ request }) => {
        const authorization = request.headers.get('authorization') ?? undefined;
        requestLog.push({ route: 'DELETE /account/sessions', authorization });

        return scenario.protectedAccepts && authorization === `Bearer ${FRESH_TOKEN}`
            ? new HttpResponse(null, { status: 204 })
            : unauthorized('Unauthorized');
    })
];

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
 * Clears the `isAuth` cookie with js-toolkit's `deleteCookie`, the way `session.ts` clears it.
 *
 * @returns Nothing; the cookie is cleared as a side effect.
 */
const clearAuthCookie = () => deleteCookie('isAuth');

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

beforeEach(() => {
    server.use(...handlers);
    setActivePinia(createPinia());
    requestLog = [];
    scenario = defaultScenario();
    clearAuthCookie();
    vi.unstubAllEnvs();
});

describe('a 401 SESSION_IDLE', () => {
    it('ends the session for inactivity without refreshing: there is nothing left to renew', () => {
        scenario.protectedIdle = true;

        return loadHttp()
            .then(({ orvalMutator }) =>
                orvalMutator({ url: '/orders', method: 'GET' }).catch(() => undefined)
            )
            .then(() => {
                expect(routes()).toEqual(['GET /orders']);
                expect(useSessionStore().idleSignal).toBe(1);
                expect(useSessionStore().expiredSignal).toBe(0);
            });
    });
});

/**
 * Signs the store in (token and viewer), so `isAuth` is true. Imported after {@link loadHttp},
 * so the store's own API calls go through the same freshly-built axios instance.
 */
const signIn = async () => {
    const { useSessionStore: freshSessionStore } = await import('@/infrastructure/session.ts');
    const session = freshSessionStore();
    session.setAccessToken('token');
    session.viewer = { id: '1', email: 'a@b.c', role: 'customer' };
    return session;
};

describe('a 403 on a signed-in request', () => {
    it('re-reads the abilities once, without refreshing the token', () => {
        scenario.protectedForbidden = true;
        let session!: Awaited<ReturnType<typeof signIn>>;

        return loadHttp()
            .then(signIn)
            .then((signedIn) => {
                session = signedIn;
            })
            .then(() => import('@/infrastructure/http'))
            .then(({ orvalMutator }) =>
                orvalMutator({ url: '/orders', method: 'GET' }).catch(() => undefined)
            )
            .then(() => vi.waitFor(() => expect(session.abilitiesSignal).toBe(1)))
            .then(() => {
                expect(routes()).toEqual(['GET /orders', 'GET /account']);
            });
    });

    it('does not loop when the abilities read is itself refused', () => {
        scenario.abilitiesForbidden = true;

        return loadHttp()
            .then(signIn)
            .then(() => import('@/infrastructure/http'))
            .then(({ orvalMutator }) =>
                orvalMutator({ url: '/account', method: 'GET' }).catch(() => undefined)
            )
            .then(() => {
                expect(routes()).toEqual(['GET /account']);
            });
    });

    it('asks nothing for a guest', () => {
        scenario.protectedForbidden = true;

        return loadHttp()
            .then(({ orvalMutator }) =>
                orvalMutator({ url: '/orders', method: 'GET' }).catch(() => undefined)
            )
            .then(() => {
                expect(routes()).toEqual(['GET /orders']);
            });
    });
});

describe('401 refresh flow', () => {
    describe('when the refresh succeeds', () => {
        beforeEach(() => {
            scenario.protectedAccepts = true;
        });

        it('refreshes once and replays the original request with the new token', () =>
            loadHttp()
                .then(({ orvalMutator }) =>
                    orvalMutator<{ items: unknown[] }>({ url: '/orders', method: 'GET' })
                )
                .then((result) => {
                    expect(result.items).toEqual([]);
                    expect(routes()).toEqual([
                        'GET /orders',
                        'POST /account/refresh',
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
         * Single-flight: two 401s in the same tick must not race the refresh cookie against
         * itself with two `POST /account/refresh` calls.
         */
        it('shares one refresh call between two 401s that arrive together', () =>
            loadHttp().then(({ orvalMutator }) =>
                Promise.all([
                    orvalMutator({ url: '/orders', method: 'GET' }),
                    orvalMutator({ url: '/orders', method: 'GET' })
                ]).then(() => {
                    expect(timesRequested('POST /account/refresh')).toBe(1);
                })
            ));

        /**
         * `DELETE /account/sessions` sits behind `isAuth` on the backend, so an expired
         * access token answers it a plain 401 — the same shape any other protected route gets,
         * and one this flow must not treat as a bad-credentials dead end.
         */
        it('refreshes and replays a 401 from /account/sessions', () =>
            loadHttp()
                .then(({ orvalMutator }) =>
                    orvalMutator({ url: '/account/sessions', method: 'DELETE' })
                )
                .then(() => {
                    expect(routes()).toEqual([
                        'DELETE /account/sessions',
                        'POST /account/refresh',
                        'DELETE /account/sessions'
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
                        type: 'about:blank',
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
                        type: 'about:blank',
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
                    expect(timesRequested('POST /account/refresh')).toBe(1);
                    expect(timesRequested('GET /orders')).toBe(2);
                }));
    });

    /**
     * Driven through `orvalMutator` against the real interceptor chain, and asserted on the
     * server's own request log — the only place a refresh attempt is observable without mocking
     * the very code under test.
     */
    describe('when the 401 comes from an excluded endpoint', () => {
        it('is exactly the operations the contract marks x-no-refresh', () => {
            const marked = ROUTES.filter((route) => route.noRefresh);

            expect(marked).toHaveLength(EXCLUDED_PATHS.length);
            for (const path of EXCLUDED_PATHS)
                expect(
                    marked.some((route) => route.method === 'POST' && route.pattern.test(path))
                ).toBe(true);
        });

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
                    expect(timesRequested('POST /account/refresh')).toBe(0);
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
                            aProblem(401, [
                                {
                                    code: 'REAUTH_REQUIRED',
                                    message: 'Fresh authentication required'
                                }
                            ]),
                            { status: 401 }
                        );
                    // Call 3: stepped up — the fresh session the second call demanded now exists.
                    return HttpResponse.json({ orderId: 'o1' });
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
                            'POST /account/refresh',
                            'POST /checkout',
                            'POST /checkout'
                        ]);
                    });
            }));
    });
});

/**
 * `cookie` mode has no token to renew — `POST /account/refresh` is a 404 there — so a 401 means
 * the session cookie is gone. The interceptor must end the session at once and never call refresh.
 */
describe('401 in cookie mode', () => {
    it('ends a held session without calling refresh, and tells the shell it expired', () => {
        const session = useSessionStore();
        session.mode = 'cookie';
        session.startCookieSession();

        return loadHttp()
            .then(({ orvalMutator }) =>
                expect(orvalMutator({ url: '/orders', method: 'GET' })).rejects.toMatchObject({
                    status: 401
                })
            )
            .then(() => {
                expect(routes()).toEqual(['GET /orders']);
                expect(session.hasSession).toBe(false);
                expect(session.expiredSignal).toBe(1);
            });
    });

    it('treats a guest 401 as a plain refusal: no refresh, no expiry toast', () => {
        const session = useSessionStore();
        session.mode = 'cookie';

        return loadHttp()
            .then(({ orvalMutator }) =>
                expect(orvalMutator({ url: '/orders', method: 'GET' })).rejects.toMatchObject({
                    status: 401
                })
            )
            .then(() => {
                expect(routes()).toEqual(['GET /orders']);
                expect(session.expiredSignal).toBe(0);
            });
    });
});
