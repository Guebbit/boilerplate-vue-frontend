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
 * injection, the readiness guards, and every `track*` helper's event name and payload. All of it
 * is this repo's own logic and all of it is observable through `globalThis.umami` and the DOM.
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

import { useObservabilityStore, analyticsEvents } from '@/infrastructure/observability';

/** Stands in for the object the Umami script attaches to `window` once it loads. */
const installUmamiTracker = () => {
    const tracker = { track: vi.fn(), identify: vi.fn() };
    globalThis.umami = tracker;
    return tracker;
};

/** Fire the `load` event on the injected tag, as the browser does once the script runs. */
const scriptLoads = () => {
    document.querySelector('script[data-website-id="site-1"]')?.dispatchEvent(new Event('load'));
};

/** A store with analytics switched on, which is the precondition for every `track` call. */
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

    describe('analyticsEvents', () => {
        it('carries both the shared catalogue and the frontend-only additions', () => {
            // The shared half is byte-identical with the backend and guarded by
            // `check:spec-identity`; the frontend-only half has no backend counterpart because
            // there is no "app started" on a server that is always started.
            expect(analyticsEvents.APP_STARTED).toBe('app_started');
            expect(analyticsEvents.USER_LOGGED_OUT).toBe('user_logged_out');
            expect(analyticsEvents.PRODUCT_VIEWED).toBeTruthy();
            expect(analyticsEvents.ORDER_CREATED).toBeTruthy();
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

    describe('track', () => {
        it('drops events until the tracker is ready', () => {
            const tracker = installUmamiTracker();
            // Deliberately no `initUmami()`: the script loads asynchronously, so the first
            // events of a session can arrive before it. Dropping them is the accepted trade.
            useObservabilityStore().track(analyticsEvents.APP_STARTED);

            expect(tracker.track).not.toHaveBeenCalled();
        });

        it('forwards the event and its properties once ready', () => {
            const tracker = installUmamiTracker();
            readyStore().track(analyticsEvents.APP_READY, { boot_ms: 12 });

            expect(tracker.track).toHaveBeenCalledWith('app_ready', { boot_ms: 12 });
        });

        it('does not throw when the script has not attached its global yet', () => {
            // `umamiReady` says "we injected the tag", not "the script finished loading". The
            // buffer is what keeps that window from throwing into a caller's promise.
            const store = readyStore();
            delete globalThis.umami;

            expect(() => store.track(analyticsEvents.APP_READY)).not.toThrow();
        });
    });

    /**
     * The window between injecting the tag and the tracker existing is one network round-trip
     * long, and `main.ts` emits `app_started` inside it — every session, without exception. While
     * those events were dropped, the two boot events in the catalogue could not appear in a
     * dashboard at all: not rare, not lossy, simply never recorded.
     *
     * These cases pin the buffer to that scenario rather than to its implementation — what is
     * asserted is that an event tracked before the script lands arrives after it does.
     */
    describe('events tracked before the tracker arrives', () => {
        it('are delivered once the script loads, not dropped', () => {
            const store = readyStore();

            // The real boot order: the tag is in the document, the tracker is not there yet.
            store.track(analyticsEvents.APP_STARTED);

            const tracker = installUmamiTracker();
            scriptLoads();

            expect(tracker.track).toHaveBeenCalledWith('app_started', undefined);
        });

        it('keep their order and their properties', () => {
            const store = readyStore();

            store.track(analyticsEvents.APP_STARTED);
            store.track(analyticsEvents.APP_READY, { boot_ms: 12 });

            const tracker = installUmamiTracker();
            scriptLoads();

            expect(tracker.track.mock.calls).toEqual([
                ['app_started', undefined],
                ['app_ready', { boot_ms: 12 }]
            ]);
        });

        it('are sent once, however many times the buffer is flushed', () => {
            const store = readyStore();
            store.track(analyticsEvents.APP_STARTED);

            const tracker = installUmamiTracker();
            scriptLoads();
            scriptLoads();

            expect(tracker.track).toHaveBeenCalledTimes(1);
        });

        it('go straight through once the tracker exists, without queueing', () => {
            const tracker = installUmamiTracker();
            const store = readyStore();

            store.track(analyticsEvents.APP_READY);

            // Already delivered before any load event: nothing was buffered.
            expect(tracker.track).toHaveBeenCalledTimes(1);
            scriptLoads();
            expect(tracker.track).toHaveBeenCalledTimes(1);
        });

        it('stop accumulating when the script never arrives', () => {
            // An ad blocker, or a Umami that is down. The buffer must not grow for the lifetime
            // of the tab; the newest events are the ones worth keeping.
            const store = readyStore();

            for (let index = 0; index < 60; index += 1) {
                store.track(analyticsEvents.PRODUCT_VIEWED, { index });
            }

            const tracker = installUmamiTracker();
            scriptLoads();

            expect(tracker.track).toHaveBeenCalledTimes(50);
            // The oldest ten were evicted, so the first survivor is number 10.
            expect(tracker.track.mock.calls[0]).toEqual([
                analyticsEvents.PRODUCT_VIEWED,
                { index: 10 }
            ]);
        });

        it('are dropped, not buffered, while analytics is disabled', () => {
            // No script is coming, so a buffer would only ever grow.
            vi.stubEnv('VITE_UMAMI_WEBSITE_ID', '');
            const store = useObservabilityStore();
            store.track(analyticsEvents.APP_STARTED);

            const tracker = installUmamiTracker();
            scriptLoads();

            expect(tracker.track).not.toHaveBeenCalled();
        });
    });

    /**
     * The convenience helpers exist so that call sites cannot invent their own property names —
     * a dashboard groups by `product_id`, and one caller sending `productId` is a silent hole in
     * the funnel. So the payload keys are the thing worth pinning, not just the event name.
     */
    describe('convenience helpers', () => {
        it('trackProductView sends the product id and name', () => {
            const tracker = installUmamiTracker();
            readyStore().trackProductView('p1', 'Gadget');

            expect(tracker.track).toHaveBeenCalledWith(analyticsEvents.PRODUCT_VIEWED, {
                product_id: 'p1',
                product_name: 'Gadget'
            });
        });

        it('trackItemAddedToCart sends the product id and quantity', () => {
            const tracker = installUmamiTracker();
            readyStore().trackItemAddedToCart('p1', 3);

            expect(tracker.track).toHaveBeenCalledWith(analyticsEvents.CART_ITEM_ADDED, {
                product_id: 'p1',
                quantity: 3
            });
        });

        it('trackOrderPlaced sends the order id, total and line count', () => {
            const tracker = installUmamiTracker();
            readyStore().trackOrderPlaced('o1', 19.98, 2);

            expect(tracker.track).toHaveBeenCalledWith(analyticsEvents.ORDER_CREATED, {
                order_id: 'o1',
                total_amount: 19.98,
                item_count: 2
            });
        });

        it('trackProductSearched sends the raw query', () => {
            const tracker = installUmamiTracker();
            readyStore().trackProductSearched('gad');

            expect(tracker.track).toHaveBeenCalledWith(analyticsEvents.PRODUCTS_SEARCHED, {
                query: 'gad'
            });
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
            globalThis.umami = { track: vi.fn() };

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
