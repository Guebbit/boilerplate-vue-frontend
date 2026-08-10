/**
 * Router wiring.
 *
 * `tests/unit/middlewares/authentications.spec.ts` proves `canAccess` decides correctly. This
 * proves the enforcement is actually *attached*, and that every route declares the requirement it
 * should — a route that quietly loses its `meta.access` is indistinguishable from a public one.
 *
 * Enforcement is therefore mocked here: what is under test is the router's own behaviour (the
 * locale redirect, the 404 catch-alls, the global auth restore, the error → redirect mapping) and
 * the declarations on the route records.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const tryRestoreAuth = vi.fn(() => Promise.resolve());
// Returns nothing, i.e. "let the navigation through".
const enforceRouteAccess = vi.fn();

vi.mock('@/middlewares/authentications.ts', () => ({
    tryRestoreAuth: () => tryRestoreAuth(),
    enforceRouteAccess: (to: unknown) => enforceRouteAccess(to)
}));

vi.mock('@/stores/observability', () => ({
    useObservabilityStore: () => ({ captureException: vi.fn(), track: vi.fn() }),
    analyticsEvents: {}
}));

/** Fresh router per test: it holds navigation state, and history is global. */
const loadRouter = () => {
    vi.resetModules();
    return import('@/router').then(({ default: router }) =>
        router
            .push('/')
            .then(() => router.isReady())
            .then(() => router)
    );
};

/**
 * Pay for the router's module graph once, outside any test's budget.
 *
 * `@/router` pulls in every view, and therefore Vuetify — the most expensive import in the suite.
 * `vi.resetModules()` in `loadRouter` clears the module registry but NOT Vite's transform cache,
 * so only the first import in this file actually transpiles anything; the rest are cheap.
 *
 * Left inside the first test, that one-off cost is charged to it, and under `--coverage` the
 * added instrumentation pushed it past the 5s default — a test that passed alone, passed in
 * `test:unit`, and failed only in `test:unit:coverage`. Warming it here keeps every real case on
 * the tight default budget, which is where a genuine hang should still be caught.
 */
beforeAll(async () => {
    await import('@/router');
}, 60_000);

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    globalThis.history.replaceState({}, '', '/');
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('locale handling', () => {
    it('redirects the bare root to the locale-prefixed home', () =>
        loadRouter().then((router) => {
            expect(router.currentRoute.value.name).toBe('Home');
            expect(router.currentRoute.value.params.locale).toBeTruthy();
        }));
});

describe('unknown routes', () => {
    it('sends an unknown path under a locale to the 404 error page, keeping the locale', () =>
        loadRouter().then((router) =>
            router.push('/en/this-does-not-exist').then(() => {
                expect(router.currentRoute.value.name).toBe('Error');
                expect(router.currentRoute.value.params.status).toBe('404');
                expect(router.currentRoute.value.params.locale).toBe('en');
            })
        ));

    // A single unknown segment is indistinguishable from a locale: `/:locale` matches it, the
    // empty child matches the rest, and `localeChoice` then rewrites the unsupported locale to
    // the default one. So `/nonsense` lands on Home, not on the 404 page — the top-level
    // `/:catchAll(.*)` route is only reachable for paths that cannot be read as a locale at all.
    // Asserted here so the behaviour is a decision on record rather than a surprise.
    it('treats a single unknown segment as a locale and lands on home', () =>
        loadRouter().then((router) =>
            router.push('/nonsense').then(() => {
                expect(router.currentRoute.value.name).toBe('Home');
                expect(router.currentRoute.value.params.locale).not.toBe('nonsense');
            })
        ));
});

describe('global auth restore', () => {
    it('runs on the initial navigation', () =>
        loadRouter().then(() => {
            expect(tryRestoreAuth).toHaveBeenCalled();
        }));

    it('runs again on every subsequent navigation', () =>
        loadRouter().then((router) => {
            const callsAfterBoot = tryRestoreAuth.mock.calls.length;

            return router.push('/en/products').then(() => {
                expect(tryRestoreAuth.mock.calls.length).toBeGreaterThan(callsAfterBoot);
            });
        }));
});

describe('access enforcement', () => {
    it('runs on every navigation, public routes included', () =>
        loadRouter().then((router) =>
            router.push('/en/products').then(() => {
                // Enforcement is global, so it is reached even where it has nothing to enforce.
                // That is the point: a route cannot opt out of being checked by omission.
                expect(enforceRouteAccess).toHaveBeenCalled();
            })
        ));

    it('runs only after the auth restore has settled', () =>
        loadRouter().then((router) => {
            const order: string[] = [];
            tryRestoreAuth.mockImplementationOnce(() =>
                Promise.resolve().then(() => {
                    order.push('restore');
                })
            );
            enforceRouteAccess.mockImplementationOnce(() => {
                order.push('enforce');
            });

            // Reversed, an authenticated visitor who reloads is bounced to login on every hit.
            return router.push('/en/cart').then(() => {
                expect(order).toEqual(['restore', 'enforce']);
            });
        }));

    it.each([
        ['/en/cart', 'auth'],
        ['/en/orders', 'auth'],
        ['/en/orders/abc', 'auth'],
        ['/en/profile', 'auth'],
        ['/en/orders/abc/edit', 'admin'],
        ['/en/users', 'admin'],
        ['/en/users/create', 'admin'],
        ['/en/users/abc', 'admin'],
        ['/en/users/abc/edit', 'admin'],
        ['/en/admin', 'admin'],
        ['/en/products/create', 'admin'],
        ['/en/products/abc/edit', 'admin'],
        ['/en/login', 'guest'],
        ['/en/signup', 'guest'],
        ['/en/password-reset', 'guest']
    ])('%s declares access: %s', (path, access) =>
        loadRouter().then((router) => {
            expect(router.resolve(path).meta.access).toBe(access);
        })
    );

    it.each([
        ['/en/products'],
        ['/en/products/abc'],
        ['/en/'],
        ['/en/playground'],
        // The token in the URL is the credential; the visitor following it is not logged in.
        ['/en/account-delete/confirm']
    ])('%s is public', (path) =>
        loadRouter().then((router) => {
            expect(router.resolve(path).meta.access).toBeUndefined();
        })
    );
});

/**
 * Pushes a route whose guard throws the given error, then lets `onError`'s redirect settle.
 *
 * Waits for the router to actually leave the starting route rather than for a fixed number of
 * ticks: `onError` handles the failure and issues a *second* navigation, which has its own guard
 * chain to run, so how many microtasks that takes is an implementation detail of the guards.
 */
const failNavigationWith = (error: Error) =>
    loadRouter().then((router) => {
        const before = router.currentRoute.value.fullPath;
        enforceRouteAccess.mockImplementationOnce(() => {
            throw error;
        });
        return router
            .push('/en/cart')
            .catch(() => {})
            .then(() =>
                // A thrown Error rather than `expect`, so this reads as a wait condition in a
                // helper rather than as an assertion outside a test block.
                vi.waitFor(() => {
                    if (router.currentRoute.value.fullPath === before)
                        throw new Error(`still on ${before}`);
                })
            )
            .then(() => router);
    });

describe('onError redirects', () => {
    it('sends a 401 to the login page, remembering where the user was going', () =>
        failNavigationWith(Object.assign(new Error('nope'), { status: 401 })).then((router) => {
            expect(router.currentRoute.value.name).toBe('Login');
            expect(router.currentRoute.value.query.continue).toBe('/en/cart');
        }));

    it('sends a 403 to the forbidden error page', () =>
        failNavigationWith(Object.assign(new Error('nope'), { status: 403 })).then((router) => {
            expect(router.currentRoute.value.name).toBe('Error');
            expect(router.currentRoute.value.params.status).toBe('403');
            // The reason 403 keeps a branch of its own: "you may not see this" is a different
            // thing to tell someone than whatever `error.message` happened to hold ('nope').
            expect(router.currentRoute.value.params.message).toBe('navigation.error-forbidden');
        }));

    it('shows the error’s own message for other client statuses', () =>
        failNavigationWith(Object.assign(new Error('teapot'), { status: 418 })).then((router) => {
            expect(router.currentRoute.value.params.status).toBe('418');
            expect(router.currentRoute.value.params.message).toBe('teapot');
        }));

    it('collapses a 5xx status to a plain 500', () =>
        /*
         * The `status !== undefined && status < 500` guard needs a DEFINED status at or above 500 to
         * be meaningful: with an absent one both halves are false either way, so 401/403/418 and the
         * no-status case together still cannot tell `&&` from `||`, nor a fixed `true` from the real
         * condition. A 503 is the case that does.
         *
         * Collapsing is deliberate — the flavour of a server-side failure is not the visitor's
         * business, and the error page has one 500 screen.
         */
        failNavigationWith(Object.assign(new Error('gateway'), { status: 503 })).then((router) => {
            expect(router.currentRoute.value.params.status).toBe('500');
        }));

    it('treats an error with no status as a 500', () =>
        failNavigationWith(new Error('boom')).then((router) => {
            expect(router.currentRoute.value.name).toBe('Error');
            expect(router.currentRoute.value.params.status).toBe('500');
        }));
});

/**
 * The `VITE_APP_DEBUG_ROUTER` logging path.
 *
 * `isRouterDebugEnabled` is computed once at module scope, so the flag has to be stubbed BEFORE the
 * import — which is why these cases load the router themselves instead of reusing `loadRouter`.
 *
 * It had no coverage at all, in either direction: nothing asserted that the logs appear when the
 * flag is on, and nothing asserted they stay quiet when it is off. A `no-console` lint exemption
 * guarding code no test executes is how a stray `console.log` reaches a production bundle.
 */
/** Loads a fresh router with the debug flag stubbed BEFORE import, since it is read at module scope. */
const loadRouterWithDebug = (enabled: boolean) => {
    vi.resetModules();
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_APP_DEBUG_ROUTER', enabled ? 'true' : 'false');
    return import('@/router').then(({ default: router }) =>
        router
            .push('/')
            .then(() => router.isReady())
            .then(() => router)
    );
};

describe('router debug logging', () => {
    it('logs each navigation when the flag is on', () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});

        return loadRouterWithDebug(true)
            .then((router) => router.push('/en/products'))
            .then(() => {
                expect(log).toHaveBeenCalled();
                expect(log.mock.calls.some(([first]) => String(first).includes('Navigating'))).toBe(
                    true
                );
                log.mockRestore();
            });
    });

    it('stays silent when the flag is off', () => {
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});

        return loadRouterWithDebug(false)
            .then((router) => router.push('/en/products'))
            .then(() => {
                // Scoped to the navigation line rather than asserting console silence outright:
                // other modules log on boot (the counter store), and a blanket assertion would fail
                // for reasons that say nothing about the router.
                expect(log.mock.calls.some(([first]) => String(first).includes('Navigating'))).toBe(
                    false
                );
                log.mockRestore();
            });
    });

    it('reports a navigation failure when the flag is on', () => {
        const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});

        return loadRouterWithDebug(true)
            .then((router) => {
                enforceRouteAccess.mockImplementationOnce(() => {
                    throw new Error('boom');
                });
                return router.push('/en/cart').catch(() => router);
            })
            .then(() =>
                vi.waitFor(() => {
                    if (!errorLog.mock.calls.some(([first]) => String(first) === 'page error'))
                        throw new Error('no page error log yet');
                })
            )
            .then(() => {
                expect(errorLog.mock.calls.some(([first]) => String(first) === 'page error')).toBe(
                    true
                );
                errorLog.mockRestore();
            });
    });
});
