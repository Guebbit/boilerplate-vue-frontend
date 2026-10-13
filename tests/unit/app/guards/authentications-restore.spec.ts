/**
 * `tryRestoreAuth` — the guard that turns the session cookies back into a session, in either mode.
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
import type { getCookie } from '@guebbit/js-toolkit';

/**
 * The mocked session store: whether a session is held, the viewer, and the three actions the
 * guard calls. Which mode the deployment runs is the store's business, not the guard's, so the
 * double has no mode at all.
 */
const sessionStore = {
    hasSession: false,
    viewer: undefined as { id: string } | undefined,
    loadSessionMode: vi.fn(),
    restoreFromCookies: vi.fn(),
    loadViewer: vi.fn()
};

// Typed against the real `getCookie` so the mock factory below returns a properly-typed value
// instead of `vi.fn()`'s untyped default.
const getCookieMock = vi.fn<typeof getCookie>();

vi.mock('@/infrastructure/session', () => ({ useSessionStore: () => sessionStore }));
vi.mock('@guebbit/js-toolkit', () => ({ getCookie: (name: string) => getCookieMock(name) }));
vi.mock('@guebbit/vue-toolkit', () => ({ useNotificationsStore: () => ({ addMessage: vi.fn() }) }));
vi.mock('pinia', () => ({
    storeToRefs: () => ({ isAuth: { value: false } })
}));
vi.mock('@/i18n', () => ({ translate: (key: string) => key }));

import { tryRestoreAuth } from '@/app/guards/authentications';

beforeEach(() => {
    vi.clearAllMocks();
    sessionStore.hasSession = false;
    sessionStore.viewer = undefined;
    sessionStore.loadSessionMode.mockResolvedValue(undefined);
    // The realistic default: a successful restore is what puts the session in place, so the second
    // half of the function sees a state the first half created.
    sessionStore.restoreFromCookies.mockImplementation(() => {
        sessionStore.hasSession = true;
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
            expect(sessionStore.restoreFromCookies).not.toHaveBeenCalled();
            expect(sessionStore.loadViewer).not.toHaveBeenCalled();
        }));
});

describe('a returning visitor holding the isAuth cookie', () => {
    beforeEach(() => getCookieMock.mockReturnValue('true'));

    it('reads the session mode first, then restores, then loads who it belongs to', () =>
        tryRestoreAuth().then(() => {
            // Restoring differs by mode (a refresh vs nothing to ask), so the mode must be known.
            expect(sessionStore.loadSessionMode.mock.invocationCallOrder[0]).toBeLessThan(
                sessionStore.restoreFromCookies.mock.invocationCallOrder[0]
            );
            expect(sessionStore.restoreFromCookies).toHaveBeenCalledTimes(1);
            expect(sessionStore.loadViewer).toHaveBeenCalledTimes(1);
        }));

    it('reads the cookie by name', () =>
        tryRestoreAuth().then(() => {
            expect(getCookieMock).toHaveBeenCalledWith('isAuth');
        }));

    it('does not load a viewer when the restore left no session', () => {
        // An expired refresh cookie: the endpoint answers, but with nothing to store. Asking for
        // the viewer anyway is an anonymous request that 401s on every navigation.
        sessionStore.restoreFromCookies.mockResolvedValue(undefined);

        return tryRestoreAuth().then(() => {
            expect(sessionStore.loadViewer).not.toHaveBeenCalled();
        });
    });

    it('resolves rather than rejecting when the mode cannot be read', () => {
        sessionStore.loadSessionMode.mockRejectedValue(new Error('500'));

        return expect(tryRestoreAuth()).resolves.toBeUndefined();
    });

    it('resolves rather than rejecting when the restore fails', () => {
        sessionStore.restoreFromCookies.mockRejectedValue(new Error('401'));

        // Resolving is the assertion. A rejection aborts the navigation, so a failed refresh would
        // strand the visitor instead of showing them the page as a guest.
        return expect(tryRestoreAuth()).resolves.toBeUndefined();
    });

    it('resolves rather than rejecting when the viewer cannot be loaded', () => {
        sessionStore.loadViewer.mockRejectedValue(new Error('500'));

        return expect(tryRestoreAuth()).resolves.toBeUndefined();
    });
});

describe('a visitor whose session is already held', () => {
    beforeEach(() => getCookieMock.mockReturnValue('true'));

    it('skips the refresh but still loads the viewer, when it is not known yet', () => {
        sessionStore.hasSession = true;

        return tryRestoreAuth().then(() => {
            // Two separate facts: holding a session is not the same as knowing whose it is, so the
            // second call must happen even though the first is skipped.
            expect(sessionStore.restoreFromCookies).not.toHaveBeenCalled();
            expect(sessionStore.loadViewer).toHaveBeenCalledTimes(1);
        });
    });

    /**
     * this guard runs on EVERY navigation. Before this fix it re-fetched the viewer (and the
     * two round trips `loadViewer` chains into) on every single one of them, not just the first.
     */
    it('does not reload an already-known viewer on a later navigation', () => {
        sessionStore.hasSession = true;
        sessionStore.viewer = { id: 'u1' };

        return tryRestoreAuth().then(() => {
            expect(sessionStore.loadViewer).not.toHaveBeenCalled();
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
