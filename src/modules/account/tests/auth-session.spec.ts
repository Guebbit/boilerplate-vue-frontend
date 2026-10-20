/**
 * @module
 * Unit tests for the auth store's session flows (login, logout, logoutEverywhere, password reset
 * request), mocking only the transport and keying answers by request URL so every layer above it
 * — the generated client, session/profile/observability stores — runs for real. `signup` is
 * covered separately, see `auth-signup.spec.ts`.
 *
 * `login` is COORDINATION rather than computation: it puts a token somewhere and asks for a
 * profile, so asserting against the real session store — rather than mocking it — asserts the
 * same thing the router guards actually read.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useAuthStore } from '../stores/auth.ts';
import { useProfileStore } from '../stores/profile.ts';
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
 * A representative user record, used across the login/session assertions below.
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
        // Unknown endpoint resolves to `undefined` rather than throwing: several actions ignore
        // their response body entirely, and forcing every one of them into the table above would
        // make the table a list of the endpoints called rather than of the answers that matter.
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
        'POST /account/reset': orvalEnvelope(),
        'POST /account/reset-confirm': orvalEnvelope(),
        'POST /account/logout': orvalEnvelope(),
        'POST /account/logout-all': orvalEnvelope()
    };
});

describe('login', () => {
    it('stores the token, then loads the profile with it', () =>
        useAuthStore()
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => {
                // Order is the assertion: a profile fetched before the token is attached is an
                // anonymous request, which answers 401 rather than the account. The rules follow
                // the record, because they are about the person it just identified.
                expect(requestedUrls()).toEqual([
                    '/account/login',
                    '/account',
                    '/account/abilities',
                    '/account/session/touch'
                ]);
                expect(useSessionStore().accessToken).toBe('jwt-token');
            }));

    /*
     * `cookie` mode: the login body carries no credential at all, so the session is the cookie the
     * browser now holds. Signed in means the viewer loaded, never a token.
     */
    it('in cookie mode, signs in from a login that carries no token', () => {
        useSessionStore().mode = 'cookie';
        responses['POST /account/login'] = orvalEnvelope({});

        return useAuthStore()
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => {
                const session = useSessionStore();
                expect(session.accessToken).toBeUndefined();
                expect(session.isAuth).toBe(true);
                expect(requestedUrls()).toEqual([
                    '/account/login',
                    '/account',
                    '/account/abilities',
                    '/account/session/touch'
                ]);
            });
    });

    // The boot reads the mode once (`main.ts`); a fresh tab has no `isAuth` cookie to trigger it
    // anywhere else, and a login adopted before the answer would behave as `jwt` and hold nothing.
    it('signs in on a fresh tab whose deployment answered cookie mode at boot', () => {
        responses['GET /account/session-config'] = orvalEnvelope({ mode: 'cookie' });
        responses['POST /account/login'] = orvalEnvelope({});

        return useSessionStore()
            .loadSessionMode()
            .then(() => useAuthStore().login('ada@example.com', 'hunter2hunter2'))
            .then(() => {
                expect(useSessionStore().isAuth).toBe(true);
                // The `isAuth` hint is the backend's cookie; the frontend writes none.
                expect(document.cookie).not.toContain('isAuth=');
            });
    });

    it('maps the remember checkbox to the long tier, and sends no tier otherwise', () =>
        useAuthStore()
            .login('ada@example.com', 'hunter2hunter2', true)
            .then(() => useAuthStore().login('ada@example.com', 'hunter2hunter2'))
            .then(() => {
                const bodies = vi
                    .mocked(orvalMutator)
                    .mock.calls.filter(
                        (call) => (call[0] as { url: string }).url === '/account/login'
                    )
                    .map((call) => (call[0] as { data: unknown }).data);
                expect(bodies).toEqual([
                    { email: 'ada@example.com', password: 'hunter2hunter2', remember: 'long' },
                    { email: 'ada@example.com', password: 'hunter2hunter2', remember: undefined }
                ]);
            }));

    it('publishes the viewer the router guards read', () =>
        useAuthStore()
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => {
                const session = useSessionStore();

                // The projection, not the record: the shell is not allowed to know what a `User`
                // is, so anything beyond these fields leaking in is a regression. `verified`
                //  is real: the fixture below never sets `verifiedAt`.
                expect(session.viewer).toEqual({
                    id: 'u1',
                    email: 'ada@example.com',
                    role: 'customer',
                    verified: false
                });
                expect(session.isAuth).toBe(true);
                expect(session.can('delete', 'Product')).toBe(false);
            }));

    it('answers each rule an unrestricted caller was published, so their screens resolve', () => {
        responses['GET /account'] = orvalEnvelope({ ...USER, role: 'admin' });
        /*
         * The RULES, not the role name. `can` asks what the server said this person may do — a
         * name is who they are, and only the rules say what that lets them do. There is no
         * wildcard: admin's rules are the concrete keys the role's declared superset actually
         * holds, so a fixture that published a `manage` rule would test a shape the server
         * cannot send.
         */
        responses['GET /account/abilities'] = orvalEnvelope({
            platform: [],
            tenant: [
                ['read', 'Product'],
                ['create', 'Product'],
                ['update', 'Product'],
                ['delete', 'Product']
            ],
            version: 36,
            subjects: ['Product']
        });

        return useAuthStore()
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => {
                const session = useSessionStore();

                expect(session.can('delete', 'Product')).toBe(true);
                expect(session.can('update', 'Product')).toBe(true);
                // Nothing published it, so it is refused — an unrestricted TENANT role is not a
                // platform operator, and admin's superset stops at the scope boundary.
                expect(session.can('read', 'ObservabilitySnapshot')).toBe(false);
            });
    });

    it('drops the rules when the session ends, so nothing stays unlocked', () => {
        responses['GET /account'] = orvalEnvelope({ ...USER, role: 'admin' });
        responses['GET /account/abilities'] = orvalEnvelope({
            platform: [],
            tenant: [['delete', 'Product']],
            version: 36,
            subjects: ['Product']
        });

        return useAuthStore()
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => {
                const session = useSessionStore();

                expect(session.can('delete', 'Product')).toBe(true);
                session.clearSession();

                // The empty abilities, not the previous visitor's: what a screen renders for a
                // stranger has to be what a stranger is allowed, and the next viewer's rules
                // arrive with the next fetch.
                expect(session.can('delete', 'Product')).toBe(false);
                expect(session.tenantAbility.can('delete', 'Product')).toBe(false);
            });
    });

    it('leaves the session anonymous when the response carries no token', () => {
        // A `data` with neither shape the union declares is impossible against the real contract
        // (`orvalMutator` itself would reject it) — this pins `getTokenFromResponse`'s OWN defence
        // for that state, so it bypasses `parseOrvalFixture` on purpose rather than resolving
        // through the keyed `responses` table.
        vi.mocked(orvalMutator).mockImplementationOnce(() =>
            Promise.resolve({ success: true, status: 200, message: 'OK', data: {} })
        );

        return useAuthStore()
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => {
                expect(useSessionStore().accessToken).toBeUndefined();
            });
    });
});

describe('logout', () => {
    it('ends THIS session only and clears the state the guards read', () => {
        const auth = useAuthStore();

        return auth
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => auth.logout())
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

    it('falls back to the guest answer, which is none', () => {
        vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'site-1');
        vi.stubEnv('VITE_UMAMI_SRC', 'https://umami.example.com/script.js');
        const auth = useAuthStore();

        return auth
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => auth.logout())
            .then(() => {
                // No guest answer on record, so the tracker is silenced once the account is gone.
                expect(localStorage.getItem('umami.disabled')).toBe('1');
                vi.unstubAllEnvs();
            });
    });

    it('drops the cached profile, so the next visitor is not served this one', () => {
        const auth = useAuthStore();

        return auth
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => auth.logout())
            .then(() => {
                expect(useProfileStore().profile).toBeUndefined();
            });
    });
});

describe('the password reset flow', () => {
    it('requests a token for an email', () =>
        useAuthStore()
            .requestPasswordReset('ada@example.com')
            .then(() => {
                expect(requestedUrls()).toEqual(['/account/reset']);
            }));

    it('confirms with the token and the new password', () =>
        useAuthStore()
            .confirmPasswordReset('reset-token', 'Hunter3!hunter3', 'Hunter3!hunter3')
            .then(() => {
                const last = vi.mocked(orvalMutator).mock.calls.at(-1)![0] as {
                    url: string;
                    data: Record<string, unknown>;
                };

                expect(last.url).toBe('/account/reset-confirm');
                expect(contractRequest(schemas.ConfirmPasswordResetBody, last.data)).toMatchObject({
                    token: 'reset-token'
                });
            }));
});

describe('a reset opened in a tab that is still signed in', () => {
    it('drops this tab’s session: the server ended it with every other one', () => {
        const auth = useAuthStore();

        return auth
            .login('ada@example.com', 'hunter2hunter2')
            .then(() =>
                auth.confirmPasswordReset('reset-token', 'Hunter3!hunter3', 'Hunter3!hunter3')
            )
            .then(() => {
                const session = useSessionStore();

                expect(session.accessToken).toBeUndefined();
                expect(session.viewer).toBeUndefined();
                expect(session.isAuth).toBe(false);
            });
    });
});

describe('logoutEverywhere', () => {
    it('calls logout-all — the compromised-credentials button', () => {
        const auth = useAuthStore();

        return auth
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => auth.logoutEverywhere())
            .then(() => {
                expect(requestedUrls().at(-1)).toBe('/account/logout-all');
                expect(useSessionStore().isAuth).toBe(false);
            });
    });
});

describe('restoreFromCookies after a failed mode read', () => {
    it('asks for the mode again and opens a cookie session, instead of refreshing as jwt', () => {
        responses['GET /account/session-config'] = orvalEnvelope({ mode: 'cookie' });
        vi.mocked(orvalMutator).mockRejectedValueOnce(new Error('network down'));

        return useSessionStore()
            .loadSessionMode()
            .then(() => {
                expect(useSessionStore().mode).toBeUndefined();
                return useSessionStore().restoreFromCookies();
            })
            .then(() => {
                expect(useSessionStore().mode).toBe('cookie');
                expect(useSessionStore().hasSession).toBe(true);
                expect(requestedUrls()).not.toContain('/account/refresh');
            });
    });

    it('does nothing, and does not refresh, while the mode stays unknown', () => {
        vi.mocked(orvalMutator).mockRejectedValue(new Error('network down'));

        return useSessionStore()
            .restoreFromCookies()
            .then(() => {
                expect(useSessionStore().hasSession).toBe(false);
                expect(requestedUrls()).not.toContain('/account/refresh');
            });
    });
});
