/**
 * @module
 * Unit tests for `useAuthStore().login()`'s union narrowing: the `mfa` branch must resolve with
 * the challenge and touch NEITHER the session store nor the profile store — the bug this narrowing
 * exists to fix stored `undefined` as a token and then 401'd fetching the profile with it, locking
 * every 2FA account out of the app. `auth-session.spec.ts` covers the plain `session` branch this
 * store already had; this file is only about telling the two apart.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useAuthStore } from '@/modules/account/stores/auth.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { orvalMutator } from '@/infrastructure/http';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        return Promise.resolve(parseOrvalFixture(config.method, config.url, responses[key]));
    })
}));

const requestedUrls = () =>
    vi.mocked(orvalMutator).mock.calls.map((call) => (call[0] as { url: string }).url);

const MFA_CHALLENGE = {
    mfaRequired: true,
    challenge: 'claim-check-token',
    expiresAt: '2026-01-01T00:05:00.000Z',
    methods: [{ method: 'email', delivers: true, target: 'a***a@example.com' }],
    defaultMethod: 'email'
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        'POST /account/login': orvalEnvelope({ token: 'jwt-token' }),
        'GET /account': orvalEnvelope({ id: 'u1', username: 'ada', email: 'ada@example.com' })
    };
});

describe('login — the mfa branch', () => {
    it('resolves with the challenge, echoed from the response', () => {
        responses['POST /account/login'] = orvalEnvelope(MFA_CHALLENGE);

        return useAuthStore()
            .login('ada@example.com', 'hunter2hunter2')
            .then((outcome) => {
                expect(outcome).toEqual({
                    kind: 'mfa',
                    challenge: 'claim-check-token',
                    expiresAt: '2026-01-01T00:05:00.000Z',
                    methods: MFA_CHALLENGE.methods,
                    defaultMethod: 'email'
                });
            });
    });

    it('never fetches the profile — an MfaChallenge response carries no token to fetch it with', () => {
        responses['POST /account/login'] = orvalEnvelope(MFA_CHALLENGE);

        return useAuthStore()
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => {
                expect(requestedUrls()).toEqual(['/account/login']);
            });
    });

    it('leaves the session store untouched — the bug this branch exists to fix', () => {
        responses['POST /account/login'] = orvalEnvelope(MFA_CHALLENGE);

        return useAuthStore()
            .login('ada@example.com', 'hunter2hunter2')
            .then(() => {
                const session = useSessionStore();
                expect(session.accessToken).toBeUndefined();
                expect(session.viewer).toBeUndefined();
                expect(session.isAuth).toBe(false);
            });
    });
});

describe('login — the session branch', () => {
    it('resolves with kind: session for a plain account', () =>
        useAuthStore()
            .login('ada@example.com', 'hunter2hunter2')
            .then((outcome) => {
                expect(outcome).toEqual({ kind: 'session' });
                expect(useSessionStore().isAuth).toBe(true);
            }));
});
