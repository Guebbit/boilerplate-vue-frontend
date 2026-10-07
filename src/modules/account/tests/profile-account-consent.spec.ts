/**
 * @module
 * While signed in, the account's analytics answer is the effective one: the consent buttons write
 * the account (`PATCH /account`) and never the guest cookie, and sign-out hands the banner back
 * to the cookie. Mocks only the transport; the consent, profile, auth and session stores are real.
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { deleteCookie, getCookie } from '@guebbit/js-toolkit';

import { useProfileStore } from '@/modules/account/stores/profile.ts';
import { useAuthStore } from '@/modules/account/stores/auth.ts';
import { useAnalyticsConsentStore } from '@/infrastructure/analytics-consent.ts';
import { orvalMutator } from '@/infrastructure/http';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

/**
 * An account record; `analyticsConsent` is added per test.
 */
const USER = { id: 'u1', username: 'ada', email: 'ada@example.com', role: 'customer' };

/** Canned response per `METHOD /url` key, set by each test before it acts. */
let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        return Promise.resolve(parseOrvalFixture(config.method, config.url, responses[key]));
    })
}));

/**
 * Every `PATCH /account` body the transport mock received, in order.
 */
const patchBodies = () =>
    vi
        .mocked(orvalMutator)
        .mock.calls.filter((call) => (call[0] as { method?: string }).method === 'PATCH')
        .map((call) => (call[0] as { data: Record<string, unknown> }).data);

/**
 * Signs in for real and loads the profile, with the account's answer as given.
 *
 * @param analyticsConsent - what the account record holds, `undefined` for never asked
 */
const signInHolding = (analyticsConsent?: boolean) => {
    responses['GET /account'] = orvalEnvelope({ ...USER, analyticsConsent });
    useProfileStore();
    return useAuthStore()
        .login('ada@example.com', 'hunter2hunter2')
        .then(() => useProfileStore().fetchProfile(true));
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'site-1');
    vi.stubEnv('VITE_UMAMI_SRC', 'https://umami.example.com/script.js');
    deleteCookie('analyticsConsent');
    responses = {
        'POST /account/login': orvalEnvelope({ token: 'jwt-token' }),
        'PATCH /account': orvalEnvelope({ ...USER, analyticsConsent: false }),
        'GET /account/abilities': orvalEnvelope({
            platform: [],
            tenant: [['read', 'Product', { active: true, deletedAt: null }]],
            version: 36,
            subjects: ['Product']
        })
    };
});

afterEach(() => vi.unstubAllEnvs());

describe('the account answer while signed in', () => {
    it('hides the banner when the account holds an answer and the cookie is unknown', () =>
        signInHolding(true).then(() => {
            expect(useAnalyticsConsentStore().promptOpen).toBe(false);
        }));

    it('shows the banner when neither the account nor the cookie holds an answer', () =>
        signInHolding().then(() => {
            expect(useAnalyticsConsentStore().promptOpen).toBe(true);
        }));

    it('withdraws through the account, not the cookie', () =>
        signInHolding(true)
            .then(() => {
                const consent = useAnalyticsConsentStore();
                responses['GET /account'] = orvalEnvelope({ ...USER, analyticsConsent: false });
                consent.reopen();
                consent.deny();

                return vi.waitFor(() => {
                    expect(patchBodies()).toEqual([{ analyticsConsent: false }]);
                    expect(consent.effective).toBe('denied');
                });
            })
            .then(() => {
                expect(getCookie('analyticsConsent')).toBeFalsy();
            }));

    it('grants through the account for an account that never answered', () =>
        signInHolding()
            .then(() => {
                responses['PATCH /account'] = orvalEnvelope({ ...USER, analyticsConsent: true });
                responses['GET /account'] = orvalEnvelope({ ...USER, analyticsConsent: true });
                useAnalyticsConsentStore().grant();

                return vi.waitFor(() => {
                    expect(patchBodies()).toEqual([{ analyticsConsent: true }]);
                    expect(useAnalyticsConsentStore().promptOpen).toBe(false);
                });
            })
            .then(() => {
                expect(getCookie('analyticsConsent')).toBeFalsy();
            }));

    it('hands the banner back to the cookie after logout', () =>
        signInHolding(true)
            .then(() => {
                expect(useAnalyticsConsentStore().effective).toBe('granted');

                return useAuthStore().logout();
            })
            .then(() => {
                const consent = useAnalyticsConsentStore();
                expect(consent.effective).toBe('unknown');
                expect(consent.promptOpen).toBe(true);
            }));

    it('a guest answer still writes the cookie and no account', () => {
        useProfileStore();
        useAnalyticsConsentStore().grant();

        expect(getCookie('analyticsConsent')).toBe('granted');
        expect(patchBodies()).toEqual([]);
    });
});
