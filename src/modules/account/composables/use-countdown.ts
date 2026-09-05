/**
 * @module
 * One ticking "seconds left" primitive, and the ISO-timestamp spelling of it. A `setInterval`
 * refreshes a `now` ref while a deadline is set, and the countdown is derived from it — so the
 * number always comes from the SERVER's own deadline, never from a client-guessed duration, and
 * the interval exists only while something is actually counting.
 *
 * Used by the login challenge, an enrollment's delivered code, and the store-owned resend
 * cooldown alike: they differ only in where the deadline comes from.
 */
import { computed, onScopeDispose, ref, watch } from 'vue';
import type { Ref } from 'vue';

/**
 * Counts down to an epoch-millisecond deadline.
 *
 * @param deadline - When the countdown reaches zero, in epoch ms; `undefined` to run nothing.
 *  Reactive, so a fresh deadline restarts the tick on its own.
 * @returns `secondsLeft`, ticking once a second down to `0` and stopping there.
 */
export const useCountdown = (deadline: Ref<number | undefined>) => {
    /**
     * Refreshed by the tick below; the only reactive input {@link secondsLeft} has besides the
     * deadline itself.
     */
    const now = ref(Date.now());

    /**
     * Handle for the running tick; `undefined` while nothing is counting down.
     */
    let handle: ReturnType<typeof setInterval> | undefined;

    /**
     * Stops the tick. Idempotent — called on a fresh deadline, on zero, and on scope disposal.
     */
    const stop = () => {
        if (handle) clearInterval(handle);
        handle = undefined;
    };

    // `now` is refreshed the moment a deadline is set, not once the first interval fires a second
    // later — otherwise the first reads count down from whenever this scope was created, which
    // for a long-lived store is minutes of drift. `flush: 'sync'` is what makes "the moment"
    // literal: a default watcher would leave one flush cycle reading the stale `now`.
    watch(
        deadline,
        (value) => {
            stop();
            if (value === undefined) return;
            now.value = Date.now();
            handle = setInterval(() => {
                now.value = Date.now();
            }, 1000);
        },
        { immediate: true, flush: 'sync' }
    );

    onScopeDispose(stop);

    /**
     * Whole seconds until the deadline, `0` once it has passed or while there is none.
     */
    const secondsLeft = computed(() => {
        if (deadline.value === undefined) return 0;
        const remaining = Math.ceil((deadline.value - now.value) / 1000);
        if (remaining <= 0) {
            stop();
            return 0;
        }
        return remaining;
    });

    return { secondsLeft };
};

/**
 * {@link useCountdown} for the ISO timestamps the API sends — a challenge's `expiresAt`, a
 * delivered code's own.
 *
 * @param expiresAt - The deadline as the server spelled it, reactive.
 * @returns `secondsLeft`, exactly as {@link useCountdown} returns it.
 */
export const useExpiryCountdown = (expiresAt: Ref<string | undefined>) =>
    useCountdown(computed(() => (expiresAt.value ? Date.parse(expiresAt.value) : undefined)));
