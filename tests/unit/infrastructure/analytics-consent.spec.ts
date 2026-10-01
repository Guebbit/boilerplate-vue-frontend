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

const { useAnalyticsConsentStore, isAnalyticsConsentEnabled } =
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

describe('promptOpen, reopen and the Umami tracker', () => {
    beforeEach(() => {
        vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'site-1');
        vi.stubEnv('VITE_UMAMI_SRC', 'https://umami.example.com/script.js');
        localStorage.clear();
        document.head.innerHTML = '';
    });

    afterEach(() => vi.unstubAllEnvs());

    it('prompts while unknown, stops once answered, and prompts again after reopen()', () => {
        const store = useAnalyticsConsentStore();
        expect(store.promptOpen).toBe(true);

        store.deny();
        expect(store.promptOpen).toBe(false);

        store.reopen();
        expect(store.promptOpen).toBe(true);

        store.grant();
        expect(store.promptOpen).toBe(false);
    });

    it('loads no tracker before the visitor answers', () => {
        useAnalyticsConsentStore().syncTracker();

        expect(document.querySelector('script[data-website-id]')).toBeNull();
        expect(localStorage.getItem('umami.disabled')).toBe('1');
    });

    it('loads the tracker only after grant()', () => {
        useAnalyticsConsentStore().grant();

        expect(document.querySelector('script[data-website-id="site-1"]')).not.toBeNull();
        expect(localStorage.getItem('umami.disabled')).toBeNull();
    });

    it('a later deny() silences the tracker through umami.disabled', () => {
        const store = useAnalyticsConsentStore();
        store.grant();
        store.deny();

        expect(localStorage.getItem('umami.disabled')).toBe('1');
    });

    it('syncTracker() on a fresh load honours a stored grant', () => {
        useAnalyticsConsentStore().grant();
        document.head.innerHTML = '';
        setActivePinia(createPinia());

        useAnalyticsConsentStore().syncTracker();

        expect(document.querySelector('script[data-website-id="site-1"]')).not.toBeNull();
    });

    it('loads the tracker unasked when VITE_UMAMI_REQUIRE_CONSENT is false', () => {
        vi.stubEnv('VITE_UMAMI_REQUIRE_CONSENT', 'false');

        useAnalyticsConsentStore().syncTracker();

        expect(document.querySelector('script[data-website-id="site-1"]')).not.toBeNull();
    });
});

describe('isAnalyticsConsentEnabled', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('is off while Umami has no website id', () => {
        vi.stubEnv('VITE_UMAMI_WEBSITE_ID', '');

        expect(isAnalyticsConsentEnabled()).toBe(false);
    });

    it('is on whenever Umami is configured, with no other flag', () => {
        vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'site-1');

        expect(isAnalyticsConsentEnabled()).toBe(true);
    });
});
