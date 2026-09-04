/**
 * @module
 * Ticking "seconds left" reactive value for an ISO timestamp the server sent — the login
 * challenge's `expiresAt`, an enrollment's delivered `expiresAt`. Counts down from what the
 * server said, never a client-guessed duration.
 */
import { computed, onScopeDispose, ref, watch } from 'vue';
import type { Ref } from 'vue';

/**
 * @param expiresAt - The deadline to count down to, reactive so a fresh challenge/delivery
 *  restarts the countdown automatically.
 * @returns `secondsLeft`, ticking once a second down to `0` and stopping there.
 */
export const useExpiryCountdown = (expiresAt: Ref<string | undefined>) => {
    const now = ref(Date.now());
    let handle: ReturnType<typeof setInterval> | undefined;

    const stop = () => {
        if (handle) clearInterval(handle);
        handle = undefined;
    };

    watch(
        expiresAt,
        (value) => {
            stop();
            if (!value) return;
            now.value = Date.now();
            handle = setInterval(() => {
                now.value = Date.now();
            }, 1000);
        },
        { immediate: true }
    );

    onScopeDispose(stop);

    const secondsLeft = computed(() => {
        if (!expiresAt.value) return 0;
        const remaining = Math.ceil((new Date(expiresAt.value).getTime() - now.value) / 1000);
        if (remaining <= 0) {
            stop();
            return 0;
        }
        return remaining;
    });

    return { secondsLeft };
};
