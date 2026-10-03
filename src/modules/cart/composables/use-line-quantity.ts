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
 * Calling the store's `updateCartItem` on every click races itself: the store replaces the whole
 * local cart with each response, so three quick clicks on `+` put three requests in flight — for
 * 2, 3 and 4 — and the cart shows whichever the server answers LAST. Nothing orders those
 * responses, so the wrong number appears only under a slow connection, which is the one place it
 * matters and the one place nobody looks.
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
     * The request a line's debounced sender currently has in flight, if any — what
     * {@link settle} awaits after flushing. `flushPending` alone fires the requests but does not
     * wait for them, which is what let a late step land after checkout had already read the cart
     * as empty and cleared it.
     *
     * Resolves to whether the send actually succeeded, never rejects: `onError` already reports a
     * failure inline, so nothing here should also produce an unhandled rejection for a request
     * `settle()` may never even be asked to await.
     */
    const inFlight = new Map<string, Promise<boolean>>();

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
            const request: Promise<boolean> = update(productId, quantity)
                // `update`'s own resolved value is not this composable's to know — only whether
                // the request succeeded, which is all `settle()` needs.
                .then(() => true)
                .catch((error: unknown) => {
                    onError(error);
                    return false;
                })
                .finally(() => {
                    /*
                     * Only if it has not been superseded. A click made WHILE the request was in
                     * flight left a newer number here, and clearing unconditionally would drop it
                     * — the debounce losing the very data it was added to protect.
                     */
                    if (pending.value[productId] === quantity) forgetPending(productId);
                    // Same reasoning, for `inFlight`: an older request finishing AFTER a newer one
                    // has already started must not delete the newer one's entry — that is what let
                    // `settle()` stop waiting on a request that was still on the wire.
                    if (inFlight.get(productId) === request) inFlight.delete(productId);
                });
            inFlight.set(productId, request);
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

    /**
     * Hands every outstanding step to `send` and drops it, timers included — for `pagehide`.
     *
     * The page is going away, so a normal request would be cancelled with it and a timer would
     * never fire. The caller's `send` must be one that survives the page (a keepalive request).
     *
     * @param send - delivers one line's quantity to the server
     */
    const sendPendingKeepalive = (send: (productId: string, quantity: number) => void) => {
        for (const [productId, quantity] of Object.entries(pending.value)) {
            if (quantity === undefined) continue;
            senders.get(productId)?.cancel();
            send(productId, quantity);
        }
        pending.value = {};
    };

    /**
     * Forgets every line's pending step: cancels every timer and drops the whole map.
     *
     * For "Clear cart" — a queued step for a line the clear is about to wipe would otherwise fire
     * afterward and put that line back into a cart the visitor just emptied.
     */
    const forgetAll = () => {
        for (const send of senders.values()) send.cancel();
        pending.value = {};
    };

    /**
     * Flushes every outstanding step and waits for each one's request to actually land —
     * unlike {@link flushPending}, which fires them but does not wait.
     *
     * For checkout: reading the cart, then emptying it, then navigating away all have to happen
     * AFTER any step still in the debounce window, or that step either lands on a cart the server
     * already emptied (recreating a ghost line) or the server sees lines the visitor's last click
     * never intended.
     *
     * @returns A promise resolving once every in-flight request has settled successfully, and
     *  REJECTING if any one of them failed — `onError` has already reported the failure
     *  itself; this is only the signal a caller like checkout needs to stop rather than proceed
     *  on a line the server never actually got the visitor's last quantity for.
     */
    const settle = (): Promise<void> => {
        flushPending();
        return Promise.all(inFlight.values()).then((results) => {
            if (results.some((succeeded) => !succeeded))
                throw new Error('a cart line quantity failed to reach the server');
        });
    };

    return {
        quantityOf,
        stepQuantity,
        forget,
        forgetAll,
        flushPending,
        sendPendingKeepalive,
        settle
    };
};
