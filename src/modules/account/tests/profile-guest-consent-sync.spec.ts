/**
 * @module
 * FA-D5's login-time sync: a guest who answered the consent banner and then authenticates into an
 * account that has never recorded a preference of its own (`analyticsConsent` absent) gets that
 * choice saved via `PATCH /account`, exactly once. Mocks only the transport, same pattern as
 * `profile.spec.ts`; the guest choice itself goes through the real `useAnalyticsConsentStore`.
 */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { deleteCookie } from '@guebbit/js-toolkit';
import { useProfileStore } from '@/modules/account/stores/profile.ts';
import { useAnalyticsConsentStore } from '@/infrastructure/analytics-consent.ts';
import { orvalMutator } from '@/infrastructure/http';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

/**
 * A never-asked account: no `analyticsConsent` key at all, the one shape that can trigger a sync.
 */
const NEVER_ASKED_USER = { id: 'u1', username: 'ada', email: 'ada@example.com', role: 'customer' };

let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        return Promise.resolve(parseOrvalFixture(config.method, config.url, responses[key]));
    })
}));

/**
 * Every `PATCH /account` body this suite's transport mock received, in order.
 */
const patchBodies = () =>
    vi
        .mocked(orvalMutator)
        .mock.calls.filter((call) => (call[0] as { method?: string }).method === 'PATCH')
        .map((call) => (call[0] as { data: Record<string, unknown> }).data);

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    // jsdom keeps `document.cookie` for the whole file, not per test — cleared through the same
    // toolkit function the store itself never gets to for a "never granted" starting point,
    // same reasoning as `session.spec.ts`'s own `clearSession()` reset.
    deleteCookie('analyticsConsent');
    responses = {
        'GET /account': orvalEnvelope(NEVER_ASKED_USER),
        'PATCH /account': orvalEnvelope({ ...NEVER_ASKED_USER, analyticsConsent: true }),
        // The rules `setViewer` fetches for every freshly-loaded profile — same fixture shape as
        // `profile.spec.ts`'s own.
        'GET /account/abilities': orvalEnvelope({
            platform: [],
            tenant: [['read', 'Product', { active: true, deletedAt: null }]],
            version: 36,
            subjects: ['Product']
        })
    };
});

afterEach(() => vi.unstubAllEnvs());

describe('the guest-consent sync', () => {
    it('does nothing when the feature flag is off, even with an answered guest cookie', () => {
        vi.stubEnv('VITE_ANALYTICS_GUEST_CONSENT', undefined);
        useAnalyticsConsentStore().grant();

        return useProfileStore()
            .fetchProfile(true)
            .then(() => {
                expect(patchBodies()).toEqual([]);
            });
    });

    it('does nothing while the guest never answered the banner', () => {
        vi.stubEnv('VITE_ANALYTICS_GUEST_CONSENT', 'true');
        // choice defaults to 'unknown' — no cookie was ever set.

        return useProfileStore()
            .fetchProfile(true)
            .then(() => {
                expect(patchBodies()).toEqual([]);
            });
    });

    it('does nothing for an account that already recorded its own preference', () => {
        vi.stubEnv('VITE_ANALYTICS_GUEST_CONSENT', 'true');
        useAnalyticsConsentStore().grant();
        responses['GET /account'] = orvalEnvelope({
            ...NEVER_ASKED_USER,
            analyticsConsent: false
        });

        return useProfileStore()
            .fetchProfile(true)
            .then(() => {
                expect(patchBodies()).toEqual([]);
            });
    });

    it('saves a granted guest choice onto a never-asked account via PATCH /account', () => {
        vi.stubEnv('VITE_ANALYTICS_GUEST_CONSENT', 'true');
        useAnalyticsConsentStore().grant();

        return useProfileStore()
            .fetchProfile(true)
            .then(() => {
                expect(patchBodies()).toEqual([{ analyticsConsent: true }]);
            });
    });

    it('saves a denied guest choice too', () => {
        vi.stubEnv('VITE_ANALYTICS_GUEST_CONSENT', 'true');
        useAnalyticsConsentStore().deny();
        responses['PATCH /account'] = orvalEnvelope({
            ...NEVER_ASKED_USER,
            analyticsConsent: false
        });

        return useProfileStore()
            .fetchProfile(true)
            .then(() => {
                expect(patchBodies()).toEqual([{ analyticsConsent: false }]);
            });
    });

    it('fires only once per session, even across repeated fetches', () => {
        vi.stubEnv('VITE_ANALYTICS_GUEST_CONSENT', 'true');
        useAnalyticsConsentStore().grant();
        const store = useProfileStore();

        return store
            .fetchProfile(true)
            .then(() => store.fetchProfile(true))
            .then(() => {
                expect(patchBodies().length).toBe(1);
            });
    });
});
