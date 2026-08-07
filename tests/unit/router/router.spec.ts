/**
 * Router wiring.
 *
 * `tests/unit/middlewares/authentications.spec.ts` proves the guards decide correctly. This
 * proves they are actually *attached* — a guard that is never wired in is indistinguishable from
 * a correct one until a route quietly stops being protected.
 *
 * The guards are therefore mocked here: what is under test is the router's own behaviour (the
 * locale redirect, the 404 catch-alls, the global auth restore, the error → redirect mapping),
 * plus the fact that each protected route reaches the guard it declares.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const tryRestoreAuth = vi.fn(() => Promise.resolve());
// Each guard returns nothing, i.e. "let the navigation through".
const isAuth = vi.fn();
const isAdmin = vi.fn();
const isGuest = vi.fn();

vi.mock('@/middlewares/authentications.ts', () => ({
    tryRestoreAuth: () => tryRestoreAuth(),
    isAuth: () => isAuth(),
    isAdmin: () => isAdmin(),
    isGuest: () => isGuest()
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

describe('guard wiring', () => {
    it.each([
        ['/en/cart', 'isAuth', isAuth],
        ['/en/orders', 'isAuth', isAuth],
        ['/en/users', 'isAdmin', isAdmin],
        ['/en/admin', 'isAdmin', isAdmin],
        ['/en/login', 'isGuest', isGuest]
    ])('%s is protected by %s', (path, _name, guard) =>
        loadRouter().then((router) =>
            router.push(path).then(() => {
                expect(guard).toHaveBeenCalled();
            })
        )
    );

    it('leaves the public product list unguarded', () =>
        loadRouter().then((router) =>
            router.push('/en/products').then(() => {
                expect(isAuth).not.toHaveBeenCalled();
                expect(isAdmin).not.toHaveBeenCalled();
                expect(isGuest).not.toHaveBeenCalled();
            })
        ));
});

/** Pushes a route whose guard throws the given error, then lets the redirect settle. */
const failNavigationWith = (error: Error) =>
    loadRouter().then((router) => {
        isAuth.mockImplementationOnce(() => {
            throw error;
        });
        return router
            .push('/en/cart')
            .catch(() => {})
            .then(() => new Promise((resolve) => setTimeout(resolve, 0)))
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
        }));

    it('treats an error with no status as a 500', () =>
        failNavigationWith(new Error('boom')).then((router) => {
            expect(router.currentRoute.value.name).toBe('Error');
            expect(router.currentRoute.value.params.status).toBe('500');
        }));
});
