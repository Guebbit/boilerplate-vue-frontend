/**
 * Router wiring.
 *
 * `tests/unit/app/guards/authentications.spec.ts` proves `canAccess` decides correctly. This
 * proves the enforcement is actually *attached*, and that every route declares the requirement it
 * should — a route that quietly loses its `meta.access` is indistinguishable from a public one.
 *
 * Enforcement is therefore mocked here: what is under test is the router's own behaviour (the
 * locale redirect, the 404 catch-alls, the global auth restore, the error → redirect mapping) and
 * the declarations on the route records.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { signInLocation } from '@/app/router/navigation.ts';

const tryRestoreAuth = vi.fn(() => Promise.resolve());
// Returns nothing, i.e. "let the navigation through".
const enforceRouteAccess = vi.fn();

vi.mock('@/app/guards/authentications.ts', () => ({
    tryRestoreAuth: () => tryRestoreAuth(),
    enforceRouteAccess: (to: unknown) => enforceRouteAccess(to)
}));

vi.mock('@/infrastructure/stores/observability.ts', () => ({
    useObservabilityStore: () => ({ captureException: vi.fn(), track: vi.fn() }),
    analyticsEvents: {}
}));

/** Fresh router per test: it holds navigation state, and history is global. */
const loadRouter = () => {
    vi.resetModules();
    return import('@/app/router').then(({ default: router }) =>
        router
            .push('/')
            .then(() => router.isReady())
            .then(() => router)
    );
};

/**
 * Pay for the router's module graph once, outside any test's budget.
 *
 * `@/app/router` pulls in every view, and therefore Vuetify — the most expensive import in the suite.
 * `vi.resetModules()` in `loadRouter` clears the module registry but NOT Vite's transform cache,
 * so only the first import in this file actually transpiles anything; the rest are cheap.
 *
 * Left inside the first test, that one-off cost is charged to it, and under `--coverage` the
 * added instrumentation pushed it past the 5s default — a test that passed alone, passed in
 * `test:unit`, and failed only in `test:unit:coverage`. Warming it here keeps every real case on
 * the tight default budget, which is where a genuine hang should still be caught.
 */
beforeAll(async () => {
    await import('@/app/router');
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

    /**
     * A deep unknown path is caught by the LOCALE-scoped catch-all, not the top-level one.
     *
     * `/:locale` matches a single segment, so `/a/b/c` reads as locale `a` with `b/c` left for
     * the children — where `:catchAll(.*)` takes it. Together with the case above, this is what
     * makes the top-level `/:catchAll(.*)` route unreachable: every path is either `/`, or has a
     * first segment that `/:locale` accepts.
     *
     * Recorded rather than deleted, because "unreachable" is a claim about the route table that
     * only holds while `/:locale` stays a single-segment param — and this test is what would fail
     * if that changed.
     */
    it('sends a deep unknown path to the locale-scoped 404', () =>
        loadRouter().then((router) =>
            router.push('/en/nope/nope/nope').then(() => {
                expect(router.currentRoute.value.name).toBe('Error');
                expect(router.currentRoute.value.params.status).toBe('404');
                expect(router.currentRoute.value.params.message).toBe('error-page.not-found');
                expect(router.currentRoute.value.params.locale).toBe('en');
            })
        ));
});

/**
 * The shop's prose pages — one component, four route records generated from a list.
 *
 * Worth pinning because the NAME is computed (`'Static' + page[0].toUpperCase() + page.slice(1)`)
 * and every navigation to these pages is by name. An off-by-one in that expression produces
 * `StaticAbout` → `Staticbout`, which TypeScript cannot see and which fails only as a dead link.
 */
describe('static prose pages', () => {
    it.each([
        ['about', 'StaticAbout'],
        ['faq', 'StaticFaq'],
        ['terms', 'StaticTerms'],
        ['privacy', 'StaticPrivacy']
    ])('serves /%s as the route named %s', (page, name) =>
        loadRouter().then((router) =>
            router.push(`/en/${page}`).then(() => {
                expect(router.currentRoute.value.name).toBe(name);
                // The one prop that tells the shared component which dictionary to render.
                expect(router.currentRoute.value.matched.at(-1)?.props.default).toEqual({ page });
            })
        )
    );
});

describe('global auth restore', () => {
    it('runs on the initial navigation', () =>
        loadRouter().then(() => {
            expect(tryRestoreAuth).toHaveBeenCalled();
        }));

    it('runs again on every subsequent navigation', () =>
        loadRouter().then((router) => {
            const callsAfterBoot = tryRestoreAuth.mock.calls.length;

            return router.push('/en/playground').then(() => {
                expect(tryRestoreAuth.mock.calls.length).toBeGreaterThan(callsAfterBoot);
            });
        }));
});

describe('access enforcement', () => {
    it('runs on every navigation, public routes included', () =>
        loadRouter().then((router) =>
            router.push('/en/playground').then(() => {
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
            return router.push('/en/playground').then(() => {
                expect(order).toEqual(['restore', 'enforce']);
            });
        }));

    /*
     * The per-route access DECLARATIONS moved to `src/modules/<name>/tests/routes.spec.ts`.
     *
     * They were a table of domain paths here, which meant deleting a domain broke a platform
     * spec about the router shell. What belongs at this level is that enforcement is attached
     * and correctly ordered — asserted above using the two routes the shell owns itself.
     */
});

/**
 * Pushes a route whose guard throws the given error, then lets `onError`'s redirect settle.
 *
 * Waits for the router to actually leave the starting route rather than for a fixed number of
 * ticks: `onError` handles the failure and issues a *second* navigation, which has its own guard
 * chain to run, so how many microtasks that takes is an implementation detail of the guards.
 */
const failNavigationWith = (error: Error) =>
    loadRouter().then((router) =>
        /*
         * Settle somewhere that is NOT Home before failing anything.
         *
         * The wait below is "did we leave `before`", and one of the redirect targets — the 401
         * fallback when this build ships no sign-in route — IS Home. Starting on Home made a
         * correct redirect indistinguishable from no redirect at all, and the helper reported
         * `still on /en` for behaviour that was right.
         */
        router.push('/en/playground').then(() => {
            const before = router.currentRoute.value.fullPath;
            enforceRouteAccess.mockImplementationOnce(() => {
                throw error;
            });
            return router
                .push('/en')
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
        })
    );

describe('onError redirects', () => {
    it('sends a 401 to the sign-in page, remembering where the user was going', () =>
        failNavigationWith(Object.assign(new Error('nope'), { status: 401 })).then((router) => {
            /*
             * Which route that is belongs to whichever module provides sign-in, so the expectation
             * is computed from `signInLocation` rather than spelled `'Login'` here. What this pins
             * is the WIRING — that a 401 goes through that helper at all — while
             * `navigation.spec.ts` covers both of the helper's own branches directly.
             */
            expect(router.currentRoute.value.name).toBe(
                signInLocation(router, '/en/playground', 'en').name
            );
            // The point of the 401 branch: a recoverable status must not dead-end on the error
            // page, which is where every other status goes.
            expect(router.currentRoute.value.name).not.toBe('Error');
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
 * Navigation tracing, which `utils/logger.ts` gates on the `router` scope.
 *
 * The logger resolves its level and scopes once at module scope, so the environment has to be
 * stubbed BEFORE the import — which is why these cases load the router themselves rather than
 * reusing `loadRouter`.
 *
 * Both directions are asserted. A trace that never appears when asked for is as wrong as one that
 * appears when it was not, and only the second is visible by accident.
 */
/** Loads a fresh router with the log scopes stubbed BEFORE import, since they are read once there. */
const loadRouterWithDebug = (enabled: boolean) => {
    vi.resetModules();
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_APP_LOG_LEVEL', 'debug');
    vi.stubEnv('VITE_APP_LOG_SCOPES', enabled ? 'router' : '');
    return import('@/app/router').then(({ default: router }) =>
        router
            .push('/')
            .then(() => router.isReady())
            .then(() => router)
    );
};

/** Every argument of every recorded call, flattened, so a prefixed message still matches. */
const debugText = (spy: { mock: { calls: unknown[][] } }) =>
    spy.mock.calls.map((call) => call.map(String).join(' ')).join('\n');

describe('router navigation tracing', () => {
    it('logs each navigation when the router scope is on', () => {
        const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

        return loadRouterWithDebug(true)
            .then((router) => router.push('/en/playground'))
            .then(() => {
                // The logger prefixes its own scope, so the assertion is on the whole line rather
                // than on the first argument.
                expect(debugText(debugSpy)).toContain('[router]');
                expect(debugText(debugSpy)).toContain('Navigating');
                debugSpy.mockRestore();
            });
    });

    it('stays silent when the router scope is off', () => {
        const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

        return loadRouterWithDebug(false)
            .then((router) => router.push('/en/playground'))
            .then(() => {
                // Scoped to the navigation line rather than asserting console silence outright:
                // other modules may log on boot, and a blanket assertion would fail for reasons
                // that say nothing about the router.
                expect(debugText(debugSpy)).not.toContain('Navigating');
                debugSpy.mockRestore();
            });
    });

    it('reports a navigation failure when the router scope is on', () => {
        const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

        return loadRouterWithDebug(true)
            .then((router) => {
                enforceRouteAccess.mockImplementationOnce(() => {
                    throw new Error('boom');
                });
                return router.push('/en/playground').catch(() => router);
            })
            .then(() =>
                vi.waitFor(() => {
                    if (!debugText(debugSpy).includes('page error'))
                        throw new Error('no page error trace yet');
                })
            )
            .then(() => {
                expect(debugText(debugSpy)).toContain('page error');
                debugSpy.mockRestore();
            });
    });
});
