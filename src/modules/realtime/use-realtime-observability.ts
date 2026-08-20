import { storeToRefs } from 'pinia';
import { useRealtimeObservabilityStore } from '@/modules/realtime/store';
import { createSseClient } from '@/infrastructure/create-sse-client';
import { REALTIME_SSE_EVENT_NAMES } from '@types';

/**
 * Module-level singleton: only one SSE connection is active at a time regardless
 * of how many component instances call the composable.
 */
let activeClient: ReturnType<typeof createSseClient> | undefined;

/**
 * Resolves the SSE endpoint URL.
 *
 * @returns `VITE_API_SSE`, or the local dev server endpoint when unset.
 */
const getSseUrl = () =>
    import.meta.env.VITE_API_SSE ?? 'http://localhost:3000/observability/events';

/**
 * Manages the SSE connection feeding the observability dashboard.
 *
 * Uses a module-level `activeClient` singleton so re-mounting the component does
 * not open duplicate streams.
 *
 * @returns The realtime store refs (status, latest payloads, feed, last error)
 *  plus `connect`/`disconnect` controls.
 */
export const useRealtimeObservability = () => {
    const store = useRealtimeObservabilityStore();

    /**
     * Opens (or replaces) the SSE connection, routing each metrics event to its
     * store action and appending it to the feed.
     *
     * Tears down any existing client first to avoid duplicate streams.
     */
    const connect = () => {
        activeClient?.close();
        store.setStatus('connecting');

        // Create the SSE client and wire each metric event type to its store action
        activeClient = createSseClient(getSseUrl(), REALTIME_SSE_EVENT_NAMES, {
            onOpen: () => store.setStatus('open'),
            onError: () => {
                store.setStatus('error');
                store.setError('SSE connection error');
            },
            onEvent: (eventName, payload) => {
                if (eventName === 'observability.metrics.snapshot') {
                    store.setSnapshot(payload);
                    store.addEntry({
                        id: `snapshot-${payload.timestamp}`,
                        kind: 'snapshot',
                        timestamp: payload.timestamp,
                        payload
                    });
                    return;
                }

                if (eventName === 'observability.metrics.updated') {
                    store.setUpdate(payload);
                    store.addEntry({
                        id: `update-${payload.timestamp}`,
                        kind: 'update',
                        timestamp: payload.timestamp,
                        payload
                    });
                    return;
                }

                store.setHeartbeat(payload);
                store.addEntry({
                    id: `heartbeat-${payload.timestamp}`,
                    kind: 'heartbeat',
                    timestamp: payload.timestamp,
                    payload
                });
            }
        });
    };

    /**
     * Closes the active SSE connection and resets the store status to `closed`.
     * Safe to call even when no connection is open.
     */
    const disconnect = () => {
        activeClient?.close();
        activeClient = undefined;
        store.setStatus('closed');
    };

    return {
        ...storeToRefs(store),
        connect,
        disconnect
    };
};
