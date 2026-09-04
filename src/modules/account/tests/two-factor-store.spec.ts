/**
 * @module
 * Unit tests for `useTwoFactorStore()`: the enrollment machine (setup → confirm → backup codes),
 * the login-time challenge (send → submit, adopting the session on success), the `resendAfter`
 * countdown, and a 429 surfacing untouched for the view to branch on. Mocks only the transport,
 * same pattern as `sessions.spec.ts` and `auth-session.spec.ts`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useTwoFactorStore } from '@/modules/account/stores/two-factor.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { orvalMutator } from '@/infrastructure/http';

/**
 * A rejection marker: an entry shaped this way makes the mocked transport reject instead of
 * resolve, for the 429/wrong-code cases.
 */
interface RejectWith {
    __reject: unknown;
}

const isRejectWith = (value: unknown): value is RejectWith =>
    typeof value === 'object' && value !== null && '__reject' in value;

let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        const entry = responses[key];
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- simulating the API's own reject envelope, a plain object, exactly as `onResponseReject` produces it
        return isRejectWith(entry) ? Promise.reject(entry.__reject) : Promise.resolve(entry);
    })
}));

const requestedUrls = () =>
    vi.mocked(orvalMutator).mock.calls.map((call) => (call[0] as { url: string }).url);

const STATUS_OFF = {
    data: { enabled: false, methods: [], available: [], backupCodesRemaining: 0 }
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = { 'GET /account/2fa': STATUS_OFF };
});

describe('fetchStatus', () => {
    it('loads the account status', () => {
        const store = useTwoFactorStore();
        return store.fetchStatus().then(() => {
            expect(store.status).toEqual(STATUS_OFF.data);
        });
    });
});

describe('the enrollment machine', () => {
    it('a device method (no delivery) populates setup with the secret and otpauth URI', () => {
        responses['POST /account/2fa/methods/totp/setup'] = {
            data: {
                method: 'totp',
                delivers: false,
                secret: 'JBSWY3DPEHPK3PXP',
                otpauthUri: 'otpauth://totp/x'
            }
        };
        const store = useTwoFactorStore();
        return store.setupMethod('totp').then(() => {
            expect(store.setup).toMatchObject({ delivers: false, secret: 'JBSWY3DPEHPK3PXP' });
            expect(store.delivery).toBeUndefined();
        });
    });

    it('a delivered method populates setup AND starts the resend countdown', () => {
        responses['POST /account/2fa/methods/email/setup'] = {
            data: {
                method: 'email',
                delivers: true,
                sentTo: 'a***a@example.com',
                resendAfter: 30,
                expiresAt: '2026-01-01T00:10:00.000Z'
            }
        };
        const store = useTwoFactorStore();
        return store.setupMethod('email').then(() => {
            expect(store.setup).toMatchObject({ delivers: true, sentTo: 'a***a@example.com' });
            expect(store.delivery).toMatchObject({ sentTo: 'a***a@example.com', resendAfter: 30 });
            expect(store.secondsUntilResend).toBeGreaterThan(0);
        });
    });

    it('confirming the FIRST factor returns backup codes and refreshes status', () => {
        responses['POST /account/2fa/methods/email/confirm'] = {
            data: { method: 'email', backupCodes: ['aaa-111', 'bbb-222'], backupCodesRemaining: 2 }
        };
        responses['GET /account/2fa'] = {
            data: {
                enabled: true,
                methods: [{ method: 'email', delivers: true, target: 'a***a@example.com' }],
                available: [],
                backupCodesRemaining: 2
            }
        };
        const store = useTwoFactorStore();
        return store.confirmMethod('email', '123456').then(() => {
            expect(store.confirmed?.backupCodes).toEqual(['aaa-111', 'bbb-222']);
            expect(store.setup).toBeUndefined();
            expect(store.status?.enabled).toBe(true);
        });
    });

    it('confirming a SECOND factor returns no backup codes — never presented as "no codes exist"', () => {
        responses['POST /account/2fa/methods/totp/confirm'] = {
            data: { method: 'totp', backupCodesRemaining: 7 }
        };
        const store = useTwoFactorStore();
        return store.confirmMethod('totp', '123456').then((confirmed) => {
            expect(confirmed?.backupCodes).toBeUndefined();
            expect(confirmed?.backupCodesRemaining).toBe(7);
        });
    });

    it('clearSetup drops the pending enrollment and any confirmed result', () => {
        responses['POST /account/2fa/methods/totp/confirm'] = {
            data: { method: 'totp', backupCodesRemaining: 7 }
        };
        const store = useTwoFactorStore();
        return store.confirmMethod('totp', '123456').then(() => {
            store.clearSetup();
            expect(store.setup).toBeUndefined();
            expect(store.confirmed).toBeUndefined();
        });
    });

    it('a 429 resend-too-soon rejection still reaches the caller, but starts the cooldown first', () => {
        responses['POST /account/2fa/methods/email/setup'] = {
            __reject: {
                success: false,
                status: 429,
                errors: [
                    {
                        code: 'TWO_FACTOR_RESEND_TOO_SOON',
                        message: 'wait',
                        details: { retryAfter: 12 }
                    }
                ]
            }
        };
        const store = useTwoFactorStore();
        return expect(store.setupMethod('email'))
            .rejects.toMatchObject({
                errors: [{ code: 'TWO_FACTOR_RESEND_TOO_SOON' }]
            })
            .then(() => {
                // The button must not be hammerable while the SERVER is still refusing it — the
                // countdown starts from its own `retryAfter`, not only from a successful send.
                expect(store.secondsUntilResend).toBe(12);
            });
    });

    it('a rejection with no retryAfter leaves the cooldown untouched', () => {
        responses['POST /account/2fa/methods/email/setup'] = {
            __reject: {
                success: false,
                status: 400,
                errors: [{ code: 'INVALID_METHOD', message: 'nope' }]
            }
        };
        const store = useTwoFactorStore();
        return expect(store.setupMethod('email'))
            .rejects.toMatchObject({ errors: [{ code: 'INVALID_METHOD' }] })
            .then(() => {
                expect(store.secondsUntilResend).toBe(0);
            });
    });

    it('removeMethod and disableAll each refetch status afterward', () => {
        responses['DELETE /account/2fa/methods/email'] = { data: undefined };
        responses['DELETE /account/2fa'] = { data: undefined };
        const store = useTwoFactorStore();
        return store
            .removeMethod('email', '123456')
            .then(() => store.disableAll('123456'))
            .then(() => {
                expect(requestedUrls()).toEqual([
                    '/account/2fa/methods/email',
                    '/account/2fa',
                    '/account/2fa',
                    '/account/2fa'
                ]);
            });
    });
});

describe('the resend countdown', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('ticks down to zero and stops counting', () => {
        responses['POST /account/2fa/methods/email/setup'] = {
            data: {
                method: 'email',
                delivers: true,
                sentTo: 'a***a@example.com',
                resendAfter: 2,
                expiresAt: '2026-01-01T00:10:00.000Z'
            }
        };
        const store = useTwoFactorStore();
        return store.setupMethod('email').then(() => {
            expect(store.secondsUntilResend).toBe(2);
            vi.advanceTimersByTime(3000);
            expect(store.secondsUntilResend).toBe(0);
        });
    });
});

describe('the login-time challenge', () => {
    const MFA_OUTCOME = {
        kind: 'mfa' as const,
        challenge: 'claim-check-token',
        expiresAt: '2026-01-01T00:05:00.000Z',
        methods: [{ method: 'email', delivers: true, target: 'a***a@example.com' }],
        defaultMethod: 'email'
    };

    it('sendLoginCode delivers a code against the live challenge and tracks its resend cooldown', () => {
        const store = useTwoFactorStore();
        store.beginLoginChallenge(MFA_OUTCOME, false);
        responses['POST /account/login/2fa/send'] = {
            data: {
                method: 'email',
                sentTo: 'a***a@example.com',
                resendAfter: 15,
                expiresAt: '2026-01-01T00:05:00.000Z'
            }
        };
        return store.sendLoginCode('email').then(() => {
            const last = vi.mocked(orvalMutator).mock.calls.at(-1)![0] as {
                url: string;
                data: Record<string, unknown>;
            };
            expect(last.url).toBe('/account/login/2fa/send');
            expect(last.data).toEqual({ challenge: 'claim-check-token', method: 'email' });
            expect(store.secondsUntilResend).toBeGreaterThan(0);
        });
    });

    it('sendLoginCode also starts the cooldown from a 429s own retryAfter', () => {
        const store = useTwoFactorStore();
        store.beginLoginChallenge(MFA_OUTCOME, false);
        responses['POST /account/login/2fa/send'] = {
            __reject: {
                success: false,
                status: 429,
                errors: [
                    {
                        code: 'TWO_FACTOR_RESEND_TOO_SOON',
                        message: 'wait',
                        details: { retryAfter: 20 }
                    }
                ]
            }
        };
        return expect(store.sendLoginCode('email'))
            .rejects.toMatchObject({ errors: [{ code: 'TWO_FACTOR_RESEND_TOO_SOON' }] })
            .then(() => {
                expect(store.secondsUntilResend).toBe(20);
            });
    });

    it('submitLoginCode adopts the session — token, viewer, isAuth — and clears the challenge', () => {
        const store = useTwoFactorStore();
        store.beginLoginChallenge(MFA_OUTCOME, false);
        responses['POST /account/login/2fa'] = { data: { token: 'stepped-up-jwt' } };
        responses['GET /account'] = { data: { id: 'u1', email: 'ada@example.com', admin: false } };

        return store.submitLoginCode('123456').then(() => {
            const session = useSessionStore();
            expect(session.accessToken).toBe('stepped-up-jwt');
            expect(session.isAuth).toBe(true);
            expect(store.challenge).toBeUndefined();
        });
    });

    it('a backup code takes the same path — the server tells the two apart, not this store', () => {
        const store = useTwoFactorStore();
        store.beginLoginChallenge(MFA_OUTCOME, false);
        responses['POST /account/login/2fa'] = { data: { token: 'stepped-up-jwt' } };
        responses['GET /account'] = { data: { id: 'u1', email: 'ada@example.com', admin: false } };

        return store.submitLoginCode('backup-code-xyz').then(() => {
            const last = vi
                .mocked(orvalMutator)
                .mock.calls.find(
                    (call) => (call[0] as { url: string }).url === '/account/login/2fa'
                )![0] as { data: Record<string, unknown> };
            expect(last.data).toEqual({ challenge: 'claim-check-token', code: 'backup-code-xyz' });
        });
    });

    it('rejects rather than calling the API when there is no live challenge', () => {
        const store = useTwoFactorStore();
        return expect(store.sendLoginCode('email'))
            .rejects.toBeInstanceOf(Error)
            .then(() => expect(store.submitLoginCode('123456')).rejects.toBeInstanceOf(Error))
            .then(() => {
                expect(requestedUrls()).toEqual([]);
            });
    });

    it('clearChallenge drops the challenge and its delivery', () => {
        const store = useTwoFactorStore();
        store.beginLoginChallenge(MFA_OUTCOME, false);
        store.clearChallenge();
        expect(store.challenge).toBeUndefined();
        expect(store.delivery).toBeUndefined();
    });
});
