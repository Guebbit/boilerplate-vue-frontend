import { beforeEach, describe, expect, it, vi } from 'vitest';

// Reusable EventSource mock that captures all registered listeners
class EventSourceMock {
    listeners: Record<string, Array<(event: Event) => void>> = {};

    addEventListener(eventName: string, callback: (event: Event) => void) {
        this.listeners[eventName] ??= [];
        this.listeners[eventName].push(callback);
    }

    emit(eventName: string, event: Event) {
        for (const listener of this.listeners[eventName] ?? []) listener(event);
    }

    close = vi.fn();
}

// Shared source instance; recreated before each test
let source: EventSourceMock;

beforeEach(() => {
    source = new EventSourceMock();
    vi.stubGlobal(
        'EventSource',
        vi.fn(
            class {
                constructor() {
                    return source;
                }
            }
        )
    );
    // Re-import the module so each test gets a fresh module evaluation
    vi.resetModules();
});

describe('createSseClient', () => {
    it('routes named AsyncAPI SSE events to callbacks', async () => {
        const onEvent = vi.fn();
        const { createSseClient } = await import('@/utils/createSseClient');

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
    });

    it('fires onOpen when the EventSource connection opens', async () => {
        const onOpen = vi.fn();
        const { createSseClient } = await import('@/utils/createSseClient');

        createSseClient('http://localhost:3000/observability/events', [], { onOpen });

        source.emit('open', new Event('open'));

        expect(onOpen).toHaveBeenCalledOnce();
    });

    it('fires onError when the EventSource emits an error', async () => {
        const onError = vi.fn();
        const { createSseClient } = await import('@/utils/createSseClient');

        createSseClient('http://localhost:3000/observability/events', [], { onError });

        const errorEvent = new Event('error');
        source.emit('error', errorEvent);

        expect(onError).toHaveBeenCalledWith(errorEvent);
    });

    it('closes the underlying EventSource via the returned handle', async () => {
        const { createSseClient } = await import('@/utils/createSseClient');

        const client = createSseClient('http://localhost:3000/observability/events', []);
        client.close();

        expect(source.close).toHaveBeenCalledOnce();
    });

    it('silently ignores frames with invalid JSON', async () => {
        const onEvent = vi.fn();
        const { createSseClient } = await import('@/utils/createSseClient');

        createSseClient(
            'http://localhost:3000/observability/events',
            ['observability.metrics.snapshot'],
            { onEvent }
        );

        source.emit('observability.metrics.snapshot', {
            data: 'NOT VALID JSON'
        } as MessageEvent);

        expect(onEvent).not.toHaveBeenCalled();
    });

    it('dispatches all three observability event types independently', async () => {
        const onEvent = vi.fn();
        const { createSseClient } = await import('@/utils/createSseClient');

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
        expect(onEvent).toHaveBeenNthCalledWith(2, 'observability.metrics.updated', updatedPayload);
        expect(onEvent).toHaveBeenNthCalledWith(3, 'observability.heartbeat', heartbeatPayload);
    });
});
