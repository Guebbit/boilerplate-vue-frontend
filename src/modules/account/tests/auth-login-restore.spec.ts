/**
 * @module
 * The deletion-grace branch of a sign-in: `login()` resolves with a `deletion-pending` outcome and
 * issues no session; the deletion store holds the offer and redeems it, adopting the session only
 * then. Same transport mock as `auth-login-mfa.spec.ts`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useAuthStore } from '../stores/auth.ts';
import { useDeletionRestoreStore } from '../stores/deletion-restore.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { orvalMutator } from '@/infrastructure/http';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    contractRequest,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';
import * as schemas from '@api/schemas';

wireModulesIntoCore();

/** Canned response per `METHOD /url` key, set by each test before it acts. */
let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        return Promise.resolve(parseOrvalFixture(config.method, config.url, responses[key]));
    })
}));

/** URLs of every request the mocked transport has seen, in call order. */
const requestedUrls = () =>
    vi.mocked(orvalMutator).mock.calls.map((call) => (call[0] as { url: string }).url);

/** The sign-in answer for an account its owner asked to delete. */
const DELETION_PENDING = {
    deletionPending: true,
    challenge: 'restore-claim-check',
    expiresAt: '2026-10-24T10:05:00.000Z',
    purgeAt: '2026-11-23T00:00:00.000Z'
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        'GET /account/abilities': {
            platform: [],
            tenant: [['read', 'Product', { active: true, deletedAt: null }]],
            version: 36,
            subjects: ['Product']
        },
        'POST /account/login': DELETION_PENDING,
        'POST /account/login/restore': { token: 'restored-jwt' },
        'GET /account': { id: 'u1', username: 'ada', email: 'ada@example.com' }
    };
});

describe('login — the deletion-pending branch', () => {
    it('resolves with the claim check and the date, and starts no session', () =>
        useAuthStore()
            .login('ada@example.com', 'hunter2hunter2')
            .then((outcome) => {
                expect(outcome).toEqual({
                    kind: 'deletion-pending',
                    challenge: 'restore-claim-check',
                    expiresAt: '2026-10-24T10:05:00.000Z',
                    purgeAt: '2026-11-23T00:00:00.000Z'
                });
                expect(requestedUrls()).toEqual(['/account/login']);
                expect(useSessionStore().isAuth).toBe(false);
            }));
});

/** Signs in and opens the offer the way `Login.vue` does. */
const openOffer = (remember: boolean) =>
    useAuthStore()
        .login('ada@example.com', 'hunter2hunter2', remember)
        .then((outcome) => {
            if (outcome.kind !== 'deletion-pending') throw new Error('expected an offer');
            useDeletionRestoreStore().begin(outcome, remember);
        });

describe('the deletion-restore store', () => {
    it('redeems the claim check, adopts the session and clears the offer', () =>
        openOffer(false)
            .then(() => useDeletionRestoreStore().restoreAndSignIn())
            .then(() => {
                const session = useSessionStore();
                expect(requestedUrls()).toContain('/account/login/restore');
                expect(session.accessToken).toBe('restored-jwt');
                expect(session.isAuth).toBe(true);
                expect(useDeletionRestoreStore().pending).toBeUndefined();
            }));

    it('sends the claim check and the ticked remember-me box as the long tier', () =>
        openOffer(true)
            .then(() => useDeletionRestoreStore().restoreAndSignIn())
            .then(() => {
                const call = vi
                    .mocked(orvalMutator)
                    .mock.calls.find(
                        (entry) => (entry[0] as { url: string }).url === '/account/login/restore'
                    )![0] as { data: Record<string, unknown> };
                expect(contractRequest(schemas.LoginRestoreBody, call.data)).toEqual({
                    challenge: 'restore-claim-check',
                    remember: 'long'
                });
            }));

    it('sends no challenge for an OAuth offer: its claim check is a cookie', () => {
        const store = useDeletionRestoreStore();
        store.beginOAuth({
            purgeAt: '2026-11-23T00:00:00.000Z',
            expiresAt: '2026-10-24T10:05:00.000Z'
        });

        return store.restoreAndSignIn().then(() => {
            const call = vi
                .mocked(orvalMutator)
                .mock.calls.find(
                    (entry) => (entry[0] as { url: string }).url === '/account/login/restore'
                )![0] as { data: Record<string, unknown> };
            expect(call.data.challenge).toBeUndefined();
        });
    });

    it('refuses to restore with no offer', () =>
        expect(useDeletionRestoreStore().restoreAndSignIn()).rejects.toThrow('NO_ACTIVE_RESTORE'));

    it('keeps the offer when the API refuses the claim check, so the visitor sees why', () => {
        responses['POST /account/login/restore'] = Promise.reject(
            Object.assign(new Error('expired'), { status: 401 })
        );

        return openOffer(false).then(() =>
            useDeletionRestoreStore()
                .restoreAndSignIn()
                .catch(() => undefined)
                .then(() => {
                    expect(useDeletionRestoreStore().pending?.challenge).toBe(
                        'restore-claim-check'
                    );
                    expect(useSessionStore().isAuth).toBe(false);
                })
        );
    });
});
