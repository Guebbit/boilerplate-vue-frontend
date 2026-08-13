/**
 * The account store's session and profile flows — everything `store.spec.ts` does not cover.
 *
 * That file is about `signup` and the one branch worth pinning there: JSON vs. multipart. This one
 * is about the other twelve actions, which are the ones that move state — a token into the session,
 * a viewer projection into the shell, a cleared cache on the way out.
 *
 * ── What is mocked, and what deliberately is not ─────────────────────────────────────────────
 * Only the transport. `orvalMutator` is replaced with a router keyed on the request URL, so every
 * layer above it is the real one: the generated `@api` client, `session.ts`, the observability
 * store, and the `useStructureRestApi` composable that owns `selectedIdentifier` and the cache.
 *
 * That matters because most of these actions are COORDINATION rather than computation — `login`
 * does not transform anything, it puts a token somewhere and then asks for a profile. Mocking the
 * session store would leave nothing under test but the order of two calls into a double. Asserting
 * against the real session store asserts the thing the router guards actually read.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useAccountStore } from '@/modules/account/store.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { orvalMutator } from '@/infrastructure/http';

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
        // Unknown endpoint resolves to `undefined` rather than throwing: several actions ignore
        // their response body entirely, and forcing every one of them into the table above would
        // make the table a list of the endpoints called rather than of the answers that matter.
        return Promise.resolve(responses[key]);
    })
}));

/** Every request URL handed to the transport, in order. */
const requestedUrls = () =>
    vi.mocked(orvalMutator).mock.calls.map((call) => (call[0] as { url: string }).url);

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        'POST /account/login': { token: 'jwt-token' },
        'GET /account': { data: USER },
        'POST /account/reset': { data: undefined },
        'POST /account/reset-confirm': { data: undefined },
        'DELETE /account': { data: undefined },
        'DELETE /account/delete-confirm': { data: undefined },
        'POST /account/logout': { data: undefined },
        'POST /account/logout-all': { data: undefined },
        'PUT /account': { data: { ...USER, username: 'ada2' } }
    };
});

describe('login', () => {
    it('stores the token, then loads the profile with it', () =>
        useAccountStore()
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => {
                // Order is the assertion: a profile fetched before the token is attached is an
                // anonymous request, which answers 401 rather than the account.
                expect(requestedUrls()).toEqual(['/account/login', '/account']);
                expect(useSessionStore().accessToken).toBe('jwt-token');
            }));

    it('publishes the viewer the router guards read', () =>
        useAccountStore()
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => {
                const session = useSessionStore();

                // The projection, not the record: the shell is not allowed to know what a `User`
                // is, so anything beyond these three fields leaking in is a regression.
                expect(session.viewer).toEqual({
                    id: 'u1',
                    email: 'ada@example.com',
                    admin: false
                });
                expect(session.isAuth).toBe(true);
                expect(session.isAdmin).toBe(false);
            }));

    it('marks an admin as one, so the admin routes resolve', () => {
        responses['GET /account'] = { data: { ...USER, admin: true } };

        return useAccountStore()
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => {
                expect(useSessionStore().isAdmin).toBe(true);
            });
    });

    it('leaves the session anonymous when the response carries no token', () => {
        responses['POST /account/login'] = { data: {} };

        return useAccountStore()
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => {
                expect(useSessionStore().accessToken).toBeUndefined();
            });
    });
});

describe('fetchProfile', () => {
    it('selects the identifier the profile updates address', () =>
        useAccountStore()
            .fetchProfile(true)
            .then(() => {
                // `updateProfile` rejects without this, so a fetch that loads the record but does
                // not select it leaves the store readable and unwritable.
                expect(useAccountStore().profile).toMatchObject({ id: 'u1' });
            }));

    it('publishes the viewer without a login having happened', () =>
        // The restore path: a returning visitor holds a refresh cookie, so `tryRestoreAuth` calls
        // this directly and the guards depend on it filling the projection.
        useAccountStore()
            .fetchProfile(true)
            .then(() => {
                expect(useSessionStore().viewer).toMatchObject({ id: 'u1' });
            }));

    it('leaves the viewer alone when the response carries no payload', () => {
        responses['GET /account'] = { data: undefined };

        return useAccountStore()
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
        expect(useAccountStore().updateProfile({ username: 'ada2' })).rejects.toThrow(
            'invalid user'
        ));

    it('sends only the fields a user owns, to the self-service endpoint', () => {
        const store = useAccountStore();

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
                // `/users/{id}` is the 403 this store used to ship.
                expect(last.url).toBe('/account');
                // `admin` was passed in and must NOT reach the wire: a user editing their own
                // record cannot promote themselves, and the store is the only thing enforcing it.
                expect(Object.keys(last.data).toSorted()).toEqual(
                    ['email', 'username', 'locale', 'imageUrl'].toSorted()
                );
                expect(last.data.username).toBe('ada2');
            });
    });
});

describe('updateProfileLanguage', () => {
    it('switches the active locale and persists the record', () => {
        const store = useAccountStore();

        return store
            .fetchProfile(true)
            .then(() => store.updateProfileLanguage('it'))
            .then(() => {
                expect(store.profileLanguage).toBe('it');
                // The refetch lands last; the PUT that persisted the locale sits before it.
                expect(requestedUrls().at(-1)).toBe('/account');
            });
    });
});

describe('logout', () => {
    it('ends THIS session only and clears the state the guards read', () => {
        const store = useAccountStore();

        return store
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => store.logout())
            .then(() => {
                const session = useSessionStore();

                // The single-session endpoint: other devices stay signed in, which is what a
                // shared-machine logout should mean. `logoutEverywhere` is the wide one.
                expect(requestedUrls().at(-1)).toBe('/account/logout');
                // The whole point of the action: a stale `isAuth` would let the guards wave the
                // next navigation through with no token to back it.
                expect(session.accessToken).toBeUndefined();
                expect(session.viewer).toBeUndefined();
                expect(session.isAuth).toBe(false);
            });
    });

    it('drops the cached profile, so the next visitor is not served this one', () => {
        const store = useAccountStore();

        return store
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => store.logout())
            .then(() => {
                expect(store.profile).toBeUndefined();
            });
    });
});

describe('the password reset flow', () => {
    it('requests a token for an email', () =>
        useAccountStore()
            .requestPasswordReset('ada@example.com')
            .then(() => {
                expect(requestedUrls()).toEqual(['/account/reset']);
            }));

    it('confirms with the token and the new password', () =>
        useAccountStore()
            .confirmPasswordReset('reset-token', 'hunter3hunter3', 'hunter3hunter3')
            .then(() => {
                const last = vi.mocked(orvalMutator).mock.calls.at(-1)![0] as {
                    url: string;
                    data: Record<string, unknown>;
                };

                expect(last.url).toBe('/account/reset-confirm');
                expect(last.data).toMatchObject({ token: 'reset-token' });
            }));
});

describe('the account deletion flow', () => {
    it('requests deletion without touching the session', () => {
        const store = useAccountStore();

        return store
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => store.requestAccountDelete())
            .then(() => {
                // Only a token has been emailed at this point. Signing the visitor out here would
                // strand them holding a confirmation link they can no longer use.
                expect(requestedUrls().at(-1)).toBe('/account');
                expect(useSessionStore().isAuth).toBe(true);
            });
    });

    it('clears the session once deletion is confirmed', () => {
        const store = useAccountStore();

        return store
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => store.confirmAccountDelete('delete-token'))
            .then(() => {
                const session = useSessionStore();

                expect(requestedUrls().at(-1)).toBe('/account/delete-confirm');
                expect(session.accessToken).toBeUndefined();
                expect(session.isAuth).toBe(false);
                expect(store.profile).toBeUndefined();
            });
    });
});

describe('logoutEverywhere', () => {
    it('calls logout-all — the compromised-credentials button', () => {
        const store = useAccountStore();

        return store
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => store.logoutEverywhere())
            .then(() => {
                expect(requestedUrls().at(-1)).toBe('/account/logout-all');
                expect(useSessionStore().isAuth).toBe(false);
            });
    });
});

describe('the self-service actions', () => {
    beforeEach(() => {
        responses['POST /account/password'] = { data: undefined };
        responses['GET /account/sessions'] = {
            data: { sessions: [{ id: 's1', current: true }] }
        };
        responses['DELETE /account/sessions/s1'] = { data: undefined };
        responses['POST /account/verify-request'] = { data: undefined };
        responses['POST /account/verify-confirm'] = { data: undefined };
        responses['GET /account/addresses'] = {
            data: {
                addresses: [
                    {
                        id: 'a1',
                        fullName: 'Ada',
                        street: 'Via Roma 1',
                        city: 'Modena',
                        zip: '41121',
                        country: 'IT',
                        default: true
                    }
                ]
            }
        };
        responses['POST /account/addresses'] = responses['GET /account/addresses'];
        responses['PUT /account/addresses/a1'] = responses['GET /account/addresses'];
        responses['DELETE /account/addresses/a1'] = { data: undefined };
    });

    it('changePassword sends all three fields to its own endpoint', () =>
        useAccountStore()
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
            }));

    it('revokeSession reloads the list it changed', () => {
        const store = useAccountStore();
        return store
            .fetchSessions()
            .then(() => store.revokeSession('s1'))
            .then(() => {
                expect(requestedUrls().slice(-3)).toEqual([
                    '/account/sessions',
                    '/account/sessions/s1',
                    '/account/sessions'
                ]);
                expect(store.sessions.map(({ id }) => id)).toEqual(['s1']);
            });
    });

    it('a sessions payload without the list reads as no sessions', () => {
        responses['GET /account/sessions'] = { data: undefined };
        const store = useAccountStore();
        return store.fetchSessions().then(() => {
            expect(store.sessions).toEqual([]);
        });
    });

    it('confirmEmailVerification refetches the profile only for a live session', () => {
        const store = useAccountStore();
        // Guest first: spend a token with no session — no profile call may follow.
        return store
            .confirmEmailVerification('a-token')
            .then(() => {
                expect(requestedUrls()).toEqual(['/account/verify-confirm']);
            })
            .then(() => store.login('ada@example.com', 'hunter2hunter2'))
            .then(() => store.confirmEmailVerification('a-token'))
            .then(() => {
                // Authenticated: the freshly verified record is pulled back in.
                expect(requestedUrls().at(-1)).toBe('/account');
            });
    });

    it('requestEmailVerification asks for the re-send', () =>
        useAccountStore()
            .requestEmailVerification()
            .then(() => {
                expect(requestedUrls().at(-1)).toBe('/account/verify-request');
            }));

    it('the address book replaces the whole list on every write', () => {
        const store = useAccountStore();
        return store
            .fetchAddresses()
            .then(() =>
                store.addAddress({
                    fullName: 'Ada',
                    street: 'Via Roma 1',
                    city: 'Modena',
                    zip: '41121',
                    country: 'IT'
                })
            )
            .then(() => store.updateAddress('a1', { default: true }))
            .then(() => {
                expect(store.addresses.map(({ id }) => id)).toEqual(['a1']);
            })
            .then(() => store.removeAddress('a1'))
            .then(() => {
                // A payload-less answer is an empty book — the `?? []` arm.
                expect(store.addresses).toEqual([]);
            });
    });
});
