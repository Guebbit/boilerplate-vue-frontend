/**
 * `persistLocalePreference` — `src/infrastructure/session.ts`.
 *
 * The one write the session store makes that is not about the session itself, and the reason
 * `AppLanguageSwitcher` does not know what a session is. Every case below is the same claim from
 * a different side: **choosing a language always succeeds, whatever the account endpoint does.**
 *
 * The store is real — `isAuth` derives from token AND viewer, and stubbing it would test the stub.
 * Only `@api` is mocked, at the network boundary.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import * as schemas from '@api/schemas';
import { contractResponse } from './http/orval-fixture-schema.ts';
import { aUser } from '../../support/unit/fixtures.ts';

const updateAccountMock = vi.fn();
const getAccountMock = vi.fn();
const getMyAbilitiesMock = vi.fn();
const refreshTokenMock = vi.fn();
const logoutMock = vi.fn();
const logoutAllMock = vi.fn();

vi.mock('@api', () => ({
    getAccount: () => getAccountMock(),
    getMyAbilities: () => getMyAbilitiesMock(),
    refreshToken: () => refreshTokenMock(),
    logout: () => logoutMock(),
    logoutAll: () => logoutAllMock(),
    updateAccount: (body: { locale: string }) => updateAccountMock(body)
}));

const { useSessionStore } = await import('@/infrastructure/session.ts');

/** A store with a token AND a viewer, which is what `isAuth` actually requires. */
const signedIn = () => {
    const store = useSessionStore();
    store.setAccessToken('token');
    void store.setViewer({ id: '1', email: 'a@b.c', role: 'customer' });
    return store;
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    updateAccountMock.mockResolvedValue(contractResponse(schemas.UpdateAccountResponse, aUser()));
    getMyAbilitiesMock.mockResolvedValue(
        contractResponse(schemas.GetMyAbilitiesResponse, {
            platform: [],
            tenant: [],
            version: 1,
            subjects: []
        })
    );
    logoutMock.mockResolvedValue(undefined);
    logoutAllMock.mockResolvedValue(undefined);
});

describe('persistLocalePreference', () => {
    it('writes the choice onto a signed-in visitor’s account', () => {
        return signedIn()
            .persistLocalePreference('it')
            .then(() => {
                expect(updateAccountMock).toHaveBeenCalledWith({ locale: 'it' });
            });
    });

    /*
     * The rule belongs to the store, not to the button: a guest has no record to write to, so the
     * call is not made at all — an anonymous `PATCH /account` would answer 401 and teach nobody
     * anything.
     */
    it('does not call the API for a guest', () => {
        return useSessionStore()
            .persistLocalePreference('it')
            .then(() => {
                expect(updateAccountMock).not.toHaveBeenCalled();
            });
    });

    /* A token with no viewer is a session restored but not yet identified — not signed in. */
    it('does not call the API for a token whose holder is still unknown', () => {
        const store = useSessionStore();
        store.setAccessToken('token');
        return store.persistLocalePreference('it').then(() => {
            expect(updateAccountMock).not.toHaveBeenCalled();
        });
    });

    it('resolves rather than rejecting when the write fails', () => {
        updateAccountMock.mockRejectedValue(new Error('account service down'));
        return expect(signedIn().persistLocalePreference('it')).resolves.toBeUndefined();
    });

    /*
     * Stated as its own case because it is the whole point of the seam: the switcher fires this
     * without awaiting it, so a rejection that escaped would surface as an unhandled rejection in
     * the console of a page that switched language perfectly well.
     */
    it('resolves with nothing on the happy path too, so the caller can ignore it', () => {
        return expect(signedIn().persistLocalePreference('en')).resolves.toBeUndefined();
    });
});

/** Every cookie this store touches, as a plain map — jsdom keeps `document.cookie` real. */
const cookieJar = () =>
    Object.fromEntries(
        document.cookie
            .split('; ')
            .filter(Boolean)
            .map((pair) => pair.split('=') as [string, string])
    );

describe('setAccessToken — the isAuth/rememberMe cookie pair', () => {
    beforeEach(() => {
        // Tests earlier in this file call `signedIn()`, which sets these cookies as a side
        // effect; jsdom keeps `document.cookie` for the whole file, not per test. Cleared through
        // the store's own method, like production code, rather than a raw assignment.
        useSessionStore().clearSession();
    });

    it('sets a session-only isAuth cookie when remember was not chosen', () => {
        useSessionStore().setAccessToken('token', false);

        const jar = cookieJar();
        expect(jar.isAuth).toBe('true');
        expect(jar.rememberMe).toBeUndefined();
    });

    it('sets a persistent isAuth cookie when remember was chosen', () => {
        useSessionStore().setAccessToken('token', true);

        const jar = cookieJar();
        expect(jar.isAuth).toBe('true');
        expect(jar.rememberMe).toBe('true');
    });

    /*
     * The bug this closes: a silent refresh does not know the original login's choice, so it
     * must read it back from `rememberMe` rather than defaulting to session-only — otherwise a
     * "remember me" visitor's isAuth hint would still die at the next browser restart.
     */
    it('keeps the isAuth cookie persistent across a refresh that does not pass `remember`', () => {
        const store = useSessionStore();
        store.setAccessToken('token', true);

        store.setAccessToken('refreshed-token');

        expect(cookieJar().rememberMe).toBe('true');
        // Presence is what `tryRestoreAuth` reads; jsdom does not expose max-age back out.
        expect(cookieJar().isAuth).toBe('true');
    });

    it('does not start a rememberMe marker for a login that never opts in', () => {
        const store = useSessionStore();
        store.setAccessToken('token', true);

        store.setAccessToken('token-again', false);

        expect(cookieJar().rememberMe).toBeUndefined();
    });

    /*
     * jsdom's own cookie jar enforces the Secure flag against the document's actual (http)
     * origin, so a raw `document.cookie` read cannot tell us whether the app asked for it — it
     * would just look absent either way. Spying on the underlying setter, forwarded to the real
     * one so the jar itself is unaffected, is what lets these two see the literal string.
     */
    describe('the Secure attribute follows the page scheme', () => {
        const nativeSetter = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')!.set!;
        let setterSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
            setterSpy = vi.spyOn(Document.prototype, 'cookie', 'set').mockImplementation(function (
                this: Document,
                value: string
            ) {
                nativeSetter.call(this, value);
            });
        });

        afterEach(() => {
            setterSpy.mockRestore();
            vi.unstubAllGlobals();
        });

        const cookiesWritten = (): string[] =>
            setterSpy.mock.calls.map(([value]: [string]) => value);

        it('is appended over https', () => {
            vi.stubGlobal('location', { protocol: 'https:' });

            useSessionStore().setAccessToken('token', true);

            expect(cookiesWritten().some((value) => value.includes('; Secure'))).toBe(true);
        });

        it('is absent over plain http', () => {
            vi.stubGlobal('location', { protocol: 'http:' });

            useSessionStore().setAccessToken('token', true);

            expect(cookiesWritten().some((value) => value.includes('; Secure'))).toBe(false);
        });
    });
});

describe('loadViewer', () => {
    /**
     * `thumbnailUrl` rides alongside `imageUrl` on the account payload — the shell's avatar is the
     * one place outside `account` itself that reads either, so a projection that dropped it would
     * silently fall back to loading the full image for every navigation-bar avatar.
     */
    it('carries thumbnailUrl into the viewer projection', () => {
        getAccountMock.mockResolvedValue(
            contractResponse(
                schemas.GetAccountResponse,
                aUser({
                    role: 'customer',
                    imageUrl: '/images/abc.png',
                    thumbnailUrl: '/images/thumbs/v1/abc.webp'
                })
            )
        );
        const store = useSessionStore();

        return store.loadViewer().then(() => {
            expect(store.viewer?.imageUrl).toBe('/images/abc.png');
            expect(store.viewer?.thumbnailUrl).toBe('/images/thumbs/v1/abc.webp');
        });
    });

    it('leaves thumbnailUrl undefined for an account with none', () => {
        getAccountMock.mockResolvedValue(
            contractResponse(
                schemas.GetAccountResponse,
                aUser({ role: 'customer', imageUrl: '/images/abc.png' })
            )
        );
        const store = useSessionStore();

        return store.loadViewer().then(() => {
            expect(store.viewer?.thumbnailUrl).toBeUndefined();
        });
    });

    /**
     * B10: the verification banner keys on this, not on a shop permission — a platform-only
     * operator with no `Cart` subject at all must still be told their address is unproven.
     */
    it('projects verified true once verifiedAt is set', () => {
        getAccountMock.mockResolvedValue(
            contractResponse(
                schemas.GetAccountResponse,
                aUser({ role: 'customer', verifiedAt: '2026-01-01T00:00:00.000Z' })
            )
        );
        const store = useSessionStore();

        return store.loadViewer().then(() => {
            expect(store.viewer?.verified).toBe(true);
        });
    });

    it('projects verified false while verifiedAt is absent', () => {
        getAccountMock.mockResolvedValue(
            contractResponse(schemas.GetAccountResponse, aUser({ role: 'customer' }))
        );
        const store = useSessionStore();

        return store.loadViewer().then(() => {
            expect(store.viewer?.verified).toBe(false);
        });
    });

    /*
     * The reload case, and the reason the fetch sits beside `setViewer` rather than in the account
     * store: a page load restores the session through this path alone, and a viewer whose rules
     * never arrived is a screen that hides every control its visitor is entitled to.
     */
    it('loads the rules that go with the viewer, not just the projection', () => {
        getAccountMock.mockResolvedValue(
            contractResponse(schemas.GetAccountResponse, aUser({ role: 'admin' }))
        );
        getMyAbilitiesMock.mockResolvedValue(
            contractResponse(schemas.GetMyAbilitiesResponse, {
                platform: [],
                tenant: [['delete', 'Product']],
                version: 1,
                subjects: ['Product']
            })
        );
        const store = useSessionStore();
        store.setAccessToken('token');

        return store
            .loadViewer()
            .then(() => {})
            .then(() => {
                expect(store.tenantAbility.can('delete', 'Product')).toBe(true);
                expect(store.can('delete', 'Product')).toBe(true);
            });
    });

    /**
     * `checkout` is the one action beyond CRUD `can` accepts — `cart.checkout`'s action and
     * nowhere else, see `PermissionAction`'s own docblock.
     */
    it('answers a checkout ability the same way it answers a CRUD one', () => {
        getAccountMock.mockResolvedValue(
            contractResponse(schemas.GetAccountResponse, aUser({ role: 'customer' }))
        );
        getMyAbilitiesMock.mockResolvedValue(
            contractResponse(schemas.GetMyAbilitiesResponse, {
                platform: [],
                tenant: [['checkout', 'Cart']],
                version: 1,
                subjects: ['Cart']
            })
        );
        const store = useSessionStore();
        store.setAccessToken('token');

        return store.loadViewer().then(() => {
            expect(store.can('checkout', 'Cart')).toBe(true);
        });
    });

    /**
     * `declaredSubjects` is what lets a typo in a route's `meta.can` be caught rather than just
     * quietly matching no rule — see `can`'s own docblock for why it warns instead of throwing.
     */
    it('carries the published subject set alongside the rules', () => {
        getAccountMock.mockResolvedValue(
            contractResponse(schemas.GetAccountResponse, aUser({ role: 'admin' }))
        );
        getMyAbilitiesMock.mockResolvedValue(
            contractResponse(schemas.GetMyAbilitiesResponse, {
                platform: [],
                tenant: [],
                version: 1,
                subjects: ['Order', 'Product']
            })
        );
        const store = useSessionStore();
        store.setAccessToken('token');

        return store.loadViewer().then(() => {
            expect(store.declaredSubjects).toEqual(new Set(['Order', 'Product']));
        });
    });

    /** A response that omits `subjects` altogether must not wipe out a set already known. */
    it('leaves a previously published subject set alone when a response omits it', () => {
        getAccountMock.mockResolvedValue(
            contractResponse(schemas.GetAccountResponse, aUser({ role: 'admin' }))
        );
        const store = useSessionStore();
        store.setAbilities({ tenant: [], platform: [], subjects: ['Order'] });

        store.setAbilities({ tenant: [['read', 'Order']], platform: [] });

        expect(store.declaredSubjects).toEqual(new Set(['Order']));
    });
});

/**
 * local state must go whether or not the server call succeeds. A network error, a 5xx, the
 * D16 503, or a 429 must never leave the visitor believing they logged out while the access
 * token, viewer and `isAuth` cookie are all still live.
 */
describe.each(['logout', 'logoutAll'] as const)('%s fails open', (method) => {
    it('clears local state even when the API call rejects', () => {
        const mock = method === 'logout' ? logoutMock : logoutAllMock;
        mock.mockRejectedValue(new Error('network error'));
        const store = signedIn();

        return (store[method]() as Promise<unknown>)
            .catch(() => undefined)
            .then(() => {
                expect(store.isAuth).toBe(false);
                expect(store.accessToken).toBeUndefined();
                expect(cookieJar().isAuth).toBeUndefined();
            });
    });

    it('still rejects with the original error, so a caller can report the failure', () => {
        const mock = method === 'logout' ? logoutMock : logoutAllMock;
        const error = new Error('network error');
        mock.mockRejectedValue(error);

        return expect(signedIn()[method]()).rejects.toBe(error);
    });

    it('resolves, and clears local state, when the API call succeeds', () => {
        const mock = method === 'logout' ? logoutMock : logoutAllMock;
        mock.mockResolvedValue(undefined);
        const store = signedIn();

        return (store[method]() as Promise<unknown>).then(() => {
            expect(store.isAuth).toBe(false);
        });
    });
});

/**
 * the refresh cookie rotates on every renewal, so ending the session while one is still in
 * flight risks revoking the OLD cookie and leaving a rotated one behind, unrevoked.
 */
describe('logout waits out an in-flight refresh', () => {
    it('does not call the API until a pending refresh has settled', () => {
        let resolveRefresh!: (value: { data: { token: string } }) => void;
        refreshTokenMock.mockReturnValue(
            new Promise((resolve) => {
                resolveRefresh = resolve;
            })
        );
        const store = signedIn();
        const refreshing = store.refreshToken();

        const logoutOutcome = store.logout();

        return Promise.resolve()
            .then(() => {
                // Microtask has run; the refresh has not settled, so logout must still be waiting.
                expect(logoutMock).not.toHaveBeenCalled();
                resolveRefresh({ data: { token: 'renewed' } });
                return refreshing;
            })
            .then(() => logoutOutcome)
            .then(() => {
                expect(logoutMock).toHaveBeenCalledOnce();
            });
    });
});

describe('clearSession', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("broadcasts a logout to this browser's other tabs", () => {
        const postMessage = vi.spyOn(BroadcastChannel.prototype, 'postMessage');
        signedIn().clearSession();

        expect(postMessage).toHaveBeenCalledWith({ type: 'logout' });
    });

    it('clears local state on receiving a logout broadcast from another tab', () => {
        const store = signedIn();
        const channel = new BroadcastChannel('session');

        channel.postMessage({ type: 'logout' });

        return vi.waitFor(() => expect(store.isAuth).toBe(false)).finally(() => channel.close());
    });
});

/**
 * a definitive 401/403 from the refresh endpoint means the refresh cookie itself is dead —
 * the one case that must end the session outright, not just answer this one caller `undefined`.
 * A network error or a 5xx says nothing about the cookie, so it must leave the session alone.
 */
describe('refreshToken', () => {
    it('stores the fresh token on success', () => {
        refreshTokenMock.mockResolvedValue({ data: { token: 'fresh' } });
        const store = useSessionStore();

        return store.refreshToken().then((token) => {
            expect(token).toBe('fresh');
            expect(store.accessToken).toBe('fresh');
        });
    });

    it('ends the session and signals expiry on a definitive 401', () => {
        refreshTokenMock.mockRejectedValue({ response: { status: 401 } });
        const store = signedIn();

        return store.refreshToken().then((token) => {
            expect(token).toBeUndefined();
            expect(store.isAuth).toBe(false);
            expect(store.expiredSignal).toBe(1);
        });
    });

    it('ends the session on a definitive 403 the same way', () => {
        refreshTokenMock.mockRejectedValue({ response: { status: 403 } });
        const store = signedIn();

        return store.refreshToken().then(() => {
            expect(store.isAuth).toBe(false);
            expect(store.expiredSignal).toBe(1);
        });
    });

    it('leaves an already-signed-in session alone on a network error', () => {
        refreshTokenMock.mockRejectedValue(new Error('Network Error'));
        const store = signedIn();

        return store.refreshToken().then((token) => {
            expect(token).toBeUndefined();
            // Still signed in: a network error says nothing about the refresh cookie itself.
            expect(store.isAuth).toBe(true);
            expect(store.expiredSignal).toBe(0);
        });
    });

    it('shares one in-flight attempt between concurrent callers', () => {
        refreshTokenMock.mockResolvedValue({ data: { token: 'fresh' } });
        const store = useSessionStore();

        return Promise.all([store.refreshToken(), store.refreshToken()]).then(() => {
            expect(refreshTokenMock).toHaveBeenCalledOnce();
        });
    });

    /**
     * The race this also guards against from the other side: a refresh that was already in flight
     * when the session was cleared must not resurrect it once it lands.
     */
    it('drops a fresh token that arrives after the session was cleared mid-flight', () => {
        let resolveRefresh!: (value: { data: { token: string } }) => void;
        refreshTokenMock.mockReturnValue(
            new Promise((resolve) => {
                resolveRefresh = resolve;
            })
        );
        const store = signedIn();
        const refreshing = store.refreshToken();

        store.clearSession();
        resolveRefresh({ data: { token: 'too-late' } });

        return refreshing.then(() => {
            expect(store.accessToken).toBeUndefined();
        });
    });
});
