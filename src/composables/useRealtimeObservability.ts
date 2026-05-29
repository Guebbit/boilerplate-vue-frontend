import { storeToRefs } from 'pinia';
import { useRealtimeObservabilityStore } from '@/stores/realtimeObservability';
import { createSseClient } from '@/realtime/sse/createSseClient';
import { REALTIME_SSE_EVENT_NAMES } from '@types';

let activeClient: ReturnType<typeof createSseClient> | undefined;

const resolveSseUrl = () => import.meta.env.VITE_API_SSE ?? 'http://localhost:3000/observability/events';

export const useRealtimeObservability = () => {
    const store = useRealtimeObservabilityStore();

    const connect = () => {
        activeClient?.close();
        store.setStatus('connecting');

        activeClient = createSseClient(resolveSseUrl(), REALTIME_SSE_EVENT_NAMES, {
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
