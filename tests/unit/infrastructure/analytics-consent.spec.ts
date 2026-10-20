/**
 * @module
 * The guest consent store: the three states, the cookie round-trip (`@guebbit/js-toolkit`'s
 * `setCookie`/`getCookie`, already a dependency — see the module's own doc for why no new one was
 * added), and the build-time flag that gates the whole feature.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { setCookie, deleteCookie } from '@guebbit/js-toolkit';

/** The relay call, replaced so a spec can count what the page would have sent. */
const { createAnalyticsEvent } = vi.hoisted(() => ({
    createAnalyticsEvent: vi.fn(() => Promise.resolve())
}));

vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@api')>()),
    createAnalyticsEvent
}));

/** Every cookie jsdom currently holds, as a plain map — same helper as `session.spec.ts`'s own. */
const cookieJar = () =>
    Object.fromEntries(
        document.cookie
            .split('; ')
            .filter(Boolean)
            .map((pair) => pair.split('=') as [string, string])
    );

/** The store and flag under test, imported after the mocks are in place. */
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

    it('stays closed while the account holds an answer and the cookie is unknown', () => {
        const store = useAnalyticsConsentStore();
        store.setAccountChoice(false);

        expect(store.choice).toBe('unknown');
        expect(store.effective).toBe('denied');
        expect(store.promptOpen).toBe(false);
    });

    it('opens while neither the account nor the cookie holds an answer', () => {
        const store = useAnalyticsConsentStore();
        store.setAccountChoice(true);
        store.setAccountChoice(undefined);

        expect(store.promptOpen).toBe(true);
    });

    it('opens after reopen() even with an account answer', () => {
        const store = useAnalyticsConsentStore();
        store.setAccountChoice(true);
        store.reopen();

        expect(store.promptOpen).toBe(true);
    });

    it('the account answer outranks a cookie one, for the tracker too', () => {
        const store = useAnalyticsConsentStore();
        store.grant();
        store.setAccountChoice(false);
        store.syncTracker();

        expect(store.effective).toBe('denied');
        expect(localStorage.getItem('umami.disabled')).toBe('1');
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

/** The observability store the consent store drives, with its Faro switch spied. */
const spiedObservability = async () => {
    const { useObservabilityStore } = await import('@/infrastructure/observability/store.ts');
    const observability = useObservabilityStore();
    return vi.spyOn(observability, 'setFaroConsent');
};

describe('syncTracker while a signed-in account answer is still on its way', () => {
    beforeEach(() => {
        vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'site-1');
        vi.stubEnv('VITE_UMAMI_SRC', 'https://umami.example.com/script.js');
        localStorage.clear();
        document.head.innerHTML = '';
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        deleteCookie('isAuth');
    });

    it('starts no tracker from a stale guest grant when the isAuth hint cookie is present', async () => {
        const store = useAnalyticsConsentStore();
        store.grant();
        document.head.innerHTML = '';
        localStorage.clear();
        setCookie('isAuth', 'true', { path: '/' });
        setActivePinia(createPinia());
        const setFaroConsent = await spiedObservability();

        useAnalyticsConsentStore().syncTracker();

        expect(setFaroConsent).toHaveBeenCalledWith(false);
        expect(setFaroConsent).not.toHaveBeenCalledWith(true);
        expect(document.querySelector('script[data-website-id="site-1"]')).toBeNull();
        expect(localStorage.getItem('umami.disabled')).toBe('1');
    });

    it('follows the account once the profile has pushed its answer', async () => {
        setCookie('isAuth', 'true', { path: '/' });
        setActivePinia(createPinia());
        const setFaroConsent = await spiedObservability();
        const store = useAnalyticsConsentStore();

        store.setAccountChoice(true);
        store.syncTracker();

        expect(setFaroConsent).toHaveBeenCalledWith(true);
        expect(document.querySelector('script[data-website-id="site-1"]')).not.toBeNull();
    });

    it('is unchanged for a guest: the cookie answer applies at once', async () => {
        const store = useAnalyticsConsentStore();
        store.grant();
        setActivePinia(createPinia());
        const setFaroConsent = await spiedObservability();

        useAnalyticsConsentStore().syncTracker();

        expect(setFaroConsent).toHaveBeenCalledWith(true);
    });
});

describe('trackBrowsing', () => {
    const VIEW = { event: 'product_viewed', productId: 'abc' } as const;

    beforeEach(() => {
        vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'site-1');
        vi.stubEnv('VITE_UMAMI_SRC', 'https://umami.example.com/script.js');
        createAnalyticsEvent.mockClear();
    });

    afterEach(() => vi.unstubAllEnvs());

    it('sends nothing before the visitor answers', () => {
        useAnalyticsConsentStore().trackBrowsing(VIEW);

        expect(createAnalyticsEvent).not.toHaveBeenCalled();
    });

    it('sends nothing after a denial', () => {
        const store = useAnalyticsConsentStore();
        store.deny();
        store.trackBrowsing(VIEW);

        expect(createAnalyticsEvent).not.toHaveBeenCalled();
    });

    it('does not replay an event from before consent once it is granted', () => {
        const store = useAnalyticsConsentStore();
        store.trackBrowsing(VIEW);
        store.grant();

        expect(createAnalyticsEvent).not.toHaveBeenCalled();
    });

    it('sends the event once the visitor has granted', () => {
        const store = useAnalyticsConsentStore();
        store.grant();
        store.trackBrowsing(VIEW);

        expect(createAnalyticsEvent).toHaveBeenCalledExactlyOnceWith(VIEW);
    });

    it('stops sending after a withdrawal', () => {
        const store = useAnalyticsConsentStore();
        store.grant();
        store.deny();
        store.trackBrowsing(VIEW);

        expect(createAnalyticsEvent).not.toHaveBeenCalled();
    });

    it('swallows a failed send: a lost page view costs the visitor nothing', async () => {
        createAnalyticsEvent.mockRejectedValueOnce(new Error('offline'));
        const store = useAnalyticsConsentStore();
        store.grant();

        expect(() => store.trackBrowsing(VIEW)).not.toThrow();
        await Promise.resolve();
    });
});

describe('isAnalyticsConsentEnabled', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('is off while neither Umami nor Faro is configured', () => {
        vi.stubEnv('VITE_UMAMI_WEBSITE_ID', '');
        vi.stubEnv('VITE_FARO_URL', '');

        expect(isAnalyticsConsentEnabled()).toBe(false);
    });

    it('is on when only Faro is configured: its measurement needs consent too', () => {
        vi.stubEnv('VITE_UMAMI_WEBSITE_ID', '');
        vi.stubEnv('VITE_FARO_URL', 'https://faro.example.com/collect');

        expect(isAnalyticsConsentEnabled()).toBe(true);
    });

    it('is on whenever Umami is configured, with no other flag', () => {
        vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'site-1');

        expect(isAnalyticsConsentEnabled()).toBe(true);
    });
});
