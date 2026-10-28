/**
 * The session store — `src/infrastructure/session.ts`: credential, viewer, abilities, idle timeout,
 * cross-tab sync and logout. The step-up, verification-mail and language-preference calls have
 * their own specs beside this one.
 *
 * The store is real — `isAuth` derives from token AND viewer, and stubbing it would test the stub.
 * Only `@api` is mocked, at the network boundary.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import * as schemas from '@api/schemas';
import { contractBody } from './http/orval-fixture-schema.ts';
import type { AccountView } from '@types';
import { anAccount, aProblem } from '../../support/unit/fixtures.ts';
import { accountView } from '../../support/unit/account-view.ts';

/** `GET /account`'s answer carrying exactly the given tenant rules, proven against the contract. */
const viewOf = (tenant: unknown[], overrides: Parameters<typeof anAccount>[0] = {}) =>
    contractBody<AccountView>(
        schemas.GetAccountResponse,
        accountView(anAccount({ role: 'customer', ...overrides }), tenant)
    );

// `vi.fn()` deliberately left untyped: these mocks return partial, case-by-case fixture shapes
// the real generated envelope types would refuse, and that looseness is the point of a mock.
/** Stub for the account API's `getAccount`. */
const getAccountMock = vi.fn();

/** Stub for the token refresh call. */
const refreshTokenMock = vi.fn();

/** Stub for `GET /account/session-config`. */
const getSessionConfigMock = vi.fn();

/** Stub for logout. */
const logoutMock = vi.fn();

/** Stub for logout-everywhere. */
const logoutAllMock = vi.fn();

// Every arrow below forwards to a deliberately untyped `vi.fn()` (see above), so each return is
// `any` — one disable per line rather than retyping the mocks against the full generated
// envelope shapes these fixtures intentionally only build part of.
vi.mock('@api', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- deliberately untyped vi.fn(), see above
    getAccount: (options?: unknown) => getAccountMock(options),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- deliberately untyped vi.fn(), see above
    getSessionConfig: () => getSessionConfigMock(),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- deliberately untyped vi.fn(), see above
    refreshToken: (options?: unknown) => refreshTokenMock(options),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- deliberately untyped vi.fn(), see above
    logout: () => logoutMock(),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- deliberately untyped vi.fn(), see above
    logoutAll: () => logoutAllMock(),
    // The "still there?" answer; a shopper's names no timeout.
    touchSession: () => Promise.resolve({ lastActiveAt: new Date().toISOString() })
}));

/** The store under test, imported after the mocks are in place. */
const { useSessionStore } = await import('@/infrastructure/session.ts');

/** A store with a token AND a viewer, which is what `isAuth` actually requires. */
const signedIn = () => {
    const store = useSessionStore();
    store.setAccessToken('token');
    store.setViewer({ id: '1', email: 'a@b.c', role: 'customer' });
    return store;
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    getAccountMock.mockResolvedValue(viewOf([]));
    logoutMock.mockResolvedValue(undefined);
    logoutAllMock.mockResolvedValue(undefined);
});

/** Every cookie this store touches, as a plain map — jsdom keeps `document.cookie` real. */
const cookieJar = () =>
    Object.fromEntries(
        document.cookie
            .split('; ')
            .filter(Boolean)
            .map((pair) => pair.split('=') as [string, string])
    );

describe('setAccessToken — the rememberMe marker, with the isAuth hint left to the backend', () => {
    beforeEach(() => {
        // Tests earlier in this file call `signedIn()`, which sets these cookies as a side
        // effect; jsdom keeps `document.cookie` for the whole file, not per test. Cleared through
        // the store's own method, like production code, rather than a raw assignment.
        useSessionStore().clearSession();
    });

    it('writes no isAuth cookie of its own: the backend sets it beside the session cookie', () => {
        useSessionStore().setAccessToken('token', true);

        expect(cookieJar().isAuth).toBeUndefined();
    });

    it('sets no marker when remember was not chosen', () => {
        useSessionStore().setAccessToken('token', false);

        expect(cookieJar().rememberMe).toBeUndefined();
    });

    it('sets the marker when remember was chosen', () => {
        useSessionStore().setAccessToken('token', true);

        expect(cookieJar().rememberMe).toBe('true');
    });

    it("lasts as long as the server's longest tier", () => {
        const store = useSessionStore();
        store.lifetimes = { lifetimeSeconds: { short: 86_400, medium: 604_800, long: 1_209_600 } };
        const cookieWrites: string[] = [];
        const setter = vi.spyOn(document, 'cookie', 'set').mockImplementation((value) => {
            cookieWrites.push(value);
        });

        store.setAccessToken('token', true);
        setter.mockRestore();

        const expires = /expires=([^;]+)/.exec(cookieWrites.join(';'))?.[1] ?? '';
        const days = (new Date(expires).getTime() - Date.now()) / 86_400_000;
        expect(Math.round(days)).toBe(14);
    });

    it('keeps the marker across a refresh that does not pass `remember`', () => {
        const store = useSessionStore();
        store.setAccessToken('token', true);

        store.setAccessToken('refreshed-token');

        expect(cookieJar().rememberMe).toBe('true');
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
        // `vi.spyOn`'s bare `ReturnType` picks the wrong overload for a "set" accessor spy —
        // named explicitly against the "set" overload's own `Mock<(arg: T[G]) => void>` shape.
        let setterSpy: Mock<(value: string) => void>;

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

            expect(cookiesWritten().some((value) => /; secure/i.test(value))).toBe(true);
        });

        it('is absent over plain http', () => {
            vi.stubGlobal('location', { protocol: 'http:' });

            useSessionStore().setAccessToken('token', true);

            expect(cookiesWritten().some((value) => /; secure/i.test(value))).toBe(false);
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
            viewOf([], {
                role: 'customer',
                imageUrl: '/images/abc.png',
                thumbnailUrl: '/images/thumbs/v1/abc.webp'
            })
        );
        const store = useSessionStore();

        return store.loadViewer().then(() => {
            expect(store.viewer?.imageUrl).toBe('/images/abc.png');
            expect(store.viewer?.thumbnailUrl).toBe('/images/thumbs/v1/abc.webp');
        });
    });

    it('leaves thumbnailUrl undefined for an account with none', () => {
        getAccountMock.mockResolvedValue(
            viewOf([], { role: 'customer', imageUrl: '/images/abc.png' })
        );
        const store = useSessionStore();

        return store.loadViewer().then(() => {
            expect(store.viewer?.thumbnailUrl).toBeUndefined();
        });
    });

    /**
     * The verification banner keys on this, not on a shop permission — a platform-only
     * operator with no `Cart` subject at all must still be told their address is unproven.
     */
    it('projects verified true once verifiedAt is set', () => {
        getAccountMock.mockResolvedValue(
            viewOf([], { role: 'customer', verifiedAt: '2026-01-01T00:00:00.000Z' })
        );
        const store = useSessionStore();

        return store.loadViewer().then(() => {
            expect(store.viewer?.verified).toBe(true);
        });
    });

    it('projects verified false while verifiedAt is absent', () => {
        getAccountMock.mockResolvedValue(viewOf([], { role: 'customer' }));
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
    it('takes the rules that go with the viewer from the same answer, not just the projection', () => {
        getAccountMock.mockResolvedValue(viewOf([['delete', 'Product']], { role: 'admin' }));
        const store = useSessionStore();
        store.setAccessToken('token');

        return store.loadViewer().then(() => {
            expect(store.tenantAbility.can('delete', 'Product')).toBe(true);
            expect(store.can('delete', 'Product')).toBe(true);
            expect(getAccountMock).toHaveBeenCalledOnce();
        });
    });

    /**
     * `checkout` is the one action beyond CRUD `can` accepts — `cart.checkout`'s action and
     * nowhere else, see `PermissionAction`'s own docblock.
     */
    it('answers a checkout ability the same way it answers a CRUD one', () => {
        getAccountMock.mockResolvedValue(viewOf([['checkout', 'Cart']]));
        const store = useSessionStore();
        store.setAccessToken('token');

        return store.loadViewer().then(() => {
            expect(store.can('checkout', 'Cart')).toBe(true);
        });
    });

    /**
     * The staff action is its own rule: an own-rows `read` answers `can('read')` and not
     * `can('display')`, and the staff `display` arrives with the `read` it implies, which the
     * server emits beside it.
     */
    it.each([
        [
            'an own-rows read answers read, not display',
            [['read', 'Order', { userId: 'u1', tenantId: 't1' }]],
            { read: true, display: false }
        ],
        [
            'a staff display (with its implied read) answers both',
            [
                ['display', 'Order', { tenantId: 't1' }],
                ['read', 'Order', { tenantId: 't1' }]
            ],
            { read: true, display: true }
        ],
        ['no rule at all', [], { read: false, display: false }]
    ] as const)('staff action: %s', (_name, rules, expected) => {
        const store = signedIn();
        store.setAbilities({ tenant: rules.map((rule) => [...rule]), platform: [] });

        expect({
            read: store.can('read', 'Order'),
            display: store.can('display', 'Order')
        }).toEqual(expected);
    });

    it('keeps the roles the caller may grant, and empties them with the rest of the abilities', () => {
        const store = useSessionStore();

        store.setAbilities({ tenant: [], platform: [], grantableRoles: ['customer'] });
        expect(store.grantableRoles).toEqual(['customer']);

        store.setAbilities();
        expect(store.grantableRoles).toEqual([]);
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
        let resolveRefresh!: (value: { token: string }) => void;
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
                resolveRefresh({ token: 'renewed' });
                return refreshing;
            })
            .then(() => logoutOutcome)
            .then(() => {
                expect(logoutMock).toHaveBeenCalledOnce();
            });
    });
});

describe('secondFactorRequired', () => {
    it('keeps what the abilities answer said, and empties with the rest', () => {
        const store = useSessionStore();

        store.setAbilities({ tenant: [], platform: [], secondFactorRequired: true });
        expect(store.secondFactorRequired).toBe(true);

        store.setAbilities();
        expect(store.secondFactorRequired).toBe(false);
    });

    it('is re-read after a 403 on a signed-in request, which is how a refusal reaches the banner', async () => {
        const answer = viewOf([]);
        answer.abilities.secondFactorRequired = true;
        getAccountMock.mockResolvedValue(answer);
        const store = signedIn();

        await store.reloadAbilities();

        expect(store.secondFactorRequired).toBe(true);
    });
});

describe('reloadAbilities', () => {
    it('replaces the rules and bumps the signal, so a taken-away right disappears', () => {
        getAccountMock.mockResolvedValue(viewOf([['delete', 'Product']]));
        const store = signedIn();

        return store
            .reloadAbilities()
            .then(() => {
                expect(store.can('delete', 'Product')).toBe(true);
                getAccountMock.mockResolvedValue(viewOf([]));
                return store.reloadAbilities();
            })
            .then(() => {
                expect(store.can('delete', 'Product')).toBe(false);
                expect(store.abilitiesSignal).toBe(2);
            });
    });

    it('keeps the rules it has when the read fails', () => {
        getAccountMock.mockResolvedValue(viewOf([['delete', 'Product']]));
        const store = signedIn();

        return store
            .reloadAbilities()
            .then(() => {
                getAccountMock.mockRejectedValue(new Error('offline'));
                return store.reloadAbilities();
            })
            .then(() => {
                expect(store.can('delete', 'Product')).toBe(true);
                expect(store.abilitiesSignal).toBe(1);
            });
    });

    it('is sent passive: re-reading the rules is not the person acting', () => {
        const store = signedIn();

        return store.reloadAbilities().then(() => {
            expect(getAccountMock).toHaveBeenCalledWith({
                headers: { 'Session-Passive': 'true' }
            });
        });
    });

    it('shares one read between callers arriving together, and asks nothing for a guest', () => {
        const guest = useSessionStore();
        return guest
            .reloadAbilities()
            .then(() => {
                expect(getAccountMock).not.toHaveBeenCalled();
                const store = signedIn();
                getAccountMock.mockClear();
                return Promise.all([store.reloadAbilities(), store.reloadAbilities()]);
            })
            .then(() => {
                expect(getAccountMock).toHaveBeenCalledOnce();
            });
    });

    it('is not run after a token refresh: the refresh answer carries the abilities', () => {
        refreshTokenMock.mockResolvedValue({ token: 'renewed', abilities: viewOf([]).abilities });
        const store = signedIn();

        return store.refreshToken().then(() => {
            expect(getAccountMock).not.toHaveBeenCalled();
        });
    });

    it('takes the abilities a refresh answered with, and bumps the signal', () => {
        refreshTokenMock.mockResolvedValue({
            token: 'renewed',
            abilities: viewOf([['delete', 'Product']]).abilities
        });
        const store = signedIn();

        return store.refreshToken().then(() => {
            expect(store.can('delete', 'Product')).toBe(true);
            expect(store.abilitiesSignal).toBe(1);
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
    it('is marked passive: a refresh is not the person acting', () => {
        refreshTokenMock.mockResolvedValue({ token: 'fresh', abilities: viewOf([]).abilities });
        const marked = { headers: { 'Session-Passive': 'true' } };
        const store = signedIn();

        return store
            .refreshToken()
            .then(() =>
                expect(refreshTokenMock).toHaveBeenCalledWith({ _refreshed: true, ...marked })
            );
    });

    it('stores the fresh token on success', () => {
        refreshTokenMock.mockResolvedValue({ token: 'fresh' });
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

    it('reads the API envelope a real rejection arrives as, not only a raw axios error', () => {
        refreshTokenMock.mockRejectedValue(
            aProblem(401, [{ code: 'UNAUTHORIZED', message: 'Unauthorized' }])
        );
        const store = signedIn();

        return store.refreshToken().then(() => {
            expect(store.isAuth).toBe(false);
            expect(store.expiredSignal).toBe(1);
        });
    });

    it('does not end the session on an envelope that is a 5xx', () => {
        refreshTokenMock.mockRejectedValue(aProblem(503, []));
        const store = signedIn();

        return store.refreshToken().then(() => {
            expect(store.expiredSignal).toBe(0);
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
        refreshTokenMock.mockResolvedValue({ token: 'fresh' });
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
        let resolveRefresh!: (value: { token: string }) => void;
        refreshTokenMock.mockReturnValue(
            new Promise((resolve) => {
                resolveRefresh = resolve;
            })
        );
        const store = signedIn();
        const refreshing = store.refreshToken();

        store.clearSession();
        resolveRefresh({ token: 'too-late' });

        return refreshing.then(() => {
            expect(store.accessToken).toBeUndefined();
        });
    });
});

/**
 * The two session modes. In `jwt` the access token is the session; in `cookie` the credential is
 * an HttpOnly cookie no script reads, so the store keeps only the fact that one was granted. Every
 * door that adopts a login-shaped response must work in both without its caller asking which.
 */
/** Answers `GET /account/session-config` with the given mode. */
const answerMode = (mode: 'jwt' | 'cookie') =>
    getSessionConfigMock.mockResolvedValue({
        mode,
        lifetimeSeconds: { short: 86_400, medium: 604_800, long: 2_592_000 }
    });

describe('session modes', () => {
    beforeEach(() => {
        useSessionStore().clearSession();
    });

    describe('loadSessionMode', () => {
        it('reads the deployment mode once, however many callers ask', () => {
            answerMode('cookie');
            const store = useSessionStore();

            return Promise.all([store.loadSessionMode(), store.loadSessionMode()]).then(() => {
                expect(store.mode).toBe('cookie');
                expect(getSessionConfigMock).toHaveBeenCalledOnce();
            });
        });

        it('stays undefined, behaving as jwt, when the read fails, and retries next time', () => {
            getSessionConfigMock.mockRejectedValueOnce(new Error('offline'));
            const store = useSessionStore();

            return store
                .loadSessionMode()
                .then(() => {
                    expect(store.mode).toBeUndefined();
                    answerMode('cookie');
                    return store.loadSessionMode();
                })
                .then(() => {
                    expect(store.mode).toBe('cookie');
                });
        });
    });

    describe('in cookie mode', () => {
        beforeEach(() => {
            answerMode('cookie');
            return useSessionStore().loadSessionMode();
        });

        it('adopts a login that carries no token as a held session', () => {
            const store = useSessionStore();

            store.adoptSession({}, true);

            expect(store.hasSession).toBe(true);
            expect(store.accessToken).toBeUndefined();
            expect(cookieJar().isAuth).toBeUndefined();
            expect(cookieJar().rememberMe).toBe('true');
        });

        it('is signed in only once the viewer is known too', () => {
            const store = useSessionStore();
            store.adoptSession({});
            expect(store.isAuth).toBe(false);

            store.setViewer({ id: '1', email: 'a@b.c', role: 'customer' });

            expect(store.isAuth).toBe(true);
        });

        it('never asks the server to refresh: there is nothing to renew', () => {
            return useSessionStore()
                .refreshToken()
                .then((token) => {
                    expect(token).toBeUndefined();
                    expect(refreshTokenMock).not.toHaveBeenCalled();
                });
        });

        it('restores from the cookies without a request, leaving the next call to prove them', () => {
            const store = useSessionStore();

            return store.restoreFromCookies().then(() => {
                expect(store.hasSession).toBe(true);
                expect(refreshTokenMock).not.toHaveBeenCalled();
            });
        });

        it('clearSession drops the held session and its hint cookie', () => {
            const store = useSessionStore();
            store.adoptSession({}, false);

            store.clearSession();

            expect(store.hasSession).toBe(false);
            expect(cookieJar().isAuth).toBeUndefined();
        });

        it('adopts a re-proof the same way, keeping the remember-me marker login left', () => {
            const store = useSessionStore();
            store.adoptSession({}, true);

            store.adoptSession({});

            expect(cookieJar().rememberMe).toBe('true');
            expect(store.hasSession).toBe(true);
        });
    });

    describe('in jwt mode', () => {
        beforeEach(() => {
            answerMode('jwt');
            return useSessionStore().loadSessionMode();
        });

        it('adopts the access token the login returned', () => {
            const store = useSessionStore();

            store.adoptSession({ token: 'jwt-1' });

            expect(store.accessToken).toBe('jwt-1');
            expect(store.hasSession).toBe(true);
        });

        it('holds no session when the response carries no token', () => {
            const store = useSessionStore();

            store.adoptSession({});

            expect(store.hasSession).toBe(false);
        });

        it('restores through a refresh', () => {
            refreshTokenMock.mockResolvedValue({ token: 'fresh' });
            const store = useSessionStore();

            return store.restoreFromCookies().then(() => {
                expect(refreshTokenMock).toHaveBeenCalledOnce();
                expect(store.accessToken).toBe('fresh');
            });
        });
    });
});

/** The other person's account id: a valid object id, as the contract requires. */
const SECOND_PERSON = '65e1a0000000000000000e99';

describe('a sign-in in another tab', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('is broadcast by a login, and by nothing that keeps the same person', () => {
        const postMessage = vi.spyOn(BroadcastChannel.prototype, 'postMessage');
        const store = useSessionStore();
        store.mode = 'jwt';

        store.adoptSession({ token: 'one' });
        expect(postMessage).not.toHaveBeenCalledWith({ type: 'login' });

        store.adoptSession({ token: 'two' }, false);
        expect(postMessage).toHaveBeenCalledWith({ type: 'login' });
    });

    it('replaces the person this tab was acting as', () => {
        getSessionConfigMock.mockResolvedValue({
            mode: 'jwt',
            lifetimeSeconds: { short: 86_400, medium: 604_800, long: 2_592_000 }
        });
        refreshTokenMock.mockResolvedValue({ token: 'second-persons' });
        getAccountMock.mockResolvedValue(viewOf([], { id: SECOND_PERSON, role: 'customer' }));
        const store = signedIn();
        const channel = new BroadcastChannel('session');

        channel.postMessage({ type: 'login' });

        return vi
            .waitFor(() => expect(store.viewer?.id).toBe(SECOND_PERSON))
            .finally(() => channel.close());
    });
});
