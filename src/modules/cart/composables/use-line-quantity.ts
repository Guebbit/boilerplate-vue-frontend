/**
 * @module
 * Cart line-quantity composable. Debounces per-product stepper clicks into one
 * trailing API call each, while a local `pending` map answers the visitor's own
 * last click so the UI never waits on the round trip.
 */
import { ref } from 'vue';
import { debounce } from 'lodash-es';
import { steppedQuantity } from '@/modules/cart/domain';

/**
 * Stepping a cart line's quantity without racing the API.
 *
 * ── The bug this exists to remove ────────────────────────────────────────────────────────────
 * The steppers used to call the store's `updateCartItem` on every click, and the store replaces
 * the whole local cart with each response. Three quick clicks on `+` therefore put three requests
 * in flight — for 2, 3 and 4 — and the cart ends up showing whichever one the server happened to
 * answer LAST. Nothing about the ordering was ever guaranteed, so the wrong number appeared only
 * under a slow connection, which is the one place it matters and the one place nobody looks.
 *
 * Debouncing fixes it by removing the concurrency rather than trying to order it: the clicks
 * accumulate locally and exactly one request goes out, carrying the number the visitor stopped on.
 * Per product, because two lines stepped in the same breath are two independent changes and must
 * not cancel each other.
 *
 * ── Why the visitor cannot feel the delay ────────────────────────────────────────────────────
 * `quantityOf` answers the pending number while one is outstanding, so the figure on screen
 * follows the click and not the round trip. Without that half, debouncing would just be latency.
 *
 * @param update - Sends the new quantity. The store's `updateCartItem`.
 * @param onError - Reports a failed send. The view's toast.
 * @param delayMs - How long a line's clicks accumulate before the request goes out.
 * @returns The line-quantity API the view binds to.
 */
export const useLineQuantity = (
    update: (productId: string, quantity: number) => Promise<unknown>,
    onError: (error: unknown) => void,
    delayMs = 400
) => {
    /**
     * Quantities the visitor has stepped to and the API has not been told about yet.
     */
    const pending = ref<Partial<Record<string, number>>>({});

    /**
     * The debounced senders, one per product, created on first use and kept for the page's life.
     *
     * A plain `Map` rather than a ref: nothing renders from it, and a reactive one would re-render
     * every line each time a timer was created.
     */
    const senders = new Map<string, ReturnType<typeof debounce<() => void>>>();

    /**
     * Drops a line's pending entry without touching its timer.
     */
    const forgetPending = (productId: string) => {
        const { [productId]: _sent, ...rest } = pending.value;
        pending.value = rest;
    };

    /**
     * @param productId - The line.
     * @param stored - The quantity the store currently holds for it.
     * @returns What the line should display: the visitor's own last click while one is
     *  outstanding, the server's number the rest of the time.
     */
    const quantityOf = (productId: string, stored: number) => pending.value[productId] ?? stored;

    /**
     * @param productId - The line to send.
     * @returns That line's debounced sender.
     */
    const senderFor = (productId: string) => {
        const existing = senders.get(productId);
        if (existing) return existing;

        const send = debounce(() => {
            const quantity = pending.value[productId];
            if (quantity === undefined) return;
            update(productId, quantity)
                .catch(onError)
                .finally(() => {
                    /*
                     * Only if it has not been superseded. A click made WHILE the request was in
                     * flight left a newer number here, and clearing unconditionally would drop it
                     * — the debounce losing the very data it was added to protect.
                     */
                    if (pending.value[productId] === quantity) forgetPending(productId);
                });
        }, delayMs);

        senders.set(productId, send);
        return send;
    };

    /**
     * Moves one line by one step: on screen now, at the API shortly.
     *
     * @param productId - The line.
     * @param stored - The quantity the store currently holds for it.
     * @param step - `1` or `-1`.
     */
    const stepQuantity = (productId: string, stored: number, step: number) => {
        const next = steppedQuantity(quantityOf(productId, stored), step);
        pending.value = { ...pending.value, [productId]: next };
        senderFor(productId)();
    };

    /**
     * Forgets a line entirely, pending step and all.
     *
     * Called before a removal: a queued quantity for a line that no longer exists would fire after
     * the removal and put the line back.
     *
     * @param productId - The line being removed.
     */
    const forget = (productId: string) => {
        senders.get(productId)?.cancel();
        forgetPending(productId);
    };

    /**
     * Sends every outstanding step immediately. For unmount — FLUSH, never cancel.
     *
     * A step the visitor made and then navigated away from is a change they asked for and expect
     * to find when they come back; dropping it because the timer had 200ms left would be the
     * debounce losing data, which is the one thing it must never do.
     */
    const flushPending = () => {
        for (const send of senders.values()) send.flush();
    };

    return { quantityOf, stepQuantity, forget, flushPending };
};
