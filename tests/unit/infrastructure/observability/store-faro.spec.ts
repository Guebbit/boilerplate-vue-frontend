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
import {
    useObservabilityStore,
    stripSensitiveUrlParts,
    stripTokensFromTelemetry
} from '@/infrastructure/observability/store.ts';
import type { TransportItem } from '@grafana/faro-web-sdk';
import { asStub } from '../../../support/stub.ts';

/** The `faro.api` surface this store calls, spied so each call can be asserted. */
const faroApi = {
    pushError: vi.fn()
};

/**
 * The `faro.instrumentations` surface. Nothing here calls it any more: the SDK's `remove` only
 * takes out the last instrumentation added, so a withdrawal pauses the transport instead.
 */
const faroInstrumentations = { add: vi.fn(), remove: vi.fn() };

/** What `initializeFaro` returns — the `api` handle, the instrumentation registry and the transport switch. */
const fakeFaro = {
    api: faroApi,
    instrumentations: faroInstrumentations,
    pause: vi.fn(),
    unpause: vi.fn()
};

/** Stub for Faro's `initializeFaro`, returning the fake instance. */
const initializeFaro = vi.fn(() => fakeFaro);

/**
 * Stands in for the tracing SDK's instrumentation class, capturing the options it is constructed
 * with so `propagateTraceHeaderCorsUrls` can be checked.
 */
const tracingOptions: unknown[] = [];

/**
 * A stand-in instrumentation class, named so a spec can read back WHICH ones were built. A
 * function expression, not a class: a class holding only a field is what the lint rejects.
 */
const namedInstrumentation = (name: string) =>
    vi.fn(function (this: { name: string }) {
        this.name = name;
    });

vi.mock('@grafana/faro-web-sdk', () => ({
    initializeFaro: (...arguments_: unknown[]) => initializeFaro(...(arguments_ as [])),
    ErrorsInstrumentation: namedInstrumentation('ErrorsInstrumentation'),
    ConsoleInstrumentation: namedInstrumentation('ConsoleInstrumentation'),
    CSPInstrumentation: namedInstrumentation('CSPInstrumentation'),
    ViewInstrumentation: namedInstrumentation('ViewInstrumentation'),
    WebVitalsInstrumentation: namedInstrumentation('WebVitalsInstrumentation'),
    PerformanceInstrumentation: namedInstrumentation('PerformanceInstrumentation'),
    NavigationInstrumentation: namedInstrumentation('NavigationInstrumentation')
}));

// An anonymous `function` rather than a class: a class holding only a constructor is what the lint
// rejects, and an arrow cannot be used with `new`, which is how the store builds this. Options are
// read from the body rather than captured — `vi.mock` hoists above `tracingOptions`, so anything
// evaluated at factory time would hit the temporal dead zone.
vi.mock('@grafana/faro-web-tracing', () => ({
    TracingInstrumentation: vi.fn(function (this: { name: string }, options: unknown) {
        this.name = 'TracingInstrumentation';
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

/** The instrumentation names `initializeFaro` was last handed. */
const bootInstrumentations = (): string[] => {
    const [config] = asStub<[{ instrumentations: { name: string }[] }]>(
        initializeFaro.mock.calls.at(-1)
    );
    return config.instrumentations.map(({ name }) => name);
};

describe('Faro before consent', () => {
    it('is not loaded at all while consent is unknown or denied', async () => {
        const store = useObservabilityStore();
        store.setFaroConsent(false);
        await Promise.resolve();

        expect(initializeFaro).not.toHaveBeenCalled();
        expect(store.faroReady).toBe(false);
    });

    it('boots with crash reports, web vitals, performance and tracing, and no navigation', async () => {
        await useObservabilityStore().initFaro();

        expect(bootInstrumentations()).toEqual([
            'ErrorsInstrumentation',
            'ConsoleInstrumentation',
            'CSPInstrumentation',
            'ViewInstrumentation',
            'WebVitalsInstrumentation',
            'PerformanceInstrumentation',
            'TracingInstrumentation'
        ]);
        expect(bootInstrumentations()).not.toContain('NavigationInstrumentation');
        expect(faroInstrumentations.add).not.toHaveBeenCalled();
    });

    it('tracks no session, so no session id is generated or stored', async () => {
        await useObservabilityStore().initFaro();

        expect(initializeFaro).toHaveBeenCalledWith(
            expect.objectContaining({ sessionTracking: { enabled: false } })
        );
        expect(sessionStorage.getItem('com.grafana.faro.session')).toBeNull();
    });
});

describe('setFaroConsent', () => {
    it('boots Faro once on consent and lets the transport send', async () => {
        const store = useObservabilityStore();

        store.setFaroConsent(true);
        await store.initFaro();

        expect(initializeFaro).toHaveBeenCalledOnce();
        expect(fakeFaro.unpause).toHaveBeenCalledOnce();
        expect(faroInstrumentations.add).not.toHaveBeenCalled();
    });

    it('is idempotent: a second grant boots nothing more', async () => {
        const store = useObservabilityStore();

        store.setFaroConsent(true);
        await store.initFaro();
        store.setFaroConsent(true);
        await store.initFaro();

        expect(initializeFaro).toHaveBeenCalledOnce();
    });

    it('pauses the transport on withdrawal and never touches the instrumentations', async () => {
        const store = useObservabilityStore();
        store.setFaroConsent(true);
        await store.initFaro();

        store.setFaroConsent(false);
        store.setFaroConsent(false);

        expect(fakeFaro.pause).toHaveBeenCalled();
        expect(faroInstrumentations.remove).not.toHaveBeenCalled();
        expect(faroInstrumentations.add).not.toHaveBeenCalled();
    });

    it('lets the transport send again when consent is given back, without booting twice', async () => {
        const store = useObservabilityStore();
        store.setFaroConsent(true);
        await store.initFaro();
        store.setFaroConsent(false);
        fakeFaro.unpause.mockClear();

        store.setFaroConsent(true);
        await store.initFaro();

        expect(fakeFaro.unpause).toHaveBeenCalledOnce();
        expect(initializeFaro).toHaveBeenCalledOnce();
    });

    it('pauses, and never unpauses, when the withdrawal lands while Faro is still loading', async () => {
        const store = useObservabilityStore();

        store.setFaroConsent(true);
        store.setFaroConsent(false);
        await store.initFaro();
        await Promise.resolve();

        expect(fakeFaro.unpause).not.toHaveBeenCalled();
        expect(fakeFaro.pause).toHaveBeenCalled();
    });

    it('is a no-op while Faro is disabled by configuration', async () => {
        vi.stubEnv('VITE_FARO_URL', '');

        expect(() => useObservabilityStore().setFaroConsent(true)).not.toThrow();
        await Promise.resolve();

        expect(initializeFaro).not.toHaveBeenCalled();
        expect(fakeFaro.unpause).not.toHaveBeenCalled();
    });
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

    /**
     * `faroInitPromise` used to be cached even on a rejection — a transient failure (a flaky
     * CDN serving either dynamic import) then refused every later `initFaro()` call for the rest
     * of the session, never retrying something that was never permanent.
     */
    it('resolves false, does not throw, and retries on the next call after a failed attempt', async () => {
        initializeFaro.mockImplementationOnce(() => {
            throw new Error('CDN unreachable');
        });
        const store = useObservabilityStore();

        await expect(store.initFaro()).resolves.toBe(false);
        expect(store.faroReady).toBe(false);

        await expect(store.initFaro()).resolves.toBe(true);
        expect(store.faroReady).toBe(true);
        expect(initializeFaro).toHaveBeenCalledTimes(2);
    });

    it('resolves false and calls nothing when no collector is configured', async () => {
        vi.stubEnv('VITE_FARO_URL', '');
        const store = useObservabilityStore();

        await expect(store.initFaro()).resolves.toBe(false);
        expect(store.faroReady).toBe(false);
        expect(initializeFaro).not.toHaveBeenCalled();
    });

    /**
     * a one-time email token (verification, password reset, account deletion, email change)
     * is the only credential for its action, and it arrives as a `?token=` query param — this is
     * what keeps it out of every event Faro ships.
     */
    it("hands the SDK this repo's own token-stripping beforeSend hook", async () => {
        const store = useObservabilityStore();
        await store.initFaro();

        expect(initializeFaro).toHaveBeenCalledWith(
            expect.objectContaining({ beforeSend: stripTokensFromTelemetry })
        );
    });
});

describe('stripSensitiveUrlParts', () => {
    it('drops the query string and fragment from an absolute URL', () => {
        expect(stripSensitiveUrlParts('https://shop.example/account/verify?token=secret#top')).toBe(
            'https://shop.example/account/verify'
        );
    });

    it('leaves a URL with neither untouched', () => {
        expect(stripSensitiveUrlParts('https://shop.example/orders')).toBe(
            'https://shop.example/orders'
        );
    });

    it('tolerates a value URL cannot parse rather than throwing', () => {
        expect(() => stripSensitiveUrlParts('not a url??token=1')).not.toThrow();
    });
});

/**
 * The minimum a `TransportItem` needs for {@link stripTokensFromTelemetry} to have anything to
 * strip. Loosely typed on purpose: a real OTLP `resourceSpans` tree is deep and this only needs a
 * few of its fields.
 */
const fakeTransportItem = (overrides: Record<string, unknown>): TransportItem =>
    ({
        type: 'exception',
        payload: {},
        meta: {},
        ...overrides
    }) as TransportItem;

describe('stripTokensFromTelemetry', () => {
    it('strips the page URL every item carries', () => {
        const result = stripTokensFromTelemetry(
            fakeTransportItem({
                meta: { page: { url: 'https://shop.example/verify?token=secret' } }
            })
        );

        expect(result.meta.page?.url).toBe('https://shop.example/verify');
    });

    it('leaves an item with no page meta alone', () => {
        expect(() => stripTokensFromTelemetry(fakeTransportItem({}))).not.toThrow();
    });

    it.each(['url.full', 'http.url'])(
        'strips a %s attribute on a trace span, at any resource/scope depth',
        (key) => {
            const result = stripTokensFromTelemetry(
                fakeTransportItem({
                    payload: {
                        resourceSpans: [
                            {
                                scopeSpans: [
                                    {
                                        spans: [
                                            {
                                                attributes: [
                                                    {
                                                        key,
                                                        value: {
                                                            stringValue:
                                                                'https://shop.example/verify?token=secret'
                                                        }
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                })
            );

            const spans = (
                result.payload as {
                    resourceSpans: {
                        scopeSpans: {
                            spans: {
                                attributes: { key: string; value: { stringValue: string } }[];
                            }[];
                        }[];
                    }[];
                }
            ).resourceSpans[0]?.scopeSpans[0]?.spans[0]?.attributes[0];

            expect(spans?.value.stringValue).toBe('https://shop.example/verify');
        }
    );

    it('leaves a trace item with no spans alone', () => {
        expect(() => stripTokensFromTelemetry(fakeTransportItem({ payload: {} }))).not.toThrow();
    });
});

/** Reads one attribute back off an event item. */
const attribute = (item: TransportItem, key: string): unknown =>
    (item.payload as { attributes: Record<string, unknown> }).attributes[key];

describe('stripTokensFromTelemetry on events', () => {
    it.each(['faro.performance.navigation', 'faro.performance.resource'])(
        'strips the timed URL a %s event carries in `name`',
        (eventName) => {
            const result = stripTokensFromTelemetry(
                fakeTransportItem({
                    type: 'event',
                    payload: {
                        name: eventName,
                        attributes: { name: 'https://shop.example/users?email=ada%40example.com#x' }
                    }
                })
            );

            expect(attribute(result, 'name')).toBe('https://shop.example/users');
        }
    );

    it('strips fromUrl and toUrl on a navigation event', () => {
        const result = stripTokensFromTelemetry(
            fakeTransportItem({
                type: 'event',
                payload: {
                    name: 'faro.navigation',
                    attributes: {
                        fromUrl: 'https://shop.example/users?email=a%40b.c',
                        toUrl: 'https://shop.example/reset#token=secret',
                        duration: '12'
                    }
                }
            })
        );

        expect(attribute(result, 'fromUrl')).toBe('https://shop.example/users');
        expect(attribute(result, 'toUrl')).toBe('https://shop.example/reset');
        expect(attribute(result, 'duration')).toBe('12');
    });

    it('leaves the `name` attribute of any other event alone: it is not necessarily a URL', () => {
        const result = stripTokensFromTelemetry(
            fakeTransportItem({
                type: 'event',
                payload: { name: 'checkout.started', attributes: { name: 'first-step' } }
            })
        );

        expect(attribute(result, 'name')).toBe('first-step');
    });

    it('tolerates an event with no attributes', () => {
        expect(() =>
            stripTokensFromTelemetry(
                fakeTransportItem({ type: 'event', payload: { name: 'faro.navigation' } })
            )
        ).not.toThrow();
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

    /**
     * every failed API call throws this shape (`onResponseReject`, `http/interceptors.ts`), and
     * this is the one case `captureException` must NOT collapse into the same unreadable,
     * ungroupable `Error: [object Object]` every other unrecognised value gets.
     */
    describe('given an API rejection envelope', () => {
        it('names the error by status, code, method and path', async () => {
            const store = useObservabilityStore();
            await store.initFaro();
            store.captureException({
                success: false,
                status: 401,
                message: 'nope',
                errors: [{ code: 'UNAUTHORIZED', message: 'nope' }],
                method: 'GET',
                path: '/account'
            });

            const [pushed] = faroApi.pushError.mock.calls[0] as [Error];
            expect(pushed.message).toBe('HTTP 401 UNAUTHORIZED GET /account');
        });

        it('omits pieces the envelope did not carry, rather than leaving gaps', async () => {
            const store = useObservabilityStore();
            await store.initFaro();
            store.captureException({ success: false, status: 0, message: 'offline', errors: [] });

            const [pushed] = faroApi.pushError.mock.calls[0] as [Error];
            expect(pushed.message).toBe('HTTP 0');
        });

        it('attaches its own correlation fields as context, merged with any hints', async () => {
            const store = useObservabilityStore();
            await store.initFaro();
            store.captureException(
                {
                    success: false,
                    status: 500,
                    message: 'boom',
                    errors: [{ code: 'INTERNAL' }],
                    requestId: 'req-1',
                    traceparent: '00-abc-def-01'
                },
                { data: { orderId: 'o1' } }
            );

            expect(faroApi.pushError).toHaveBeenCalledWith(expect.any(Error), {
                context: {
                    status: '500',
                    code: 'INTERNAL',
                    requestId: 'req-1',
                    traceparent: '00-abc-def-01',
                    orderId: 'o1'
                }
            });
        });

        /**
         * The trap this guards: `{ code: 'E' }` (already pinned above as `[object Object]`) has
         * no `status`, so it must not be misread as an envelope with a missing one.
         */
        it('does not misread an arbitrary object with a status-shaped field as an envelope', async () => {
            const store = useObservabilityStore();
            await store.initFaro();
            store.captureException({ status: 'not-a-number', code: 'E' });

            const [pushed] = faroApi.pushError.mock.calls[0] as [Error];
            expect(pushed.message).toBe('[object Object]');
        });
    });
});
