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

const updateAccountMock = vi.fn();
const getAccountMock = vi.fn();
const getMyAbilitiesMock = vi.fn();

vi.mock('@api', () => ({
    getAccount: () => getAccountMock(),
    getMyAbilities: () => getMyAbilitiesMock(),
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
    void store.setViewer({ id: '1', email: 'a@b.c', role: 'customer' });
    return store;
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    updateAccountMock.mockResolvedValue({ data: {} });
    getMyAbilitiesMock.mockResolvedValue({ data: { platform: [], tenant: [], version: 1 } });
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
     * call is not made at all — an anonymous `PUT /account` would answer 401 and teach nobody
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
        getAccountMock.mockResolvedValue({
            data: {
                id: '1',
                email: 'a@b.c',
                role: 'customer',
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
            data: { id: '1', email: 'a@b.c', role: 'customer', imageUrl: '/images/abc.png' }
        });
        const store = useSessionStore();

        return store.loadViewer().then(() => {
            expect(store.viewer?.thumbnailUrl).toBeUndefined();
        });
    });

    /*
     * The reload case, and the reason the fetch sits beside `setViewer` rather than in the account
     * store: a page load restores the session through this path alone, and a viewer whose rules
     * never arrived is a screen that hides every control its visitor is entitled to.
     */
    it('loads the rules that go with the viewer, not just the projection', () => {
        getAccountMock.mockResolvedValue({
            data: { id: '1', email: 'a@b.c', role: 'owner' }
        });
        getMyAbilitiesMock.mockResolvedValue({
            data: { platform: [], tenant: [['delete', 'Product']], version: 1 }
        });
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
     * `declaredSubjects` is what lets a typo in a route's `meta.can` be caught rather than just
     * quietly matching no rule — see `can`'s own docblock for why it warns instead of throwing.
     */
    it('carries the published subject set alongside the rules', () => {
        getAccountMock.mockResolvedValue({ data: { id: '1', email: 'a@b.c', role: 'owner' } });
        getMyAbilitiesMock.mockResolvedValue({
            data: { platform: [], tenant: [], version: 1, subjects: ['Order', 'Product'] }
        });
        const store = useSessionStore();
        store.setAccessToken('token');

        return store.loadViewer().then(() => {
            expect(store.declaredSubjects).toEqual(new Set(['Order', 'Product']));
        });
    });

    /** A response that omits `subjects` altogether must not wipe out a set already known. */
    it('leaves a previously published subject set alone when a response omits it', () => {
        getAccountMock.mockResolvedValue({ data: { id: '1', email: 'a@b.c', role: 'owner' } });
        const store = useSessionStore();
        store.setAbilities({ tenant: [], platform: [], subjects: ['Order'] });

        store.setAbilities({ tenant: [['read', 'Order']], platform: [] });

        expect(store.declaredSubjects).toEqual(new Set(['Order']));
    });
});
