/**
 * @module
 * The Faro-ENABLED half of `src/infrastructure/observability/store.ts`.
 *
 * `observability.spec.ts` covers the disabled state and explains why it stops there. What it
 * leaves untested is this repo's own mapping — the config object handed to `initializeFaro`, the
 * one-shot init promise, and the error normalisation — so the two SDKs are mocked at the module
 * boundary and only OUR arguments are asserted, never the SDKs' behaviour.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useObservabilityStore } from '@/infrastructure/observability/store.ts';

/** The `faro.api` surface this store calls, spied so each call can be asserted. */
const faroApi = {
    setUser: vi.fn(),
    resetUser: vi.fn(),
    pushError: vi.fn()
};

/** What `initializeFaro` returns — only the `api` handle is ever read. */
const fakeFaro = { api: faroApi };

const initializeFaro = vi.fn(() => fakeFaro);

/**
 * Stands in for the tracing SDK's instrumentation class, capturing the options it is constructed
 * with so `propagateTraceHeaderCorsUrls` can be checked.
 */
const tracingOptions: unknown[] = [];

vi.mock('@grafana/faro-web-sdk', () => ({
    initializeFaro: (...arguments_: unknown[]) => initializeFaro(...(arguments_ as [])),
    getWebInstrumentations: () => ['web-instrumentations']
}));

// An anonymous `function` rather than a class: a class holding only a constructor is what the lint
// rejects, and an arrow cannot be used with `new`, which is how the store builds this. Options are
// read from the body rather than captured — `vi.mock` hoists above `tracingOptions`, so anything
// evaluated at factory time would hit the temporal dead zone.
vi.mock('@grafana/faro-web-tracing', () => ({
    TracingInstrumentation: vi.fn(function (options: unknown) {
        tracingOptions.push(options);
    })
}));

beforeEach(() => {
    setActivePinia(createPinia());
    tracingOptions.length = 0;
    vi.stubEnv('VITE_FARO_URL', 'http://collector/collect');
    vi.stubEnv('VITE_FARO_APP_NAME', 'shop');
    vi.stubEnv('VITE_FARO_APP_VERSION', '2.4.0');
    vi.stubEnv('VITE_FARO_ENVIRONMENT', 'staging');
    vi.stubEnv('VITE_API_URL', 'https://api.example.com');
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', '');
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
});

describe('initFaro', () => {
    it('reports success and flips faroReady', async () => {
        const store = useObservabilityStore();

        await expect(store.initFaro()).resolves.toBe(true);
        expect(store.faroReady).toBe(true);
    });

    it('hands the SDK the configuration this repo read', async () => {
        const store = useObservabilityStore();
        await store.initFaro();

        expect(initializeFaro).toHaveBeenCalledWith(
            expect.objectContaining({
                url: 'http://collector/collect',
                app: { name: 'shop', version: '2.4.0', environment: 'staging' },
                ignoreUrls: ['http://collector/collect']
            })
        );
    });

    /**
     * The reason `apiOrigin` exists: without this pattern the browser sends no `traceparent` to
     * the API, and a request's front-end and back-end halves become two unrelated traces.
     */
    it('propagates trace headers to the API origin', async () => {
        const store = useObservabilityStore();
        await store.initFaro();

        const [options] = tracingOptions as {
            instrumentationOptions: { propagateTraceHeaderCorsUrls: RegExp[] };
        }[];
        const [pattern] = options.instrumentationOptions.propagateTraceHeaderCorsUrls;

        expect(pattern.test('https://api.example.com/orders')).toBe(true);
        expect(pattern.test('https://other.example.com/orders')).toBe(false);
    });

    /**
     * `faroInitPromise ??=` is the guard: two callers racing at bootstrap must share one setup,
     * or the second initialises a second Faro over the first.
     */
    it('initialises once however many callers race', async () => {
        const store = useObservabilityStore();
        await Promise.all([store.initFaro(), store.initFaro(), store.initFaro()]);
        await store.initFaro();

        expect(initializeFaro).toHaveBeenCalledOnce();
    });

    it('resolves false and calls nothing when no collector is configured', async () => {
        vi.stubEnv('VITE_FARO_URL', '');
        const store = useObservabilityStore();

        await expect(store.initFaro()).resolves.toBe(false);
        expect(store.faroReady).toBe(false);
        expect(initializeFaro).not.toHaveBeenCalled();
    });
});

describe('identifyUser, once Faro is up', () => {
    it('sets the user on Faro', async () => {
        const store = useObservabilityStore();
        await store.initFaro();
        store.identifyUser('u1', 'a@example.com');

        expect(faroApi.setUser).toHaveBeenCalledWith({ id: 'u1', email: 'a@example.com' });
    });

    it('passes an undefined email through rather than inventing one', async () => {
        const store = useObservabilityStore();
        await store.initFaro();
        store.identifyUser('u1');

        expect(faroApi.setUser).toHaveBeenCalledWith({ id: 'u1', email: undefined });
    });

    it('clears the identity on unidentify', async () => {
        const store = useObservabilityStore();
        await store.initFaro();
        store.unidentifyUser();

        expect(faroApi.resetUser).toHaveBeenCalledOnce();
    });
});

describe('captureException, once Faro is up', () => {
    it('pushes an Error unchanged and with no context', async () => {
        const store = useObservabilityStore();
        await store.initFaro();
        const error = new Error('boom');
        store.captureException(error);

        expect(faroApi.pushError).toHaveBeenCalledWith(error, undefined);
    });

    /**
     * A thrown non-Error still has to arrive as one: Faro's `pushError` reads `.stack`, and a
     * bare string would report an error with no message and no origin.
     */
    it.each([
        ['a string', 'a string'],
        [42, '42'],
        [undefined, 'undefined'],
        [{ code: 'E' }, '[object Object]']
    ])('normalises %o into an Error', async (thrown, message) => {
        const store = useObservabilityStore();
        await store.initFaro();
        store.captureException(thrown);

        const [pushed] = faroApi.pushError.mock.calls[0] as [Error];
        expect(pushed).toBeInstanceOf(Error);
        expect(pushed.message).toBe(message);
    });

    /**
     * Faro's error context is a string map, so a nested value has to be JSON — an object left as
     * itself arrives as `[object Object]` and the context is lost exactly when it is needed.
     */
    it('stringifies non-string context values and leaves strings alone', async () => {
        const store = useObservabilityStore();
        await store.initFaro();
        store.captureException(new Error('boom'), {
            data: { orderId: 'o1', quantity: 3, lines: [{ sku: 'a' }], missing: null }
        });

        expect(faroApi.pushError).toHaveBeenCalledWith(expect.any(Error), {
            context: {
                orderId: 'o1',
                quantity: '3',
                lines: '[{"sku":"a"}]',
                missing: 'null'
            }
        });
    });

    it('sends no context at all when none was given', async () => {
        const store = useObservabilityStore();
        await store.initFaro();
        store.captureException(new Error('boom'), {});

        expect(faroApi.pushError).toHaveBeenCalledWith(expect.any(Error), undefined);
    });
});
