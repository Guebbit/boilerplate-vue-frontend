/**
 * The auth store's session flows: login, logout, logoutEverywhere, and the password reset request
 * pair. `auth-signup.spec.ts` covers `signup` separately — see that file for why.
 *
 * ── What is mocked, and what deliberately is not ─────────────────────────────────────────────
 * Only the transport. `orvalMutator` is replaced with a router keyed on the request URL, so every
 * layer above it is the real one: the generated `@api` client, `session.ts`, the observability
 * store, and the profile store `login` reaches into to load a profile after the token is stored.
 *
 * That matters because `login` is COORDINATION rather than computation — it does not transform
 * anything, it puts a token somewhere and then asks for a profile. Mocking the session or profile
 * store would leave nothing under test but the order of two calls into a double. Asserting against
 * the real session store asserts the thing the router guards actually read.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useAuthStore } from '@/modules/account/stores/auth.ts';
import { useProfileStore } from '@/modules/account/stores/profile.ts';
import { useSessionStore } from '@/infrastructure/stores/session.ts';
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
        'POST /account/logout': { data: undefined },
        'POST /account/logout-all': { data: undefined }
    };
});

describe('login', () => {
    it('stores the token, then loads the profile with it', () =>
        useAuthStore()
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => {
                // Order is the assertion: a profile fetched before the token is attached is an
                // anonymous request, which answers 401 rather than the account.
                expect(requestedUrls()).toEqual(['/account/login', '/account']);
                expect(useSessionStore().accessToken).toBe('jwt-token');
            }));

    it('maps the remember checkbox to the medium tier, and sends no tier otherwise', () =>
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
                    { email: 'ada@example.com', password: 'hunter2hunter2', remember: 'medium' },
                    { email: 'ada@example.com', password: 'hunter2hunter2', remember: undefined }
                ]);
            }));

    it('publishes the viewer the router guards read', () =>
        useAuthStore()
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

        return useAuthStore()
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => {
                expect(useSessionStore().isAdmin).toBe(true);
            });
    });

    it('leaves the session anonymous when the response carries no token', () => {
        responses['POST /account/login'] = { data: {} };

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
