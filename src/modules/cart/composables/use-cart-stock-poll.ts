/**
 * @module
 * Re-reads `GET /cart` on a timer while the cart page is open, so the per-line `availability`
 * flag follows the shelf. Opt-in: with `VITE_CART_STOCK_POLL_SECONDS` unset, `0` or invalid it
 * registers nothing at all, no timer and no listener. Called from the page's setup, so "the page
 * is open" is the composable's own lifetime; the checkout is the same page. See
 * `docs/modules/cart.md`.
 *
 * Runs only while all of these hold, and stops for good once the person changes:
 *
 * - someone is signed in (a guest cart has no server copy to read);
 * - the tab is visible (a hidden tab re-reads once when it becomes visible again);
 * - the signed-in person is still the one who opened the page.
 *
 * What a tick may do is the store's rule ({@link useCartStore}'s `pollCart`): it yields to any
 * write in flight and drops an answer a fresher call has overtaken.
 */
import { computed, onScopeDispose, ref, watch } from 'vue';
import { runtimeValue } from '@/infrastructure/runtime-config';
import { useSessionStore } from '@/infrastructure/session.ts';
import { debug } from '@/infrastructure/utils/logger.ts';
import { stockPollIntervalMs } from '../domain';
import { useCartStore } from '../store';

/**
 * Whether the tab is showing.
 * https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState
 *
 * @returns `false` only for a tab the browser reports as hidden.
 */
const isTabVisible = (): boolean => document.visibilityState !== 'hidden';

/**
 * Starts the cart's stock poll for the lifetime of the calling scope (a component's setup).
 * Does nothing when the knob says "no polling".
 */
export const useCartStockPoll = (): void => {
    // The knob: a container's `config.js` first, the build's `.env` second, as every deployment value.
    const intervalMs = stockPollIntervalMs(
        runtimeValue('CART_STOCK_POLL_SECONDS') ?? import.meta.env.VITE_CART_STOCK_POLL_SECONDS
    );
    if (intervalMs === undefined) return;

    const cartStore = useCartStore();
    const session = useSessionStore();

    /**
     * Who opened the page. `undefined` for a guest, who is never polled.
     */
    const owner = session.viewer?.id;

    /**
     * Whether the person on screen is still the one who opened the page.
     */
    const stillOwner = computed(
        () => owner !== undefined && session.isAuth && session.viewer?.id === owner
    );

    /**
     * Set once the owner signs out or another account takes the tab: the poll never comes back.
     */
    const ended = ref(false);

    // Vue `watch`: latches the first time the owner is gone, so a later switch back does not resume it.
    // https://vuejs.org/api/reactivity-core.html#watch
    watch(stillOwner, (still) => {
        if (!still) ended.value = true;
    });

    /**
     * Whether the tab is showing, kept current by the browser's `visibilitychange` event.
     */
    const visible = ref(isTabVisible());

    /**
     * Follows the tab hiding and showing.
     * https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event
     */
    const onVisibilityChange = () => {
        visible.value = isTabVisible();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    /**
     * The running interval, if any.
     */
    let timer: ReturnType<typeof setInterval> | undefined;

    /**
     * One read. A failure is not worth a message: the next tick tries again.
     */
    const tick = () => {
        cartStore.pollCart().catch((error: unknown) => {
            debug('http', 'cart stock poll failed, retrying at the next tick', error);
        });
    };

    /**
     * Stops the interval.
     */
    const stop = () => {
        if (timer !== undefined) clearInterval(timer);
        timer = undefined;
    };

    // Vue `watch`: starts or stops the interval as the conditions change. `immediate` starts it
    // for a page that opens ready; the page has just read the cart, so that start reads nothing.
    // Coming back from hidden is the one start that does, since the tab may have missed a lot.
    // https://vuejs.org/api/reactivity-core.html#watch
    watch(
        () => stillOwner.value && !ended.value && visible.value,
        (running, wasRunning) => {
            stop();
            if (!running) return;
            // setInterval: calls `tick` every `intervalMs` milliseconds until cleared.
            // https://developer.mozilla.org/en-US/docs/Web/API/Window/setInterval
            timer = setInterval(tick, intervalMs);
            if (wasRunning === false) tick();
        },
        { immediate: true }
    );

    onScopeDispose(() => {
        stop();
        document.removeEventListener('visibilitychange', onVisibilityChange);
    });
};
