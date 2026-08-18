/**
 * `persistLocalePreference` — `src/infrastructure/stores/session.ts`.
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

vi.mock('@api', () => ({
    getAccount: vi.fn(),
    refreshToken: vi.fn(),
    logout: vi.fn(),
    logoutAll: vi.fn(),
    updateAccount: (body: { locale: string }) => updateAccountMock(body)
}));

const { useSessionStore } = await import('@/infrastructure/stores/session.ts');

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
