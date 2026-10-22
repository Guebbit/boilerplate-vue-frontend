/**
 * `useReauthStore` — `src/infrastructure/reauth.ts`: the step-up re-proof. A successful proof
 * adopts the re-minted token into the real session store; a refusal leaves the old one alone.
 * Only `@api` is mocked, at the network boundary.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import * as schemas from '@api/schemas';
import { contractResponse } from './http/orval-fixture-schema.ts';

// Deliberately untyped: the mocks return case-by-case fixture shapes the generated types refuse.
const reauthMock = vi.fn();
const getReauthMethodsMock = vi.fn();
const sendReauthCodeMock = vi.fn();

vi.mock('@api', () => ({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- deliberately untyped vi.fn(), see above
    reauth: (body: unknown) => reauthMock(body),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- deliberately untyped vi.fn(), see above
    getReauthMethods: () => getReauthMethodsMock(),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- deliberately untyped vi.fn(), see above
    sendReauthCode: (method: string) => sendReauthCodeMock(method),
    // The idle clock is read once per signed-in stretch; the answer names no timeout.
    touchSession: () => Promise.resolve({ data: { lastActiveAt: new Date().toISOString() } })
}));

/** The store under test, imported after the mocks are in place. */
const { reauthMethods, sendReauthCode, useReauthStore } =
    await import('@/infrastructure/reauth.ts');

/** The session store the proof renews, imported after the mocks are in place. */
const { useSessionStore } = await import('@/infrastructure/session.ts');

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
});

describe('reauth', () => {
    it('adopts the rotated token and raises its own flag meanwhile', () => {
        reauthMock.mockResolvedValue(contractResponse(schemas.ReauthResponse, { token: 'fresh' }));
        const store = useReauthStore();

        const pending = store.reauth({ method: 'password', password: 'hunter2' });
        expect(store.reauthing).toBe(true);
        expect(reauthMock).toHaveBeenCalledWith({ method: 'password', password: 'hunter2' });

        return pending.then(() => {
            expect(useSessionStore().accessToken).toBe('fresh');
            expect(store.reauthing).toBe(false);
        });
    });

    it('lowers the flag and keeps the old token when the password is refused', () => {
        reauthMock.mockRejectedValue(new Error('401'));
        useSessionStore().setAccessToken('token');
        const store = useReauthStore();

        return store
            .reauth({ method: 'password', password: 'wrong' })
            .catch(() => undefined)
            .then(() => {
                expect(store.reauthing).toBe(false);
                expect(useSessionStore().accessToken).toBe('token');
            });
    });
});

describe('reauthMethods and sendReauthCode', () => {
    it('lists the methods the server offers this account', () => {
        getReauthMethodsMock.mockResolvedValue(
            contractResponse(schemas.GetReauthMethodsResponse, { methods: ['email'] })
        );

        return reauthMethods().then((methods) => {
            expect(methods).toEqual(['email']);
        });
    });

    it("resolves the code send with the server's own cooldown", () => {
        sendReauthCodeMock.mockResolvedValue(
            contractResponse(schemas.SendReauthCodeResponse, {
                method: 'email',
                sentTo: 'a***b@example.com',
                resendAfter: 30,
                expiresAt: '2030-01-01T00:00:00.000Z'
            })
        );

        return sendReauthCode().then((resendAfter) => {
            expect(sendReauthCodeMock).toHaveBeenCalledWith('email');
            expect(resendAfter).toBe(30);
        });
    });
});
