import { storeToRefs } from 'pinia';
import { useRealtimeObservabilityStore } from '@/stores/realtimeObservability';
import { createSseClient } from '@/utils/createSseClient';
import { REALTIME_SSE_EVENT_NAMES } from '@types';

/**
 * Module-level singleton: only one SSE connection is active at a time regardless
 * of how many component instances call the composable.
 */
let activeClient: ReturnType<typeof createSseClient> | undefined;

/** Resolves the SSE endpoint URL from env, falling back to the local dev server. */
const getSseUrl = () =>
    import.meta.env.VITE_API_SSE ?? 'http://localhost:3000/observability/events';

/**
 * Composable that manages the SSE connection for the observability dashboard.
 * Exposes reactive store refs alongside `connect` / `disconnect` controls.
 *
 * Uses a module-level `activeClient` singleton so re-mounting the component
 * does not open duplicate streams.
 */
export const useRealtimeObservability = () => {
    const store = useRealtimeObservabilityStore();

    /**
     * Opens (or replaces) the SSE connection.
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
                    return;
                }

                if (eventName === 'observability.metrics.updated') {
                    store.setUpdate(payload);
                    return;
                }

                store.setHeartbeat(payload);
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
