/**
 * @module
 * FA-D5's guest consent store: the three states, the cookie round-trip (`@guebbit/js-toolkit`'s
 * `setCookie`/`getCookie`, already a dependency — see the module's own doc for why no new one was
 * added), and the build-time flag that gates the whole feature.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { setCookie, deleteCookie } from '@guebbit/js-toolkit';

/** Every cookie jsdom currently holds, as a plain map — same helper as `session.spec.ts`'s own. */
const cookieJar = () =>
    Object.fromEntries(
        document.cookie
            .split('; ')
            .filter(Boolean)
            .map((pair) => pair.split('=') as [string, string])
    );

const { useAnalyticsConsentStore, isAnalyticsGuestConsentEnabled } =
    await import('@/infrastructure/analytics-consent.ts');

beforeEach(() => {
    // jsdom keeps `document.cookie` for the whole file, not per test — cleared through the same
    // toolkit function the store itself uses, like production code, rather than a raw assignment.
    deleteCookie('analyticsConsent');
    setActivePinia(createPinia());
});

describe('useAnalyticsConsentStore', () => {
    it('starts unknown with no cookie on record', () => {
        expect(useAnalyticsConsentStore().choice).toBe('unknown');
    });

    it('grant() records granted, in state and in the cookie', () => {
        useAnalyticsConsentStore().grant();

        expect(useAnalyticsConsentStore().choice).toBe('granted');
        expect(cookieJar().analyticsConsent).toBe('granted');
    });

    it('deny() records denied, in state and in the cookie', () => {
        useAnalyticsConsentStore().deny();

        expect(useAnalyticsConsentStore().choice).toBe('denied');
        expect(cookieJar().analyticsConsent).toBe('denied');
    });

    it('a fresh store instance restores the choice from the cookie', () => {
        useAnalyticsConsentStore().grant();

        setActivePinia(createPinia());

        expect(useAnalyticsConsentStore().choice).toBe('granted');
    });

    it('an unrecognised cookie value reads as unknown', () => {
        setCookie('analyticsConsent', 'garbled', { path: '/' });

        expect(useAnalyticsConsentStore().choice).toBe('unknown');
    });
});

describe('isAnalyticsGuestConsentEnabled', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('is off by default', () => {
        vi.stubEnv('VITE_ANALYTICS_GUEST_CONSENT', undefined);

        expect(isAnalyticsGuestConsentEnabled()).toBe(false);
    });

    it('is on only for the exact string "true"', () => {
        vi.stubEnv('VITE_ANALYTICS_GUEST_CONSENT', 'true');
        expect(isAnalyticsGuestConsentEnabled()).toBe(true);

        vi.stubEnv('VITE_ANALYTICS_GUEST_CONSENT', '1');
        expect(isAnalyticsGuestConsentEnabled()).toBe(false);
    });
});
