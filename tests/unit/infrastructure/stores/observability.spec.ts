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

import { useObservabilityStore } from '@/infrastructure/stores/observability.ts';

/**
 * Two arbitrary event names.
 *
 * This app publishes no catalogue of its own — pageviews are automatic and everything with an API
 * call behind it is emitted by the backend — so `track` takes any string, and what these tests
 * pin is the buffering, not a name.
 */
const FIRST_EVENT = 'first_event';

const SECOND_EVENT = 'second_event';

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
            useObservabilityStore().track(FIRST_EVENT);

            expect(tracker.track).not.toHaveBeenCalled();
        });

        it('forwards the event and its properties once ready', () => {
            const tracker = installUmamiTracker();
            readyStore().track(SECOND_EVENT, { boot_ms: 12 });

            expect(tracker.track).toHaveBeenCalledWith(SECOND_EVENT, { boot_ms: 12 });
        });

        it('does not throw when the script has not attached its global yet', () => {
            // `umamiReady` says "we injected the tag", not "the script finished loading". The
            // buffer is what keeps that window from throwing into a caller's promise.
            const store = readyStore();
            delete globalThis.umami;

            expect(() => store.track(SECOND_EVENT)).not.toThrow();
        });
    });

    /**
     * The window between injecting the tag and the tracker existing is one network round-trip
     * long, and anything an app built on this boilerplate emits during boot falls inside it. While
     * those events were dropped, a boot-time event could not appear in a dashboard at all: not
     * rare, not lossy, simply never recorded.
     *
     * These cases pin the buffer to that scenario rather than to its implementation — what is
     * asserted is that an event tracked before the script lands arrives after it does.
     */
    describe('events tracked before the tracker arrives', () => {
        it('are delivered once the script loads, not dropped', () => {
            const store = readyStore();

            // The real boot order: the tag is in the document, the tracker is not there yet.
            store.track(FIRST_EVENT);

            const tracker = installUmamiTracker();
            scriptLoads();

            expect(tracker.track).toHaveBeenCalledWith(FIRST_EVENT, undefined);
        });

        it('keep their order and their properties', () => {
            const store = readyStore();

            store.track(FIRST_EVENT);
            store.track(SECOND_EVENT, { boot_ms: 12 });

            const tracker = installUmamiTracker();
            scriptLoads();

            expect(tracker.track.mock.calls).toEqual([
                [FIRST_EVENT, undefined],
                [SECOND_EVENT, { boot_ms: 12 }]
            ]);
        });

        it('are sent once, however many times the buffer is flushed', () => {
            const store = readyStore();
            store.track(FIRST_EVENT);

            const tracker = installUmamiTracker();
            scriptLoads();
            scriptLoads();

            expect(tracker.track).toHaveBeenCalledTimes(1);
        });

        it('go straight through once the tracker exists, without queueing', () => {
            const tracker = installUmamiTracker();
            const store = readyStore();

            store.track(SECOND_EVENT);

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
                store.track(SECOND_EVENT, { index });
            }

            const tracker = installUmamiTracker();
            scriptLoads();

            expect(tracker.track).toHaveBeenCalledTimes(50);
            // The oldest ten were evicted, so the first survivor is number 10.
            expect(tracker.track.mock.calls[0]).toEqual([SECOND_EVENT, { index: 10 }]);
        });

        it('are dropped, not buffered, while analytics is disabled', () => {
            // No script is coming, so a buffer would only ever grow.
            vi.stubEnv('VITE_UMAMI_WEBSITE_ID', '');
            const store = useObservabilityStore();
            store.track(FIRST_EVENT);

            const tracker = installUmamiTracker();
            scriptLoads();

            expect(tracker.track).not.toHaveBeenCalled();
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
