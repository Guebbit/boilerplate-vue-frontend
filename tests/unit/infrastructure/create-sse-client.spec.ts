import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Reusable EventSource mock that captures all registered listeners
class EventSourceMock {
    listeners: Record<string, ((event: Event) => void)[]> = {};

    addEventListener(eventName: string, callback: (event: Event) => void) {
        this.listeners[eventName] ??= [];
        this.listeners[eventName].push(callback);
    }

    emit(eventName: string, event: Event) {
        for (const listener of this.listeners[eventName] ?? []) listener(event);
    }

    readyState = 0;

    close = vi.fn();
}

// The latest source the client opened; each construction makes a new one
let source: EventSourceMock;

beforeEach(() => {
    source = new EventSourceMock();
    vi.stubGlobal(
        'EventSource',
        vi.fn(
            // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- the class body IS the mock: EventSource is constructed, never called
            class {
                constructor() {
                    // A new connection each time, as the browser makes one: the latest is `source`.
                    source = new EventSourceMock();
                    return source;
                }
            }
        )
    );
    // Re-import the module so each test gets a fresh module evaluation
    vi.resetModules();
});

/**
 * Fires an error on the current source, as the browser does when it closes it for good.
 */
const closeForGood = () => {
    source.readyState = 2;
    source.emit('error', new Event('error'));
};

describe('createSseClient', () => {
    it('routes named AsyncAPI SSE events to callbacks', () =>
        import('@/infrastructure/create-sse-client').then(({ createSseClient }) => {
            const onEvent = vi.fn();

            createSseClient(
                'http://localhost:3000/observability/events',
                [
                    'observability.metrics.snapshot',
                    'observability.metrics.updated',
                    'observability.heartbeat'
                ],
                { onEvent }
            );

            source.emit('observability.metrics.snapshot', {
                data: JSON.stringify({ timestamp: '2026-01-01T00:00:00.000Z' })
            } as MessageEvent);

            expect(onEvent).toHaveBeenCalledWith('observability.metrics.snapshot', {
                timestamp: '2026-01-01T00:00:00.000Z'
            });
        }));

    it('fires onOpen when the EventSource connection opens', () =>
        import('@/infrastructure/create-sse-client').then(({ createSseClient }) => {
            const onOpen = vi.fn();

            createSseClient('http://localhost:3000/observability/events', [], { onOpen });

            source.emit('open', new Event('open'));

            expect(onOpen).toHaveBeenCalledOnce();
        }));

    it('fires onError when the EventSource emits an error', () =>
        import('@/infrastructure/create-sse-client').then(({ createSseClient }) => {
            const onError = vi.fn();

            createSseClient('http://localhost:3000/observability/events', [], { onError });

            const errorEvent = new Event('error');
            source.emit('error', errorEvent);

            expect(onError).toHaveBeenCalledWith(errorEvent);
        }));

    it('closes the underlying EventSource via the returned handle', () =>
        import('@/infrastructure/create-sse-client').then(({ createSseClient }) => {
            const client = createSseClient('http://localhost:3000/observability/events', []);
            client.close();

            expect(source.close).toHaveBeenCalledOnce();
        }));

    it('silently ignores frames with invalid JSON', () =>
        import('@/infrastructure/create-sse-client').then(({ createSseClient }) => {
            const onEvent = vi.fn();

            createSseClient(
                'http://localhost:3000/observability/events',
                ['observability.metrics.snapshot'],
                { onEvent }
            );

            source.emit('observability.metrics.snapshot', {
                data: 'NOT VALID JSON'
            } as MessageEvent);

            expect(onEvent).not.toHaveBeenCalled();
        }));

    it('dispatches all three observability event types independently', () =>
        import('@/infrastructure/create-sse-client').then(({ createSseClient }) => {
            const onEvent = vi.fn();

            createSseClient(
                'http://localhost:3000/observability/events',
                [
                    'observability.metrics.snapshot',
                    'observability.metrics.updated',
                    'observability.heartbeat'
                ],
                { onEvent }
            );

            const snapshotPayload = { timestamp: '2026-01-01T00:00:00.000Z' };
            const updatedPayload = { timestamp: '2026-01-01T00:01:00.000Z' };
            const heartbeatPayload = { timestamp: '2026-01-01T00:02:00.000Z' };

            source.emit('observability.metrics.snapshot', {
                data: JSON.stringify(snapshotPayload)
            } as MessageEvent);
            source.emit('observability.metrics.updated', {
                data: JSON.stringify(updatedPayload)
            } as MessageEvent);
            source.emit('observability.heartbeat', {
                data: JSON.stringify(heartbeatPayload)
            } as MessageEvent);

            expect(onEvent).toHaveBeenCalledTimes(3);
            expect(onEvent).toHaveBeenNthCalledWith(
                1,
                'observability.metrics.snapshot',
                snapshotPayload
            );
            expect(onEvent).toHaveBeenNthCalledWith(
                2,
                'observability.metrics.updated',
                updatedPayload
            );
            expect(onEvent).toHaveBeenNthCalledWith(3, 'observability.heartbeat', heartbeatPayload);
        }));

    /**
     * With the contract gate on — `VITE_VALIDATE_RESPONSES=true`, what the e2e build sets — a frame
     * is held to the AsyncAPI payload its event declares, the SSE twin of `orvalMutator`'s check.
     */
    describe('with contract validation on', () => {
        /** A metrics payload exactly as `asyncapi.yaml` declares it. */
        const VALID_METRICS = {
            timestamp: '2026-01-01T00:00:00.000Z',
            uptimeSeconds: 12,
            memory: { rss: 1, heapUsed: 1, heapTotal: 2, external: 0 },
            http: { totalRequests: 3, totalErrors: 0 },
            realtime: { sseClients: 1 }
        };

        beforeEach(() => {
            vi.stubEnv('VITE_VALIDATE_RESPONSES', 'true');
        });

        afterEach(() => {
            vi.unstubAllEnvs();
        });

        it('forwards a frame that matches its event contract', () =>
            import('@/infrastructure/create-sse-client').then(({ createSseClient }) => {
                const onEvent = vi.fn();
                createSseClient('/observability/events', ['observability.heartbeat'], { onEvent });

                source.emit('observability.heartbeat', {
                    data: JSON.stringify(VALID_METRICS)
                } as MessageEvent);

                expect(onEvent).toHaveBeenCalledWith('observability.heartbeat', VALID_METRICS);
            }));

        it('drops a frame that breaks it, and says which field', () =>
            Promise.all([
                import('@/infrastructure/create-sse-client'),
                import('@/infrastructure/utils/logger.ts')
            ]).then(([{ createSseClient }, { logger }]) => {
                const logged = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
                const onEvent = vi.fn();
                createSseClient('/observability/events', ['observability.heartbeat'], { onEvent });

                source.emit('observability.heartbeat', {
                    data: JSON.stringify({ ...VALID_METRICS, uptimeSeconds: 'soon' })
                } as MessageEvent);

                expect(onEvent).not.toHaveBeenCalled();
                expect(logged).toHaveBeenCalledWith(expect.stringContaining('uptimeSeconds'));
            }));

        it('logs a frame that breaks it but forwards it in production, as REST does', () =>
            Promise.all([
                import('@/infrastructure/create-sse-client'),
                import('@/infrastructure/utils/logger.ts')
            ]).then(([{ createSseClient }, { logger }]) => {
                vi.stubEnv('PROD', true);
                const logged = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
                const onEvent = vi.fn();
                createSseClient('/observability/events', ['observability.heartbeat'], { onEvent });
                const frame = { ...VALID_METRICS, uptimeSeconds: 'soon' };

                source.emit('observability.heartbeat', {
                    data: JSON.stringify(frame)
                } as MessageEvent);

                expect(logged).toHaveBeenCalledWith(expect.stringContaining('uptimeSeconds'));
                expect(onEvent).toHaveBeenCalledWith('observability.heartbeat', frame);
            }));
    });

    /**
     * The browser retries a dropped connection by itself, but a source it has CLOSED (a refused
     * reconnect) stays closed: the client opens a new one after a growing wait.
     */
    describe('when the browser gives up on the connection', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('opens a new source after 1 s, then 2 s, then 4 s', () =>
            import('@/infrastructure/create-sse-client').then(({ createSseClient }) => {
                createSseClient('/notifications/stream', []);
                expect(EventSource).toHaveBeenCalledTimes(1);

                closeForGood();
                vi.advanceTimersByTime(999);
                expect(EventSource).toHaveBeenCalledTimes(1);
                vi.advanceTimersByTime(1);
                expect(EventSource).toHaveBeenCalledTimes(2);

                closeForGood();
                vi.advanceTimersByTime(1999);
                expect(EventSource).toHaveBeenCalledTimes(2);
                vi.advanceTimersByTime(1);
                expect(EventSource).toHaveBeenCalledTimes(3);

                closeForGood();
                vi.advanceTimersByTime(4000);
                expect(EventSource).toHaveBeenCalledTimes(4);
            }));

        it('starts the waits again once a connection opens', () =>
            import('@/infrastructure/create-sse-client').then(({ createSseClient }) => {
                createSseClient('/notifications/stream', []);
                closeForGood();
                vi.advanceTimersByTime(1000);
                closeForGood();
                vi.advanceTimersByTime(2000);

                source.emit('open', new Event('open'));
                closeForGood();
                vi.advanceTimersByTime(1000);

                expect(EventSource).toHaveBeenCalledTimes(4);
            }));

        it('stays at the longest wait', () =>
            import('@/infrastructure/create-sse-client').then(({ createSseClient }) => {
                createSseClient('/notifications/stream', []);
                for (let attempt = 0; attempt < 8; attempt += 1) {
                    closeForGood();
                    vi.advanceTimersByTime(30_000);
                }

                expect(EventSource).toHaveBeenCalledTimes(9);
            }));

        it('does nothing for an error on a source the browser is still retrying', () =>
            import('@/infrastructure/create-sse-client').then(({ createSseClient }) => {
                createSseClient('/notifications/stream', []);

                source.readyState = 0;
                source.emit('error', new Event('error'));
                vi.advanceTimersByTime(60_000);

                expect(EventSource).toHaveBeenCalledTimes(1);
            }));

        it('opens nothing once the caller has closed the client', () =>
            import('@/infrastructure/create-sse-client').then(({ createSseClient }) => {
                const client = createSseClient('/notifications/stream', []);
                closeForGood();

                client.close();
                vi.advanceTimersByTime(60_000);

                expect(EventSource).toHaveBeenCalledTimes(1);
                expect(source.close).toHaveBeenCalled();
            }));
    });
});
