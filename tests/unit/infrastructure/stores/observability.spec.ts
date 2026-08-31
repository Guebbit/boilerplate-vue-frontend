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
 * observable through `globalThis.umami` and the DOM. There is no custom-event API to cover — the
 * tag records pageviews by itself and this app emits nothing of its own.
 *
 * `initFaro` is NOT covered. It dynamically imports `@grafana/faro-web-sdk` and
 * `@grafana/faro-web-tracing` and hands them a real browser environment; a test would either
 * load two large SDKs into jsdom or mock them so thoroughly that it asserted only the shape of
 * the mock. What IS covered is every branch that Faro's absence controls — `identifyUser`,
 * `unidentifyUser` and `captureException` all have to be safe no-ops while it is off, and that
 * is the state a visitor with telemetry disabled is actually in.
 *
 * The Umami tracker is a global the real script attaches to `window`, so each test installs its
 * own and `afterEach` removes it — otherwise a test that never initialised analytics would still
 * see the previous one's spy.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useObservabilityStore } from '@/infrastructure/stores/observability.ts';

/** Stands in for the object the Umami script attaches to `window` once it loads. */
const installUmamiTracker = () => {
    const tracker = { identify: vi.fn() };
    globalThis.umami = tracker;
    return tracker;
};

/** A store with the tracker tag injected — the state `initUmami` leaves the app in. */
const readyStore = () => {
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'site-1');
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
        delete globalThis.umami;
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
     * Identity and error reporting with Faro OFF.
     *
     * This is the state of every visitor in a build with no `VITE_FARO_URL`, and of every visitor
     * before `initFaro` resolves. None of these may throw: `captureException` in particular is
     * called from the router's `onError`, so a throw here would replace a page error with a
     * crash inside the error handler.
     */
    describe('with Faro disabled', () => {
        it('identifyUser still reaches Umami', () => {
            const tracker = installUmamiTracker();
            useObservabilityStore().identifyUser('u1', 'ada@example.com');

            expect(tracker.identify).toHaveBeenCalledWith({
                id: 'u1',
                email: 'ada@example.com'
            });
        });

        it('identifyUser tolerates a tracker without identify (pre-2.11 Umami)', () => {
            globalThis.umami = {};

            expect(() => useObservabilityStore().identifyUser('u1')).not.toThrow();
        });

        it('identifyUser tolerates no tracker at all', () => {
            expect(() => useObservabilityStore().identifyUser('u1')).not.toThrow();
        });

        it('unidentifyUser is a no-op', () => {
            expect(() => useObservabilityStore().unidentifyUser()).not.toThrow();
        });

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
