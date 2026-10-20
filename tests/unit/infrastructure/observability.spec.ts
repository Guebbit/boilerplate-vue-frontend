/**
 * Unit tests for the observability store.
 *
 * This file exists because the telemetry surface was the single largest untested area in the
 * repo — `src/infrastructure/observability.ts` alone carried 123 mutants with NO COVERAGE, which
 * is the standing statement that nothing here was ever exercised. See
 * `docs/tools/mutation-testing.md`.
 *
 * ── What is covered, and what deliberately is not ────────────────────────────────────────────
 * The **Umami half** and the **unified API** are covered: config reading, one-shot script
 * injection and the readiness guards. All of it is this repo's own logic and all of it is
 * observable through the DOM and `localStorage`. There is no custom-event API to cover — the tag
 * records pageviews by itself and this app emits nothing of its own, and no one identifies the
 * visitor to either SDK, so there is no identify call to cover either.
 *
 * `initFaro` is NOT covered. It dynamically imports `@grafana/faro-web-sdk` and
 * `@grafana/faro-web-tracing` and hands them a real browser environment; a test would either
 * load two large SDKs into jsdom or mock them so thoroughly that it asserted only the shape of
 * the mock. What IS covered is every branch that Faro's absence controls — `captureException`
 * has to be a safe no-op while it is off, and that is the state a visitor with telemetry
 * disabled is actually in.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useObservabilityStore } from '@/infrastructure/observability/store.ts';

/** A store with the tracker tag injected — the state `initUmami` leaves the app in. */
const readyStore = () => {
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'site-1');
    vi.stubEnv('VITE_UMAMI_SRC', 'https://umami.example.com/script.js');
    vi.stubEnv('VITE_UMAMI_SRC', 'https://umami.example.com/script.js');
    const store = useObservabilityStore();
    store.initUmami();
    return store;
};

describe('useObservabilityStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
        document.head.innerHTML = '';
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe('setUmamiConsent', () => {
        beforeEach(() => localStorage.clear());

        it('does nothing without a website id', () => {
            vi.stubEnv('VITE_UMAMI_WEBSITE_ID', '');

            expect(useObservabilityStore().setUmamiConsent(false)).toBe(false);
            expect(localStorage.getItem('umami.disabled')).toBeNull();
        });

        it('withholds the tracker and sets umami.disabled without consent', () => {
            vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'site-1');
            vi.stubEnv('VITE_UMAMI_SRC', 'https://umami.example.com/script.js');

            expect(useObservabilityStore().setUmamiConsent(false)).toBe(false);
            expect(document.querySelector('script[data-website-id]')).toBeNull();
            expect(localStorage.getItem('umami.disabled')).toBe('1');
        });

        it('loads the tracker and lifts umami.disabled on consent', () => {
            localStorage.setItem('umami.disabled', '1');
            const store = readyStore();

            expect(store.setUmamiConsent(true)).toBe(true);
            expect(localStorage.getItem('umami.disabled')).toBeNull();
        });

        it('ignores consent when VITE_UMAMI_REQUIRE_CONSENT is false', () => {
            vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'site-1');
            vi.stubEnv('VITE_UMAMI_SRC', 'https://umami.example.com/script.js');
            vi.stubEnv('VITE_UMAMI_REQUIRE_CONSENT', 'false');

            expect(useObservabilityStore().setUmamiConsent(false)).toBe(true);
            expect(document.querySelector('script[data-website-id="site-1"]')).not.toBeNull();
        });

        it('tells the tracker to leave the query string and the fragment out of a pageview', () => {
            vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'site-1');
            vi.stubEnv('VITE_UMAMI_SRC', 'https://umami.example.com/script.js');
            vi.stubEnv('VITE_UMAMI_REQUIRE_CONSENT', 'false');

            useObservabilityStore().setUmamiConsent(true);

            // A mailed link's one-time token rides in `#token=`; Umami would record it otherwise.
            const script = document.querySelector<HTMLScriptElement>(
                'script[data-website-id="site-1"]'
            );
            expect(script?.dataset.excludeHash).toBe('true');
            expect(script?.dataset.excludeSearch).toBe('true');
        });

        it('survives blocked storage', () => {
            vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'site-1');
            vi.stubEnv('VITE_UMAMI_SRC', 'https://umami.example.com/script.js');
            vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
                throw new Error('blocked');
            });

            expect(() => useObservabilityStore().setUmamiConsent(false)).not.toThrow();
            vi.restoreAllMocks();
        });
    });

    describe('initUmami', () => {
        it('stays off, and injects nothing, when no website id is configured', () => {
            vi.stubEnv('VITE_UMAMI_WEBSITE_ID', '');
            const store = useObservabilityStore();

            expect(store.initUmami()).toBe(false);
            expect(store.umamiReady).toBe(false);
            expect(document.querySelector('script[data-website-id]')).toBeNull();
        });

        it('treats a whitespace-only website id as unset', () => {
            // `.trim()` on the way in: a half-filled `.env` should disable analytics rather than
            // register a website whose id is a space.
            vi.stubEnv('VITE_UMAMI_WEBSITE_ID', '   ');
            expect(useObservabilityStore().initUmami()).toBe(false);
        });

        it('injects the deferred tracker script and reports itself ready', () => {
            const store = readyStore();

            const script = document.querySelector<HTMLScriptElement>(
                'script[data-website-id="site-1"]'
            );
            expect(script).not.toBeNull();
            expect(script?.src).toBe('https://umami.example.com/script.js');
            // Deferred, so the tracker never blocks first paint.
            expect(script?.defer).toBe(true);
            expect(store.umamiReady).toBe(true);
        });

        it('injects once, however many times it is called', () => {
            // The guard is against HMR and against a second caller, both of which would otherwise
            // leave two trackers on the page double-counting every pageview.
            const store = readyStore();
            store.initUmami();
            store.initUmami();

            expect(document.querySelectorAll('script[data-website-id="site-1"]')).toHaveLength(1);
        });
    });

    /**
     * Error reporting with Faro OFF.
     *
     * This is the state of every visitor in a build with no `VITE_FARO_URL`, and of every visitor
     * before `initFaro` resolves. None of these may throw: `captureException` in particular is
     * called from the router's `onError`, so a throw here would replace a page error with a
     * crash inside the error handler.
     */
    describe('with Faro disabled', () => {
        it('captureException is a no-op, whatever it is handed', () => {
            const store = useObservabilityStore();

            expect(() => store.captureException(new Error('boom'))).not.toThrow();
            // Non-Error values reach it too — a rejected promise can carry anything.
            expect(() => store.captureException('a string')).not.toThrow();
            expect(() => store.captureException(undefined)).not.toThrow();
            expect(() =>
                store.captureException(new Error('boom'), { data: { orderId: 'o1' } })
            ).not.toThrow();
        });

        it('reports Faro as not ready', () => {
            expect(useObservabilityStore().faroReady).toBe(false);
        });
    });
});
