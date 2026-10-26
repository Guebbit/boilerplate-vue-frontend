/**
 * `persistLocalePreference` — `src/infrastructure/locale-preference.ts`.
 *
 * The write that is not about the session itself, and the reason `AppLanguageSwitcher` does not
 * know what a session is. Every case below is the same claim from a different side: **choosing a
 * language always succeeds, whatever the account endpoint does.**
 *
 * The session store is real — `isAuth` derives from token AND viewer, and stubbing it would test
 * the stub. Only `@api` is mocked, at the network boundary.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import * as schemas from '@api/schemas';
import { contractResponse } from './http/orval-fixture-schema.ts';
import { anAccount } from '../../support/unit/fixtures.ts';

// Deliberately untyped: the mock returns case-by-case fixture shapes the generated types refuse.
const updateAccountMock = vi.fn();

vi.mock('@api', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- deliberately untyped vi.fn(), see above
    updateAccount: (body: { locale: string }) => updateAccountMock(body),
    // `setViewer` loads the abilities; an empty set is enough to sign the viewer in.
    getMyAbilities: () =>
        Promise.resolve(
            contractResponse(schemas.GetMyAbilitiesResponse, {
                platform: [],
                tenant: [],
                version: 1,
                subjects: [],
                grantableRoles: [],
                secondFactorRequired: false
            })
        ),
    // The idle clock is read once per signed-in stretch; the answer names no timeout.
    touchSession: () => Promise.resolve({ lastActiveAt: new Date().toISOString() })
}));

/** The code under test, imported after the mocks are in place. */
const { persistLocalePreference } = await import('@/infrastructure/locale-preference.ts');

/** The session store, imported after the mocks are in place. */
const { useSessionStore } = await import('@/infrastructure/session.ts');

/** A store with a token AND a viewer, which is what `isAuth` actually requires. */
const signedIn = () => {
    const store = useSessionStore();
    store.setAccessToken('token');
    // eslint-disable-next-line @typescript-eslint/no-floating-promises -- setViewer never rejects (both its reads swallow their failure)
    void store.setViewer({ id: '1', email: 'a@b.c', role: 'customer' });
    return store;
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    updateAccountMock.mockResolvedValue(
        contractResponse(schemas.UpdateAccountResponse, anAccount())
    );
});

describe('persistLocalePreference', () => {
    it('writes the choice onto a signed-in visitor’s account', () => {
        signedIn();
        return persistLocalePreference('it').then(() => {
            expect(updateAccountMock).toHaveBeenCalledWith({ locale: 'it' });
        });
    });

    /*
     * The rule belongs to the preference, not to the button: a guest has no record to write to, so
     * the call is not made at all — an anonymous `PATCH /account` would answer 401.
     */
    it('does not call the API for a guest', () => {
        return persistLocalePreference('it').then(() => {
            expect(updateAccountMock).not.toHaveBeenCalled();
        });
    });

    /* A token with no viewer is a session restored but not yet identified — not signed in. */
    it('does not call the API for a token whose holder is still unknown', () => {
        useSessionStore().setAccessToken('token');
        return persistLocalePreference('it').then(() => {
            expect(updateAccountMock).not.toHaveBeenCalled();
        });
    });

    it('resolves rather than rejecting when the write fails', () => {
        updateAccountMock.mockRejectedValue(new Error('account service down'));
        signedIn();
        return expect(persistLocalePreference('it')).resolves.toBeUndefined();
    });

    /*
     * The switcher fires this without awaiting it, so a rejection that escaped would surface as an
     * unhandled rejection on a page that switched language perfectly well.
     */
    it('resolves with nothing on the happy path too, so the caller can ignore it', () => {
        signedIn();
        return expect(persistLocalePreference('en')).resolves.toBeUndefined();
    });
});
