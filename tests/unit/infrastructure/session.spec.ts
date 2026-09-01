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
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const updateAccountMock = vi.fn();
const getAccountMock = vi.fn();

vi.mock('@api', () => ({
    getAccount: () => getAccountMock(),
    refreshToken: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    updateAccount: (body: { locale: string }) => updateAccountMock(body)
}));

const { useSessionStore } = await import('@/infrastructure/session.ts');

/** A store with a token AND a viewer, which is what `isAuth` actually requires. */
const signedIn = () => {
    const store = useSessionStore();
    store.setAccessToken('token');
    store.setViewer({ id: '1', email: 'a@b.c', admin: false });
    return store;
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    updateAccountMock.mockResolvedValue({ data: {} });
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
     * The rule that used to live at the call site. A guest has no record to write to, so the call
     * is not made at all — an anonymous `PUT /account` would answer 401 and teach nobody anything.
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
});

describe('loadViewer', () => {
    /**
     * `thumbnailUrl` rides alongside `imageUrl` on the account payload — the shell's avatar is the
     * one place outside `account` itself that reads either, so a projection that dropped it would
     * silently fall back to loading the full image for every navigation-bar avatar.
     */
    it('carries thumbnailUrl into the viewer projection', () => {
        getAccountMock.mockResolvedValue({
            data: {
                id: '1',
                email: 'a@b.c',
                admin: false,
                imageUrl: '/images/abc.png',
                thumbnailUrl: '/images/thumbs/v1/abc.webp'
            }
        });
        const store = useSessionStore();

        return store.loadViewer().then(() => {
            expect(store.viewer?.imageUrl).toBe('/images/abc.png');
            expect(store.viewer?.thumbnailUrl).toBe('/images/thumbs/v1/abc.webp');
        });
    });

    it('leaves thumbnailUrl undefined for an account with none', () => {
        getAccountMock.mockResolvedValue({
            data: { id: '1', email: 'a@b.c', admin: false, imageUrl: '/images/abc.png' }
        });
        const store = useSessionStore();

        return store.loadViewer().then(() => {
            expect(store.viewer?.thumbnailUrl).toBeUndefined();
        });
    });
});
