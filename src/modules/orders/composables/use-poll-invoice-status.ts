/**
 * @module
 * Polls the order detail endpoint while its invoice PDF is still generating, so the download
 * button's disabled/loading state clears on its own once the async worker finishes — without a
 * manual page reload. Mirrors `use-order-actions-refetch.ts`'s shape (a `watch` over the store's
 * cached record, forced re-fetches past the cache), but runs on an interval instead of once, and
 * gives up after a cap rather than polling a stuck job forever.
 */
import { onScopeDispose, ref, watch } from 'vue';
import type { Ref } from 'vue';
import type { Order } from '@types';

/**
 * How often to re-check, in ms. The worker is CPU-bound (Puppeteer) and typically finishes in low
 * seconds — polling faster would only add load for no real gain in perceived latency.
 */
const POLL_INTERVAL_MS = 5000;

/**
 * How many ticks to poll before giving up — 2 minutes at {@link POLL_INTERVAL_MS}. Well past the
 * worker's typical low-second finish; past this, something is actually stuck, and a spinner that
 * never resolves is worse than telling the visitor to check back.
 */
const MAX_POLL_ATTEMPTS = 24;

/**
 * Starts an interval that re-fetches the routed order, past its cache, for as long as its
 * `invoicePdfStatus` reads `pending` — and stops the moment it doesn't, whether because the
 * worker finished, the route moved to a different order, the component unmounted, or the attempt
 * cap was reached.
 *
 * @param currentOrder - The store's cache-first record for the routed id.
 * @param targetId - The routed order id, read reactively so a navigation retargets polling.
 * @param fetchOrder - The store's fetch action, called with `{ forced: true }` to bypass the cache.
 * @returns A ref, true once the cap was reached without the status ever clearing — the caller's
 *  cue to stop showing a spinner and say so instead.
 */
export const usePollInvoiceStatus = (
    currentOrder: Ref<Order | undefined>,
    targetId: () => string | undefined,
    fetchOrder: (id: string, settings: { forced: boolean }) => Promise<Order | undefined>
): Ref<boolean> => {
    /**
     * Handle for the running poll; `undefined` while nothing is polling.
     */
    let handle: ReturnType<typeof setInterval> | undefined;

    /**
     * Which order `handle` is currently polling — distinct from `handle` itself, so a navigation
     * to a second, ALSO-pending order is told apart from the first poll's own re-fetch answer
     * re-triggering this watcher on the SAME order.
     */
    let polledId: string | undefined;

    /**
     * Ticks elapsed on the current poll — reset whenever a poll (re)starts.
     */
    let attempts = 0;

    /**
     * True once {@link MAX_POLL_ATTEMPTS} passed with the status still pending.
     */
    const gaveUp = ref(false);

    /**
     * Stops the poll. Idempotent — called whenever the watched condition turns false, and on
     * scope disposal.
     */
    const stop = () => {
        if (handle) clearInterval(handle);
        handle = undefined;
        polledId = undefined;
        attempts = 0;
    };

    watch(
        currentOrder,
        (order) => {
            const stillPending =
                order !== undefined &&
                order.id === targetId() &&
                order.invoicePdfStatus === 'pending';

            if (!stillPending) {
                stop();
                gaveUp.value = false;
                return;
            }
            // Already polling this same order — the interval's own answer re-triggers this
            // watcher, and a second `setInterval` here would double the request rate. A DIFFERENT
            // pending order (a navigation) falls through and restarts the poll against it.
            if (handle && polledId === order.id) return;
            stop();
            gaveUp.value = false;

            const { id } = order;
            polledId = id;
            handle = setInterval(() => {
                attempts += 1;
                if (attempts >= MAX_POLL_ATTEMPTS) {
                    stop();
                    gaveUp.value = true;
                    return;
                }
                void fetchOrder(id, { forced: true });
            }, POLL_INTERVAL_MS);
        },
        { immediate: true }
    );

    onScopeDispose(stop);

    return gaveUp;
};
