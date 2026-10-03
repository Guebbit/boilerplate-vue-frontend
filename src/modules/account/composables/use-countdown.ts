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

/**
 * Whole-second marks {@link useCountdownAnnouncement} speaks at — not every tick, which is what
 * floods a screen reader. `0` doubles as "expired".
 *
 * Ascending, not the 60/30/10/expired order a reader hears them in: the lookup below wants the
 * TIGHTEST mark still `>=` the current second count, which `Array#find`'s first-match semantics
 * only give straight from an ascending list — descending would match 60 for every value down to
 * 31, never reaching 30 at all.
 */
const ANNOUNCEMENT_THRESHOLDS = [0, 10, 30, 60] as const;

/**
 * A countdown's own text for a screen reader, updated only at {@link ANNOUNCEMENT_THRESHOLDS}
 * rather than every tick.
 *
 * A `role="status"` region re-rendered every second reads "expires in 299… 298… 297…"
 * continuously to anyone using one — this is meant for a SEPARATE region from the visible
 * ticking number, which stays outside any live region. Bands rather than exact hits: `secondsLeft`
 * dropping straight from 65 to 25 (a stalled tab, a GC pause skipping a tick) still announces the
 * 30s mark once, rather than staying silent because the tick that would have hit it exactly never
 * happened.
 *
 * @param secondsLeft - {@link useCountdown}'s own return, ticking every second.
 * @param message - Renders the seconds remaining into copy, e.g. "expires in {seconds}s" — called
 *  with the THRESHOLD crossed (60/30/10), not the exact second.
 * @param expiredMessage - Announced once `secondsLeft` reaches `0` — a getter, like `message`, so
 *  a locale switch mid-countdown is read at the moment it actually fires rather than captured
 *  once from whatever locale was active when this composable was set up.
 * @returns `announcement`, holding its text between threshold crossings — an emptied live region
 *  announces nothing, so the last threshold's text stays put until the next one, or forever once
 *  expired.
 */
export const useCountdownAnnouncement = (
    secondsLeft: Ref<number>,
    message: (seconds: number) => string,
    expiredMessage: () => string
) => {
    const announcement = ref<string>();

    /**
     * The threshold last announced — read alongside the watcher below so a threshold already
     * spoken is never repeated while `secondsLeft` sits inside its band.
     */
    let announcedThreshold: number | undefined;

    // `flush: 'sync'` for the same reason `useCountdown`'s own deadline watch uses it: the
    // announcement should update in step with `secondsLeft`, not one flush cycle behind it.
    watch(
        secondsLeft,
        (seconds) => {
            const threshold = ANNOUNCEMENT_THRESHOLDS.find((mark) => seconds <= mark);
            if (threshold === undefined || threshold === announcedThreshold) return;

            announcedThreshold = threshold;
            announcement.value = threshold > 0 ? message(threshold) : expiredMessage();
        },
        { immediate: true, flush: 'sync' }
    );

    return { announcement };
};
