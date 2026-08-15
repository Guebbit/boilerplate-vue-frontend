/**
 * `tryRestoreAuth` — the guard that turns a refresh cookie back into a session.
 *
 * It runs on EVERY navigation, before `enforceRouteAccess` reads `isAuth`, which makes it the one
 * place a returning visitor's identity comes from. Its whole contract is "always resolve, never
 * redirect": a rejection here is a navigation the router aborts, leaving the visitor on a blank
 * page with no error — so each failure path below asserts a resolved promise, not a caught one.
 *
 * Separate from `authentications.spec.ts` because that file mocks `useSessionStore` down to `{}`
 * and drives the store through `storeToRefs`, which is right for `enforceRouteAccess` — a pure
 * function of two booleans — and useless here. This function is about the ORDER of two calls into
 * the store and about which of them is skipped, so the store is a double that records both.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sessionStore = {
    accessToken: undefined as string | undefined,
    refreshToken: vi.fn(),
    loadViewer: vi.fn()
};

const getCookieMock = vi.fn();

vi.mock('@/infrastructure/session', () => ({ useSessionStore: () => sessionStore }));
vi.mock('@guebbit/js-toolkit', () => ({ getCookie: (name: string) => getCookieMock(name) }));
vi.mock('@guebbit/vue-toolkit', () => ({ useNotificationsStore: () => ({ addMessage: vi.fn() }) }));
vi.mock('pinia', () => ({
    storeToRefs: () => ({ isAuth: { value: false }, isAdmin: { value: false } })
}));
vi.mock('@/infrastructure/i18n.ts', () => ({ translate: (key: string) => key }));

import { tryRestoreAuth } from '@/app/middlewares/authentications';

beforeEach(() => {
    vi.clearAllMocks();
    sessionStore.accessToken = undefined;
    // The realistic default: a successful refresh is what puts the token in place, so the second
    // half of the function sees a state the first half created.
    sessionStore.refreshToken.mockImplementation(() => {
        sessionStore.accessToken = 'restored-token';
        return Promise.resolve();
    });
    sessionStore.loadViewer.mockResolvedValue({ id: 'u1' });
});

describe('a guest with no isAuth cookie', () => {
    beforeEach(() => getCookieMock.mockReturnValue(undefined));

    it('resolves without touching the network', () =>
        tryRestoreAuth().then(() => {
            // The reason the cookie is checked at all: every anonymous page view would otherwise
            // pay for a refresh round-trip that cannot succeed.
            expect(sessionStore.refreshToken).not.toHaveBeenCalled();
            expect(sessionStore.loadViewer).not.toHaveBeenCalled();
        }));
});

describe('a returning visitor holding the isAuth cookie', () => {
    beforeEach(() => getCookieMock.mockReturnValue('true'));

    it('refreshes the token, then loads who it belongs to', () =>
        tryRestoreAuth().then(() => {
            expect(sessionStore.refreshToken).toHaveBeenCalledTimes(1);
            expect(sessionStore.loadViewer).toHaveBeenCalledTimes(1);
        }));

    it('reads the cookie by name', () =>
        tryRestoreAuth().then(() => {
            expect(getCookieMock).toHaveBeenCalledWith('isAuth');
        }));

    it('does not load a viewer when the refresh left no token', () => {
        // An expired refresh cookie: the endpoint answers, but with nothing to store. Asking for
        // the viewer anyway is an anonymous request that 401s on every navigation.
        sessionStore.refreshToken.mockResolvedValue(undefined);

        return tryRestoreAuth().then(() => {
            expect(sessionStore.loadViewer).not.toHaveBeenCalled();
        });
    });

    it('resolves rather than rejecting when the refresh fails', () => {
        sessionStore.refreshToken.mockRejectedValue(new Error('401'));

        // Resolving is the assertion. A rejection aborts the navigation, so a failed refresh would
        // strand the visitor instead of showing them the page as a guest.
        return expect(tryRestoreAuth()).resolves.toBeUndefined();
    });

    it('resolves rather than rejecting when the viewer cannot be loaded', () => {
        sessionStore.loadViewer.mockRejectedValue(new Error('500'));

        return expect(tryRestoreAuth()).resolves.toBeUndefined();
    });
});

describe('a visitor whose token is already in memory', () => {
    beforeEach(() => getCookieMock.mockReturnValue('true'));

    it('skips the refresh but still loads the viewer', () => {
        sessionStore.accessToken = 'already-here';

        return tryRestoreAuth().then(() => {
            // Two separate facts: holding a token is not the same as knowing whose it is, so the
            // second call must happen even though the first is skipped.
            expect(sessionStore.refreshToken).not.toHaveBeenCalled();
            expect(sessionStore.loadViewer).toHaveBeenCalledTimes(1);
        });
    });
});

describe('the value handed back to the router', () => {
    it('is undefined, which is vue-router for "proceed"', () => {
        getCookieMock.mockReturnValue('true');

        // `loadViewer` resolves a user record; leaking it through would be read as a redirect
        // target by the guard chain.
        return expect(tryRestoreAuth()).resolves.toBeUndefined();
    });
});
