/**
 * @module
 * Composable managing a module-level singleton SSE connection: `connect` opens it and routes each
 * typed event to the paired store's actions, `disconnect` tears it down. The singleton lives
 * outside the composable's closure so re-mounting the consuming component never opens a second
 * stream.
 */
import { storeToRefs } from 'pinia';
import { useRealtimeObservabilityStore } from '@/modules/realtime/store';
import { createSseClient } from '@/infrastructure/create-sse-client';
import { instance } from '@/infrastructure/http/client';
import { runtimeValue } from '@/infrastructure/runtime-config';
import { REALTIME_SSE_EVENT_NAMES } from '@types';

/**
 * Module-level singleton: only one SSE connection is active at a time regardless
 * of how many component instances call the composable.
 */
let activeClient: ReturnType<typeof createSseClient> | undefined;

/**
 * Where the stream is opened, in priority order:
 *
 * 1. A runtime `API_SSE` override (a container's `config.js`) — explicit, always wins.
 * 2. A runtime-overridden `API_URL` — the e2e shard runner, or a container with no `API_SSE` of
 *    its own — derives from `client.ts`'s own resolved `baseURL` for that SAME override. One
 *    built bundle serves many backends here, and a build-time `VITE_API_SSE` cannot know which;
 *    checking this before it is what lets each e2e shard reach its own demo backend's stream.
 * 3. `VITE_API_SSE`, the build-time default for a deployment with no runtime override at all.
 * 4. Derived from the (build-time) REST base — never a hardcoded fallback, so an empty value
 *    never opens an `EventSource` against the page itself.
 *
 * @returns The absolute SSE endpoint URL.
 */
const sseEndpoint = (): string => {
    const runtimeOverride = runtimeValue('API_SSE');
    if (runtimeOverride) return runtimeOverride;

    if (runtimeValue('API_URL')) return `${instance.defaults.baseURL}/observability/events`;

    return import.meta.env.VITE_API_SSE || `${instance.defaults.baseURL}/observability/events`;
};

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
    /**
     * The realtime store, which owns the connection and the capped feed this composable reads.
     */
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

        // Wire each metric event type to its store action.
        activeClient = createSseClient(sseEndpoint(), REALTIME_SSE_EVENT_NAMES, {
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
