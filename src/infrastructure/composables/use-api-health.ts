import { onMounted, onUnmounted, ref } from 'vue';
import { getHealth } from '@api';

/**
 * Watches whether the API answers its public liveness ping, `GET /`.
 *
 * The ping's own contract names this consumer: "a client that has just failed to reach the API is
 * exactly who needs it". One probe at mount, one on every browser `online` event, and a slow retry
 * loop only WHILE down — a healthy API is never polled twice.
 *
 * Infrastructure rather than any module's, because reachability is a property of the transport
 * every domain shares — the same reason the axios client and the SSE wrapper live down here.
 *
 * @returns `down` — true while the last probe failed.
 */
export const useApiHealth = () => {
    const down = ref(false);

    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const probe = (): Promise<void> =>
        getHealth()
            .then(() => {
                down.value = false;
            })
            .catch(() => {
                down.value = true;
                // Retry only while down, and slowly — this is a banner, not a monitor.
                retryTimer = setTimeout(() => void probe(), 30_000);
            });

    const handleOnline = () => void probe();

    onMounted(() => {
        void probe();
        globalThis.addEventListener('online', handleOnline);
    });

    onUnmounted(() => {
        globalThis.removeEventListener('online', handleOnline);
        if (retryTimer) clearTimeout(retryTimer);
    });

    return { down };
};
