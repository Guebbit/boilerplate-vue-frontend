/**
 * @module
 * Unit tests for the SSE composable behind the observability dashboard, driven by a mocked
 * `createSseClient` rather than a real `EventSource`: what this file owns is the wiring — which
 * url is opened, which store action each event name reaches, and that the module-level singleton
 * is torn down before a second connection replaces it. The transport itself is
 * `tests/unit/infrastructure/create-sse-client.spec.ts`.
 *
 * Every case re-imports the module through `vi.resetModules()`, because `activeClient` lives at
 * module scope — see `loadComposable`: without a fresh module a test would inherit the previous
 * test's open connection and the reconnect assertions would pass for the wrong reason.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { SseClientCallbacks } from '@/infrastructure/create-sse-client';
import type { MetricsSnapshotEvent, SseEventName } from '@types';

/**
 * The fake `close` method every mocked SSE client instance shares, so calls on it can be asserted.
 */
const close = vi.fn();

/**
 * The parameters are declared even though the body ignores them: `vi.fn(() => …)` types its
 * `mock.calls` as an empty tuple, so every assertion on what the composable PASSED — the url, the
 * event names, the callbacks — would be a type error rather than a check.
 */
const createSseClient = vi.fn(
    (_url?: string, _eventNames?: readonly SseEventName[], _callbacks?: SseClientCallbacks) => ({
        close
    })
);

vi.mock('@/infrastructure/create-sse-client', () => ({
    createSseClient: (...parameters: unknown[]) =>
        createSseClient(...(parameters as Parameters<typeof createSseClient>))
}));

/**
 * Minimal payload accepted by every metrics event on the stream.
 */
const makeEvent = (timestamp: string): MetricsSnapshotEvent => ({
    timestamp,
    uptimeSeconds: 60,
    memory: { rss: 1, heapUsed: 1, heapTotal: 2, external: 0 },
    http: { totalRequests: 10, totalErrors: 0 },
    realtime: { sseClients: 1 }
});

/**
 * Imports the composable and its store fresh, so the module-level `activeClient` starts undefined.
 *
 * @returns The composable factory and the store hook from the same module graph.
 */
const loadComposable = () => {
    vi.resetModules();
    return Promise.all([
        import('@/modules/realtime/use-realtime-observability'),
        import('@/modules/realtime/store')
    ]).then(([{ useRealtimeObservability }, { useRealtimeObservabilityStore }]) => ({
        useRealtimeObservability,
        useRealtimeObservabilityStore
    }));
};

/**
 * The callbacks handed to the last `createSseClient` call.
 */
const lastCallbacks = () => createSseClient.mock.calls.at(-1)![2]!;

describe('useRealtimeObservability', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    describe('connect', () => {
        it('opens the endpoint from VITE_API_SSE, for every contract event name', () => {
            vi.stubEnv('VITE_API_SSE', 'https://api.example.com/observability/events');
            return loadComposable().then(({ useRealtimeObservability }) => {
                useRealtimeObservability().connect();

                expect(createSseClient).toHaveBeenCalledWith(
                    'https://api.example.com/observability/events',
                    [
                        'observability.heartbeat',
                        'observability.metrics.snapshot',
                        'observability.metrics.updated'
                    ],
                    expect.anything()
                );
            });
        });

        it('falls back to the local dev endpoint when VITE_API_SSE is unset', () => {
            vi.stubEnv('VITE_API_SSE', undefined);
            return loadComposable().then(({ useRealtimeObservability }) => {
                useRealtimeObservability().connect();

                expect(createSseClient.mock.calls[0]?.[0]).toBe(
                    'http://localhost:3000/observability/events'
                );
            });
        });

        it('reports connecting before the transport answers', () =>
            loadComposable().then(({ useRealtimeObservability, useRealtimeObservabilityStore }) => {
                const store = useRealtimeObservabilityStore();

                useRealtimeObservability().connect();

                expect(store.status).toBe('connecting');
            }));

        it('closes the previous client so a second connect cannot leave two streams open', () =>
            loadComposable().then(({ useRealtimeObservability }) => {
                const { connect } = useRealtimeObservability();

                connect();
                expect(close).not.toHaveBeenCalled();

                connect();
                expect(close).toHaveBeenCalledTimes(1);
                expect(createSseClient).toHaveBeenCalledTimes(2);
            }));
    });

    describe('transport callbacks', () => {
        it('reports open once the stream is established', () =>
            loadComposable().then(({ useRealtimeObservability, useRealtimeObservabilityStore }) => {
                const store = useRealtimeObservabilityStore();

                useRealtimeObservability().connect();
                lastCallbacks().onOpen?.();

                expect(store.status).toBe('open');
            }));

        it('records both the error status and a message the dashboard can show', () =>
            loadComposable().then(({ useRealtimeObservability, useRealtimeObservabilityStore }) => {
                const store = useRealtimeObservabilityStore();

                useRealtimeObservability().connect();
                lastCallbacks().onError?.(new Event('error'));

                expect(store.status).toBe('error');
                expect(store.lastError).toBe('SSE connection error');
            }));
    });

    describe('event routing', () => {
        it('sends a snapshot to setSnapshot and appends one snapshot entry', () =>
            loadComposable().then(({ useRealtimeObservability, useRealtimeObservabilityStore }) => {
                const store = useRealtimeObservabilityStore();
                const payload = makeEvent('2026-01-01T00:00:00.000Z');

                useRealtimeObservability().connect();
                lastCallbacks().onEvent?.('observability.metrics.snapshot', payload);

                expect(store.latestSnapshot).toEqual(payload);
                // The early return is what keeps a snapshot out of the heartbeat branch below it
                expect(store.latestHeartbeatAt).toBeUndefined();
                expect(store.latestUpdate).toBeUndefined();
                expect(store.entries).toEqual([
                    {
                        id: 'snapshot-2026-01-01T00:00:00.000Z',
                        kind: 'snapshot',
                        timestamp: '2026-01-01T00:00:00.000Z',
                        payload
                    }
                ]);
            }));

        it('sends an update to setUpdate and appends one update entry', () =>
            loadComposable().then(({ useRealtimeObservability, useRealtimeObservabilityStore }) => {
                const store = useRealtimeObservabilityStore();
                const payload = makeEvent('2026-01-01T00:01:00.000Z');

                useRealtimeObservability().connect();
                lastCallbacks().onEvent?.('observability.metrics.updated', payload);

                expect(store.latestUpdate).toEqual(payload);
                expect(store.latestSnapshot).toBeUndefined();
                expect(store.latestHeartbeatAt).toBeUndefined();
                expect(store.entries).toEqual([
                    {
                        id: 'update-2026-01-01T00:01:00.000Z',
                        kind: 'update',
                        timestamp: '2026-01-01T00:01:00.000Z',
                        payload
                    }
                ]);
            }));

        it('treats anything else as a heartbeat', () =>
            loadComposable().then(({ useRealtimeObservability, useRealtimeObservabilityStore }) => {
                const store = useRealtimeObservabilityStore();
                const payload = makeEvent('2026-01-01T00:02:00.000Z');

                useRealtimeObservability().connect();
                lastCallbacks().onEvent?.('observability.heartbeat', payload);

                expect(store.latestHeartbeatAt).toBe('2026-01-01T00:02:00.000Z');
                expect(store.latestSnapshot).toBeUndefined();
                expect(store.latestUpdate).toBeUndefined();
                expect(store.entries).toEqual([
                    {
                        id: 'heartbeat-2026-01-01T00:02:00.000Z',
                        kind: 'heartbeat',
                        timestamp: '2026-01-01T00:02:00.000Z',
                        payload
                    }
                ]);
            }));

        it('keeps the feed in arrival order across event kinds', () =>
            loadComposable().then(({ useRealtimeObservability, useRealtimeObservabilityStore }) => {
                const store = useRealtimeObservabilityStore();

                useRealtimeObservability().connect();
                const callbacks = lastCallbacks();
                callbacks.onEvent?.(
                    'observability.metrics.snapshot',
                    makeEvent('2026-01-01T00:00:00.000Z')
                );
                callbacks.onEvent?.(
                    'observability.heartbeat',
                    makeEvent('2026-01-01T00:00:30.000Z')
                );
                callbacks.onEvent?.(
                    'observability.metrics.updated',
                    makeEvent('2026-01-01T00:01:00.000Z')
                );

                expect(store.entries.map((entry) => entry.kind)).toEqual([
                    'snapshot',
                    'heartbeat',
                    'update'
                ]);
            }));
    });

    describe('disconnect', () => {
        it('closes the stream and reports closed', () =>
            loadComposable().then(({ useRealtimeObservability, useRealtimeObservabilityStore }) => {
                const store = useRealtimeObservabilityStore();
                const { connect, disconnect } = useRealtimeObservability();

                connect();
                disconnect();

                expect(close).toHaveBeenCalledTimes(1);
                expect(store.status).toBe('closed');
            }));

        it('is safe with no connection open, and does not close a stream twice', () =>
            loadComposable().then(({ useRealtimeObservability, useRealtimeObservabilityStore }) => {
                const store = useRealtimeObservabilityStore();
                const { connect, disconnect } = useRealtimeObservability();

                disconnect();
                expect(close).not.toHaveBeenCalled();
                expect(store.status).toBe('closed');

                connect();
                disconnect();
                disconnect();
                expect(close).toHaveBeenCalledTimes(1);
            }));

        it('reconnects after a disconnect without closing the released client again', () =>
            loadComposable().then(({ useRealtimeObservability }) => {
                const { connect, disconnect } = useRealtimeObservability();

                connect();
                disconnect();
                connect();

                expect(close).toHaveBeenCalledTimes(1);
                expect(createSseClient).toHaveBeenCalledTimes(2);
            }));
    });

    it('exposes the store state alongside the controls', () =>
        loadComposable().then(({ useRealtimeObservability, useRealtimeObservabilityStore }) => {
            const store = useRealtimeObservabilityStore();
            const { status, latestSnapshot, latestUpdate, latestHeartbeatAt, entries, lastError } =
                useRealtimeObservability();

            store.setStatus('open');
            store.setError('nope');

            expect(status.value).toBe('open');
            expect(lastError.value).toBe('nope');
            expect(latestSnapshot.value).toBeUndefined();
            expect(latestUpdate.value).toBeUndefined();
            expect(latestHeartbeatAt.value).toBeUndefined();
            expect(entries.value).toEqual([]);
        }));
});
