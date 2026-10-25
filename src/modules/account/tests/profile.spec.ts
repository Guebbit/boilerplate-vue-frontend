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

import { useProfileStore } from '../stores/profile.ts';
import { useAuthStore } from '../stores/auth.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { orvalMutator } from '@/infrastructure/http';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    contractRequest,
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

import * as schemas from '@api/schemas';

wireModulesIntoCore();

/**
 * A representative user record, used across the fetch/update/role assertions below.
 */
const USER = { id: 'u1', username: 'ada', email: 'ada@example.com', role: 'customer' };

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
        return Promise.resolve(parseOrvalFixture(config.method, config.url, responses[key]));
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
        'POST /account/login': orvalEnvelope({ token: 'jwt-token' }),
        'GET /account': orvalEnvelope(USER),
        // The rules the server would publish for this viewer. The store unpacks them with CASL's
        // own reader, so a fixture that is not packed is a fixture no client could use.
        'GET /account/abilities': orvalEnvelope({
            platform: [],
            tenant: [
                ['read', 'Product', { active: true, deletedAt: null }],
                ['read', 'Order', { userId: 'u1', deletedAt: null }]
            ],
            version: 36,
            subjects: ['Order', 'Product']
        }),
        // `202`: the account is locked now and erased at `purgeAt` unless restored first.
        'DELETE /account': orvalEnvelope({
            requestedAt: '2026-10-24T10:00:00.000Z',
            purgeAt: '2026-11-23T10:00:00.000Z'
        }),
        'POST /account/restore': orvalEnvelope(),
        // PATCH, not PUT — `updateProfile` sends only the fields it was given.
        'PATCH /account': orvalEnvelope({ ...USER, username: 'ada2' }),
        // A fresh access token for this session.
        'POST /account/password': orvalEnvelope({ token: 'rotated-jwt' }),
        'POST /account/email-verification/confirm': orvalEnvelope(),
        'POST /account/email-change/confirm': orvalEnvelope(),
        'POST /account/email-change/undo': orvalEnvelope(),
        // The request answers `202` with the export's id and status; the data comes later, by link.
        'POST /account/export': orvalEnvelope({ id: 'e1', status: 'building' }),
        // The download body IS the export document, not an envelope. Every collection is an array
        // the fixture is free to leave empty; only `exportedAt` and `profile` are required scalars
        // on `AccountExportResponse`. `invoicing` is the one exception — an object of two empty
        // arrays, never absent, for an account with no paid orders yet.
        'GET /account/export/e1': {
            exportedAt: '2026-09-07T00:00:00.000Z',
            profile: USER,
            roles: [],
            addresses: [],
            orders: [],
            payments: [],
            shipments: [],
            cart: [],
            wishlist: [],
            sessions: [],
            signInMethods: { providers: [], twoFactor: [] },
            auditLog: [],
            apiKeys: [],
            invoicing: { invoices: [], creditNotes: [] }
        }
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
            .then(() => store.updateProfile({ username: 'ada2', role: 'admin' }))
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
                    .find(({ method }) => method?.toUpperCase() === 'PATCH')!;

                // PATCH /account, never the admin write: routing self-service through
                // `/users/{id}` answers 403 for anyone who is not an admin — every visitor
                // editing their own record.
                expect(last.url).toBe('/account');
                // `admin` was passed in and must NOT reach the wire: a user editing their own
                // record cannot promote themselves, and the store is the only thing enforcing it.
                // No `imageUrl` either: this call carries none, the same shape as a details-only
                // save from `Profile.vue` — only `ProfileAvatar.vue` ever includes that key.
                expect(
                    Object.keys(
                        contractRequest(schemas.UpdateAccountBody, last.data) as object
                    ).toSorted()
                ).toEqual(
                    [
                        'email',
                        'username',
                        'locale',
                        'phone',
                        'website',
                        'analyticsConsent'
                    ].toSorted()
                );
                expect(last.data.username).toBe('ada2');
            });
    });
});

describe('locale preference', () => {
    it('persists the chosen language through PATCH /account', () => {
        const store = useProfileStore();

        return store
            .fetchProfile(true)
            .then(() => store.updateProfile({ locale: 'it' }))
            .then(() => {
                const patch = vi
                    .mocked(orvalMutator)
                    .mock.calls.map(
                        (call) =>
                            call[0] as { method?: string; url: string; data?: { locale?: string } }
                    )
                    .find(
                        (call) => call.method?.toUpperCase() === 'PATCH' && call.url === '/account'
                    );
                // The record carries the language, so the next login can re-apply it.
                expect(patch?.data?.locale).toBe('it');
            });
    });
});

describe('the account deletion flow', () => {
    it('ends the local session and answers the erasure date once the account is locked', () => {
        const profile = useProfileStore();

        return useAuthStore()
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => profile.requestAccountDelete())
            .then((schedule) => {
                const session = useSessionStore();

                // The server ended every session in the same write: keeping this one would hold
                // a token the next request finds dead.
                expect(requestedUrls().at(-1)).toBe('/account');
                expect(schedule).toEqual({
                    requestedAt: '2026-10-24T10:00:00.000Z',
                    purgeAt: '2026-11-23T10:00:00.000Z'
                });
                expect(session.accessToken).toBeUndefined();
                expect(session.isAuth).toBe(false);
                expect(profile.profile).toBeUndefined();
            });
    });

    it('restores with the mailed token and signs nobody in', () => {
        const session = useSessionStore();

        return useProfileStore()
            .restoreAccount('restore-token')
            .then(() => {
                expect(requestedUrls().at(-1)).toBe('/account/restore');
                expect(session.isAuth).toBe(false);
            });
    });
});

describe('requestAccountExport', () => {
    it('answers the export id and status from POST /account/export, and carries no data', () =>
        useProfileStore()
            .requestAccountExport()
            .then((data) => {
                expect(requestedUrls().at(-1)).toBe('/account/export');
                expect(data).toEqual({ id: 'e1', status: 'building' });
            }));
});

describe('downloadAccountExport', () => {
    it('returns the export document from GET /account/export/{id}', () =>
        useProfileStore()
            .downloadAccountExport('e1')
            .then((data) => {
                expect(requestedUrls().at(-1)).toBe('/account/export/e1');
                expect(data?.profile).toEqual(USER);
                expect(data?.exportedAt).toBe('2026-09-07T00:00:00.000Z');
            }));
});

describe('the self-service actions', () => {
    it('changePassword sends all three fields and adopts the rotated access token', () =>
        useProfileStore()
            .changePassword('old-secret', 'New-secret-1!', 'New-secret-1!')
            .then(() => {
                const last = vi.mocked(orvalMutator).mock.calls.at(-1)![0] as {
                    url: string;
                    data: Record<string, unknown>;
                };
                expect(last.url).toBe('/account/password');
                expect(
                    Object.keys(
                        contractRequest(schemas.ChangePasswordBody, last.data) as object
                    ).toSorted()
                ).toEqual(['currentPassword', 'password', 'passwordConfirm'].toSorted());
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
                expect(requestedUrls()).toEqual(['/account/email-verification/confirm']);
            })
            .then(() => useAuthStore().login('ada@example.com', 'hunter2hunter2'))
            .then(() => profile.confirmEmailVerification('a-token'))
            .then(() => {
                // Authenticated: the freshly verified record is pulled back in, and the rules
                // that go with it follow.
                // Unordered: the rules are fetched without being awaited — a shell that blocked on
                // learning what to hide would be worse than one that hides too much for a moment
                // — so the order they land in, and the idle-clock read after them, are not facts
                // worth pinning.
                expect(requestedUrls().slice(-3)).toEqual(
                    expect.arrayContaining(['/account', '/account/abilities'])
                );
            });
    });

    it("undoEmailChange posts the token, refetches nothing and drops this tab's dead session", () => {
        const profile = useProfileStore();

        return useAuthStore()
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => {
                const before = requestedUrls().length;
                return profile.undoEmailChange('a-token').then(() => before);
            })
            .then((before) => {
                expect(requestedUrls().slice(before)).toEqual(['/account/email-change/undo']);
                expect(useSessionStore().isAuth).toBe(false);
                expect(useSessionStore().accessToken).toBeUndefined();
                expect(profile.profile).toBeUndefined();
            });
    });

    it('confirmEmailChange refetches the profile only for a live session', () => {
        const profile = useProfileStore();
        // Guest first: spend a token with no session — no profile call may follow. Same shape as
        // confirmEmailVerification above — the two prove different tokens, never each other's.
        return profile
            .confirmEmailChange('a-token')
            .then(() => {
                expect(requestedUrls()).toEqual(['/account/email-change/confirm']);
            })
            .then(() => useAuthStore().login('ada@example.com', 'hunter2hunter2'))
            .then(() => profile.confirmEmailChange('a-token'))
            .then(() => {
                // Authenticated: the freshly swapped-in address is pulled back in, and the rules
                // that go with it follow — same sorted-tail reasoning as the verification case.
                expect(requestedUrls().slice(-3)).toEqual(
                    expect.arrayContaining(['/account', '/account/abilities'])
                );
            });
    });
});
