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
const loadRouter = async () => {
    vi.resetModules();
    const { default: router } = await import('@/router');
    await router.push('/');
    await router.isReady();
    return router;
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
    it('redirects the bare root to the locale-prefixed home', async () => {
        const router = await loadRouter();

        expect(router.currentRoute.value.name).toBe('Home');
        expect(router.currentRoute.value.params.locale).toBeTruthy();
    });
});

describe('unknown routes', () => {
    it('sends an unknown path under a locale to the 404 error page, keeping the locale', async () => {
        const router = await loadRouter();
        await router.push('/en/this-does-not-exist');

        expect(router.currentRoute.value.name).toBe('Error');
        expect(router.currentRoute.value.params.status).toBe('404');
        expect(router.currentRoute.value.params.locale).toBe('en');
    });

    // A single unknown segment is indistinguishable from a locale: `/:locale` matches it, the
    // empty child matches the rest, and `localeChoice` then rewrites the unsupported locale to
    // the default one. So `/nonsense` lands on Home, not on the 404 page — the top-level
    // `/:catchAll(.*)` route is only reachable for paths that cannot be read as a locale at all.
    // Asserted here so the behaviour is a decision on record rather than a surprise.
    it('treats a single unknown segment as a locale and lands on home', async () => {
        const router = await loadRouter();
        await router.push('/nonsense');

        expect(router.currentRoute.value.name).toBe('Home');
        expect(router.currentRoute.value.params.locale).not.toBe('nonsense');
    });
});

describe('global auth restore', () => {
    it('runs on the initial navigation', async () => {
        await loadRouter();

        expect(tryRestoreAuth).toHaveBeenCalled();
    });

    it('runs again on every subsequent navigation', async () => {
        const router = await loadRouter();
        const callsAfterBoot = tryRestoreAuth.mock.calls.length;

        await router.push('/en/products');

        expect(tryRestoreAuth.mock.calls.length).toBeGreaterThan(callsAfterBoot);
    });
});

describe('guard wiring', () => {
    it.each([
        ['/en/cart', 'isAuth', isAuth],
        ['/en/orders', 'isAuth', isAuth],
        ['/en/users', 'isAdmin', isAdmin],
        ['/en/admin', 'isAdmin', isAdmin],
        ['/en/login', 'isGuest', isGuest]
    ])('%s is protected by %s', async (path, _name, guard) => {
        const router = await loadRouter();
        await router.push(path);

        expect(guard).toHaveBeenCalled();
    });

    it('leaves the public product list unguarded', async () => {
        const router = await loadRouter();
        await router.push('/en/products');

        expect(isAuth).not.toHaveBeenCalled();
        expect(isAdmin).not.toHaveBeenCalled();
        expect(isGuest).not.toHaveBeenCalled();
    });
});

/** Pushes a route whose guard throws the given error, then lets the redirect settle. */
const failNavigationWith = async (error: Error) => {
    const router = await loadRouter();
    isAuth.mockImplementationOnce(() => {
        throw error;
    });
    await router.push('/en/cart').catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 0));
    return router;
};

describe('onError redirects', () => {
    it('sends a 401 to the login page, remembering where the user was going', async () => {
        const router = await failNavigationWith(Object.assign(new Error('nope'), { status: 401 }));

        expect(router.currentRoute.value.name).toBe('Login');
        expect(router.currentRoute.value.query.continue).toBe('/en/cart');
    });

    it('sends a 403 to the forbidden error page', async () => {
        const router = await failNavigationWith(Object.assign(new Error('nope'), { status: 403 }));

        expect(router.currentRoute.value.name).toBe('Error');
        expect(router.currentRoute.value.params.status).toBe('403');
    });

    it('treats an error with no status as a 500', async () => {
        const router = await failNavigationWith(new Error('boom'));

        expect(router.currentRoute.value.name).toBe('Error');
        expect(router.currentRoute.value.params.status).toBe('500');
    });
});
