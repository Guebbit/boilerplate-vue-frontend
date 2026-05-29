import { describe, expect, it, vi } from 'vitest';

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

describe('createSseClient', () => {
    it('routes named AsyncAPI SSE events to callbacks', async () => {
        const source = new EventSourceMock();
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

        const onEvent = vi.fn();
        const { createSseClient } = await import('@/utils/createSseClient');

        createSseClient(
            'http://localhost:3000/observability/events',
            [
                'observability.metrics.snapshot',
                'observability.metrics.updated',
                'observability.heartbeat'
            ],
            {
                onEvent
            }
        );

        source.emit('observability.metrics.snapshot', {
            data: JSON.stringify({ timestamp: '2026-01-01T00:00:00.000Z' })
        } as MessageEvent);

        expect(onEvent).toHaveBeenCalledWith('observability.metrics.snapshot', {
            timestamp: '2026-01-01T00:00:00.000Z'
        });
    });
});
