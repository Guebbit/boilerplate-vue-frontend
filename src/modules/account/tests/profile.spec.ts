/**
 * @module
 * Unit tests for the profile store's flows: fetch/update the record, the role-view widget, the
 * live password change, email verification, and account deletion. Mocks only the transport and
 * keys answers by request URL, so every layer above it — the generated client, `session.ts`, the
 * observability store, `useStructureRestApi` — runs for real.
 *
 * A few cases need a session established first (`updateOwnRole`'s refetch, deletion's "must not
 * touch the session yet"), so those log in through the real `useAuthStore().login` first, exactly
 * like a real caller would.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useProfileStore } from '@/modules/account/stores/profile.ts';
import { useAuthStore } from '@/modules/account/stores/auth.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { orvalMutator } from '@/infrastructure/http';

/**
 * A representative user record, used across the fetch/update/role assertions below.
 */
const USER = { id: 'u1', username: 'ada', email: 'ada@example.com', admin: false };

/**
 * Responses per endpoint, rebuilt for each test so one case cannot leak into the next.
 *
 * Keyed by `METHOD /path` and consulted by the mock below. A test that needs a different answer
 * overwrites one entry rather than re-mocking the module, which keeps the default shape — the one
 * every other test relies on — in exactly one place.
 */
let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        return Promise.resolve(responses[key]);
    })
}));

/**
 * Every request URL handed to the transport, in order.
 */
const requestedUrls = () =>
    vi.mocked(orvalMutator).mock.calls.map((call) => (call[0] as { url: string }).url);

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        // Wrapped under `data`, as `LoginResponseEnvelope` declares — the tolerant top-level
        // read in `getTokenFromResponse` exists for robustness, not as a shape to test against.
        'POST /account/login': { data: { token: 'jwt-token' } },
        'GET /account': { data: USER },
        'DELETE /account': { data: undefined },
        'DELETE /account/delete-confirm': { data: undefined },
        'PUT /account': { data: { ...USER, username: 'ada2' } },
        // The envelope the real endpoint answers: a fresh access token for this session.
        'POST /account/password': { data: { token: 'rotated-jwt' } },
        'POST /account/verify-request': { data: undefined },
        'POST /account/verify-confirm': { data: undefined }
    };
});

describe('fetchProfile', () => {
    it('selects the identifier the profile updates address', () =>
        useProfileStore()
            .fetchProfile(true)
            .then(() => {
                // `updateProfile` rejects without this, so a fetch that loads the record but does
                // not select it leaves the store readable and unwritable.
                expect(useProfileStore().profile).toMatchObject({ id: 'u1' });
            }));

    it('publishes the viewer without a login having happened', () =>
        // The restore path: a returning visitor holds a refresh cookie, so `tryRestoreAuth` calls
        // this directly and the guards depend on it filling the projection.
        useProfileStore()
            .fetchProfile(true)
            .then(() => {
                expect(useSessionStore().viewer).toMatchObject({ id: 'u1' });
            }));

    it('leaves the viewer alone when the response carries no payload', () => {
        responses['GET /account'] = { data: undefined };

        return useProfileStore()
            .fetchProfile(true)
            .then(() => {
                expect(useSessionStore().viewer).toBeUndefined();
                expect(useSessionStore().isAuth).toBe(false);
            });
    });
});

describe('updateProfile', () => {
    it('rejects when no profile has been loaded', () =>
        // Not a thrown error: the caller is a form submit handler, and an unhandled rejection here
        // would surface as a silent no-op on the button.
        expect(useProfileStore().updateProfile({ username: 'ada2' })).rejects.toThrow(
            'invalid user'
        ));

    it('sends only the fields a user owns, to the self-service endpoint', () => {
        const store = useProfileStore();

        return store
            .fetchProfile(true)
            .then(() => store.updateProfile({ username: 'ada2', admin: true }))
            .then(() => {
                // The write, not the refetch that follows it — `updateProfile` re-reads the
                // record afterwards, so the LAST call is a GET.
                const last = vi
                    .mocked(orvalMutator)
                    .mock.calls.map(
                        (call) =>
                            call[0] as {
                                url: string;
                                method: string;
                                data: Record<string, unknown>;
                            }
                    )
                    .find(({ method }) => method?.toUpperCase() === 'PUT')!;

                // PUT /account, never the admin write: routing self-service through
                // `/users/{id}` answers 403 for anyone who is not an admin — every visitor
                // editing their own record.
                expect(last.url).toBe('/account');
                // `admin` was passed in and must NOT reach the wire: a user editing their own
                // record cannot promote themselves, and the store is the only thing enforcing it.
                expect(Object.keys(last.data).toSorted()).toEqual(
                    ['email', 'username', 'locale', 'imageUrl', 'phone', 'website'].toSorted()
                );
                expect(last.data.username).toBe('ada2');
            });
    });
});

describe('locale preference', () => {
    it('persists the chosen language through PUT /account', () => {
        const store = useProfileStore();

        return store
            .fetchProfile(true)
            .then(() => store.updateProfile({ locale: 'it' }))
            .then(() => {
                const put = vi
                    .mocked(orvalMutator)
                    .mock.calls.map(
                        (call) =>
                            call[0] as { method?: string; url: string; data?: { locale?: string } }
                    )
                    .find(
                        (call) => call.method?.toUpperCase() === 'PUT' && call.url === '/account'
                    );
                // The record carries the language, so the next login can re-apply it.
                expect(put?.data?.locale).toBe('it');
            });
    });
});

/**
 * The role change is the one profile edit that does NOT go to `PUT /account`, and that is the
 * whole point of it: the self-service payload carries no role, so a role change has to be made
 * where the API can authorise it. These pin the endpoint and the projection, because getting
 * either wrong is silent — the form would look like it worked.
 */
describe('own role', () => {
    it('goes to the admin users endpoint, never to the self-service one', () => {
        const store = useProfileStore();

        return store
            .fetchProfile(true)
            .then(() => store.updateOwnRole(true))
            .then(() => {
                const put = vi
                    .mocked(orvalMutator)
                    .mock.calls.map(
                        (call) =>
                            call[0] as {
                                method?: string;
                                url: string;
                                data?: { admin?: boolean };
                            }
                    )
                    .find((call) => call.method?.toUpperCase() === 'PUT');

                // `PUT /account` is deliberately roleless; `/users/{id}` is behind the admin
                // guard, so the API decides whether this visitor may promote anyone.
                expect(put?.url).toBe('/users/u1');
                expect(put?.data).toEqual({ admin: true });
            });
    });

    it('refetches the record, so the shell learns the role from the server', () => {
        const profile = useProfileStore();

        return useAuthStore()
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => {
                expect(useSessionStore().isAdmin).toBe(false);
                // What the server holds AFTER the write. The projection must follow this, not the
                // value the form happened to send.
                responses['GET /account'] = { data: { ...USER, admin: true } };
                return profile.updateOwnRole(true);
            })
            .then(() => {
                expect(requestedUrls().at(-1)).toBe('/account');
                expect(useSessionStore().isAdmin).toBe(true);
            });
    });

    it('refuses when no profile is loaded, rather than writing to `/users/undefined`', () =>
        expect(useProfileStore().updateOwnRole(true)).rejects.toThrow('invalid user'));
});

describe('the account deletion flow', () => {
    it('requests deletion without touching the session', () => {
        const profile = useProfileStore();

        return useAuthStore()
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => profile.requestAccountDelete())
            .then(() => {
                // Only a token has been emailed at this point. Signing the visitor out here would
                // strand them holding a confirmation link they can no longer use.
                expect(requestedUrls().at(-1)).toBe('/account');
                expect(useSessionStore().isAuth).toBe(true);
            });
    });

    it('clears the session once deletion is confirmed', () => {
        const profile = useProfileStore();

        return useAuthStore()
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => profile.confirmAccountDelete('delete-token'))
            .then(() => {
                const session = useSessionStore();

                expect(requestedUrls().at(-1)).toBe('/account/delete-confirm');
                expect(session.accessToken).toBeUndefined();
                expect(session.isAuth).toBe(false);
                expect(profile.profile).toBeUndefined();
            });
    });
});

describe('the self-service actions', () => {
    it('changePassword sends all three fields and adopts the rotated access token', () =>
        useProfileStore()
            .changePassword('old-secret', 'new-secret', 'new-secret')
            .then(() => {
                const last = vi.mocked(orvalMutator).mock.calls.at(-1)![0] as {
                    url: string;
                    data: Record<string, unknown>;
                };
                expect(last.url).toBe('/account/password');
                expect(Object.keys(last.data).toSorted()).toEqual(
                    ['currentPassword', 'password', 'passwordConfirm'].toSorted()
                );
                // The API revoked every other session and re-keyed this one; running on with the
                // old token is the regression this pins against.
                expect(useSessionStore().accessToken).toBe('rotated-jwt');
            }));

    it('confirmEmailVerification refetches the profile only for a live session', () => {
        const profile = useProfileStore();
        // Guest first: spend a token with no session — no profile call may follow.
        return profile
            .confirmEmailVerification('a-token')
            .then(() => {
                expect(requestedUrls()).toEqual(['/account/verify-confirm']);
            })
            .then(() => useAuthStore().login('ada@example.com', 'hunter2hunter2'))
            .then(() => profile.confirmEmailVerification('a-token'))
            .then(() => {
                // Authenticated: the freshly verified record is pulled back in.
                expect(requestedUrls().at(-1)).toBe('/account');
            });
    });

    it('requestEmailVerification asks for the re-send', () =>
        useProfileStore()
            .requestEmailVerification()
            .then(() => {
                expect(requestedUrls().at(-1)).toBe('/account/verify-request');
            }));
});
