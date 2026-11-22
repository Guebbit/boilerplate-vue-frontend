/**
 * @module
 * Pinia store for the cart module. Every mutating action replaces the local cart
 * wholesale with the payload the API returned, rather than patching it locally — the
 * getters below are all derived from that one `cart` ref.
 */
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { EToastType, useNotificationsStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import { queryClient } from '@/infrastructure/query-client.ts';
import { sendKeyed, useIdempotencyKeys } from '@/infrastructure/http/idempotency.ts';
import { decimalScale, zeroDecimal } from '@/infrastructure/utils/money.ts';
import { translate } from '@/i18n';
import {
    getCart,
    getCartSummary,
    addCartItem,
    updateCartItemByProductId,
    deleteCartItemByProductId,
    clearCart,
    mergeCart,
    setCartShippingMethod,
    reorder as apiReorder
} from '@api';
import type {
    CartResponse,
    CartWarning,
    CartResponseItem,
    CartShipping,
    CartSummaryResponse,
    CheckoutRequest,
    MergeCartResponse
} from '@types';
import {
    rethrowUnlessAbsent,
    isRetryableFailure,
    isGatewayFailure,
    keepsIdempotencyKey
} from '@/infrastructure/utils/errors';
import { useResetOnViewerChange } from '@/infrastructure/utils/use-reset-on-viewer-change.ts';
import { createRequestTickets } from '@/infrastructure/utils/request-ticket.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { invalidateProductsCache } from '@/modules/products';
import {
    changedMergeLines,
    classifyCheckoutError,
    clampToAvailable,
    emptyCart,
    subtractGuestLines
} from './domain';
import { availabilityOf } from '@/kernel/availability.ts';
import type { GuestCartLine, MergeReportLine } from './domain';
import { checkoutKeyFor, endCheckoutAttempt } from './checkout-attempt-storage';
import { IDEMPOTENCY_KEY_HEADER, isMergeRefusedForGood, sendCheckout } from './idempotent-calls';
import { linesOfMergeAttempt, readMergeAttempt, writeMergeAttempt } from './guest-cart-storage';
import { useGuestCart } from './composables/use-guest-cart';
import { logger } from '@/infrastructure/utils/logger.ts';

/**
 * What a caller of {@link useCartStore}'s `checkout` supplies: the request without the total,
 * which the store reads off the cart it holds.
 */
export type CheckoutBody = Omit<CheckoutRequest, 'expectedTotal'>;

/**
 * Owns the shopping cart: the signed-in user's, where every action replaces the local cart with
 * the authoritative payload returned by the API, and the signed-out visitor's guest cart, a plain
 * list kept in this browser until sign-in merges it into the real one (`mergeGuestCart`).
 *
 * Checkout lives here and not in the orders store, even though it answers with an order: it is
 * `POST /cart/checkout`, the contract files it under `Cart`, and it is the one call that empties
 * the cart this store is responsible for. Owned from anywhere else, the local cart survives a
 * completed order and the header keeps showing items the server has already turned into one.
 */
export const useCartStore = defineStore('cart', () => {
    /**
     * Generic REST helper: wraps every mutating call in `fetchAny` so `loading` toggles
     * automatically around each request.
     */
    const { loading, fetchAny } = useStructureRestApi<CartResponseItem, string>({
        resourceKey: 'cart',
        queryClient
    });

    /**
     * Counts every start and end of a call that replaces `cart`, and every viewer change. A
     * background read ({@link pollCart}) remembers the count when it leaves and drops its answer if
     * the count moved: something fresher, or someone else's, has happened since.
     */
    let cartEpoch = 0;

    /**
     * How many calls that replace `cart` are on the wire right now.
     */
    let writesInFlight = 0;

    /**
     * Orders the answers that write `cart`: each call takes a ticket when it leaves, and an answer
     * lands only if no fresher one did first. A viewer change is a barrier that kills every
     * ticket taken before it. See `docs/modules/cart.md`.
     */
    const cartTickets = createRequestTickets();

    /**
     * The same ordering for the badge's summary read, kept apart from {@link cartTickets}: a summary
     * only seeds the badge, so one answered first must never make a cart write's answer stale.
     */
    const summaryTickets = createRequestTickets();

    /**
     * Takes a ticket for a call about to leave, and returns the way to store its answer.
     *
     * @returns A function that replaces `cart` with the answer unless a fresher one already did.
     */
    const takeCartSlot = () => {
        const claim = cartTickets.take();
        return (next: CartResponse) => {
            if (claim()) cart.value = next;
        };
    };

    /**
     * {@link fetchAny} for a call that replaces `cart` with the server's answer: the same
     * `loading` toggle, plus the bookkeeping that keeps a background read from landing over it.
     *
     * @param apiCall - The generated client call.
     * @returns A promise resolving with the answer, as `fetchAny` does.
     */
    const fetchTracked = <TAnswer>(
        apiCall: () => Promise<TAnswer>
    ): Promise<TAnswer | undefined> => {
        cartEpoch += 1;
        writesInFlight += 1;
        return fetchAny(apiCall).finally(() => {
            writesInFlight -= 1;
            cartEpoch += 1;
        });
    };

    /**
     * Full cart response (items + summary)
     */
    const cart = ref<CartResponse | undefined>();

    /**
     * Cart items list
     */
    const cartItems = computed(() => cart.value?.items ?? []);

    /**
     * The totals of the cart, as the last full read answered them.
     */
    const cartSummary = computed<CartSummaryResponse | undefined>(() => cart.value?.summary);

    /**
     * What this basket needs from shipping, and what it may choose from — the server's own
     * answer: the basket weight and the free-above threshold are never computed here.
     */
    const cartShipping = computed<CartShipping | undefined>(() => cart.value?.shipping);

    /**
     * The summary alone, as `GET /cart/summary` answers it — the lightweight read that exists so
     * a header badge does not cost the whole cart on every page. Only a SEED: every cart mutation
     * replaces `cart` wholesale, and the full response's summary is fresher from that moment on.
     */
    const summarySeed = ref<CartSummaryResponse | undefined>();

    /**
     * Whichever summary is freshest: the loaded cart's when one is loaded, the seed before.
     */
    const liveSummary = computed(() => cart.value?.summary ?? summarySeed.value);

    /**
     * The signed-out visitor's cart, its actions and its merge key: see `useGuestCart`.
     */
    const {
        guestLines,
        guestQuantity,
        hasGuestLines,
        addGuestItem: addGuestLines,
        updateGuestItem: setGuestLine,
        removeGuestItems,
        clearGuestCart,
        mergeKeyFor
    } = useGuestCart();

    /**
     * What the last guest-cart merge changed, for the cart page's alert: the lines whose quantity is
     * not what the guest asked, the ones short of stock and the ones that could not be added.
     * Memory only, on purpose: it lives until dismissed, until the viewer
     * changes or until a newer merge replaces it. A later `GET /cart` never sets or touches it, and
     * a reload drops it, since the server keeps no copy of what the guest asked for.
     */
    const mergeReport = ref<MergeReportLine[]>([]);

    /**
     * What stock did to the last write of each line, by product id: fewer could be bought, or none.
     * Kept apart from `cart` on purpose: a background read replaces the cart and would wipe the
     * line's message, which must stay beside the line until that line is written again or removed.
     * Memory only.
     */
    const lineWarnings = ref<Record<string, CartWarning | undefined>>({});

    /**
     * Records the warnings a write answered with: each named product's message is replaced, and a
     * product written without one loses its old message.
     *
     * @param written - The products the write touched.
     * @param warnings - The answer's `warnings`, absent when the write landed as asked.
     */
    const noteWarnings = (
        written: readonly string[],
        warnings: readonly CartWarning[] | undefined
    ) => {
        // The written products lose their old message; the answer's own warnings are then set.
        const kept = Object.entries(lineWarnings.value).filter(
            ([productId]) => !written.includes(productId)
        );
        lineWarnings.value = {
            ...Object.fromEntries(kept),
            ...Object.fromEntries((warnings ?? []).map((warning) => [warning.productId, warning]))
        };
    };

    /**
     * Adds units to the guest cart, up to what can be bought: the guest cart lives in this browser,
     * so it clamps from the availability store (`@/kernel/availability`) the way the server clamps
     * the signed-in cart, and records the same warning. A product whose availability is not loaded
     * is not clamped: nothing is known, and checkout (after sign-in) is the gate.
     *
     * @param productId - Product to add.
     * @param quantity - How many to add.
     * @returns `false` when the cart already holds the most distinct products it may and this is a
     *  new one; the cart is then unchanged.
     */
    const addGuestItem = (productId: string, quantity: number): boolean => {
        const held = guestLines.value.find((line) => line.productId === productId)?.quantity ?? 0;
        const wanted = held + quantity;
        const { quantity: next, code } = clampToAvailable(
            wanted,
            held,
            availabilityOf(productId)?.quantityAvailable
        );
        const added = next === held || addGuestLines(productId, next - held);
        if (added)
            noteWarnings(
                [productId],
                code ? [{ code, productId, requested: wanted, resulting: next }] : undefined
            );
        return added;
    };

    /**
     * Sets the exact quantity of a guest line, up to what can be bought (see {@link addGuestItem}).
     *
     * @param productId - Product whose line is updated.
     * @param quantity - New quantity.
     */
    const updateGuestItem = (productId: string, quantity: number) => {
        const held = guestLines.value.find((line) => line.productId === productId)?.quantity ?? 0;
        const { quantity: next, code } = clampToAvailable(
            quantity,
            held,
            availabilityOf(productId)?.quantityAvailable
        );
        setGuestLine(productId, next);
        noteWarnings(
            [productId],
            code ? [{ code, productId, requested: quantity, resulting: next }] : undefined
        );
    };

    /**
     * The shopper closed the merge alert.
     */
    const dismissMergeReport = () => {
        mergeReport.value = [];
    };

    /**
     * What the header badge wears: every unit in the cart (`totalQuantity`, not the number of
     * distinct lines) — three of one product is a badge saying 3. The server's count wins once
     * there is one; until then, and for a guest, it is the guest list's, and nothing when that is
     * empty.
     */
    const badgeQuantity = computed(
        () =>
            liveSummary.value?.totalQuantity ??
            (hasGuestLines.value ? guestQuantity.value : undefined)
    );

    /**
     * What the header writes beside the badge: the cart's money total (before shipping) paired
     * with its currency — one computed, not two, so a caller can never read one half of a summary
     * that has not loaded yet (`formatCurrency` takes the currency as a required argument).
     */
    const badgeMoney = computed(() =>
        liveSummary.value === undefined
            ? undefined
            : { total: liveSummary.value.itemsTotal, currency: liveSummary.value.currency }
    );

    /**
     * The merge or summary read in flight for the sign-in, shared so a second ask joins it.
     */
    let seeding: Promise<unknown> | undefined;

    /**
     * Drops everything held for the previous person: the cart, the badge's seed, the merge report
     * and any pending checkout attempt. Runs when the viewer signs out or another account takes
     * the tab over.
     *
     * The device's guest list ends with the session that failed to merge it: a shared browser must
     * never hand one account's unmerged lines to the next. A reload's session restore is not a
     * change of viewer, so the list is still kept and retried while the same person stays in.
     */
    useResetOnViewerChange(() => {
        // Any background read still out was asked for the previous person.
        cartEpoch += 1;
        // The barrier: an answer still on the wire for the previous person lands nowhere.
        cartTickets.reset();
        summaryTickets.reset();
        seeding = undefined;
        cart.value = undefined;
        summarySeed.value = undefined;
        mergeReport.value = [];
        lineWarnings.value = {};
        endCheckoutAttempt();
        clearGuestCart();
        writeMergeAttempt(undefined);
    });

    /**
     * Fetches the lightweight summary. Resolves with nothing for a guest — a 401 here means "no
     * cart", which is an ordinary state for a header, not an error worth a toast.
     *
     * @returns A promise resolving with the summary, or nothing.
     */
    const fetchSummary = () => {
        const claim = summaryTickets.take();
        return getCartSummary()
            .then((response) => {
                if (claim()) summarySeed.value = response;
                return response;
            })
            .catch((error: unknown) => {
                // 401 only — a guest has no cart. Anything else is a real failure, and swallowing
                // it would empty the header badge for someone whose cart is full.
                rethrowUnlessAbsent(error, 401);
                if (claim()) summarySeed.value = undefined;
                return undefined;
            });
    };

    /**
     * The sign-in read in flight, if any: the guest cart's merge, or the badge's summary. The first
     * full read waits for it, so it cannot be answered from before the merge and then overwrite the
     * merged cart.
     */
    let signInRead: Promise<unknown> | undefined;

    /**
     * A call that replaces `cart` with the server's answer: tracked for `loading` and for the
     * background poll, and ordered by ticket so a slow older answer never lands over a newer one.
     *
     * @param call - The generated client call.
     * @param cartOf - Picks the cart out of the answer.
     * @returns A promise resolving with the answer, as `fetchAny` does.
     */
    const replaceCartFrom = <T>(
        call: () => Promise<T>,
        cartOf: (data: T) => CartResponse
    ): Promise<T | undefined> =>
        fetchTracked(() => {
            const store = takeCartSlot();
            return call().then((data) => {
                store(cartOf(data));
                return data;
            });
        });

    /**
     * {@link replaceCartFrom} for a call whose whole answer is the cart.
     *
     * @param call - The generated client call, answering with the whole cart.
     * @returns A promise resolving with the answer's cart.
     */
    const replaceCart = (call: () => Promise<CartResponse>): Promise<CartResponse | undefined> =>
        replaceCartFrom(call, (data) => data);

    /**
     * Fetches the full cart (items + summary) and stores it.
     *
     * @returns A promise resolving with the cart response.
     */
    const fetchCart = () =>
        (signInRead ?? Promise.resolve()).then(() => replaceCart(() => getCart()));

    /**
     * Whether a background read is out, so a slow server is never asked again on top of itself.
     */
    let pollInFlight = false;

    /**
     * Background re-read of the cart, for the per-line `availability` the
     * server computes on every cart answer. Plain interval polling, driven by
     * `useCartStockPoll`; it is not `fetchCart`, because a read nobody asked for must not toggle
     * `loading` (that disables the buttons) or wait on the sign-in read.
     *
     * Yields to anything fresher, so it can never make a stale answer win:
     * - it does nothing while a call that replaces the cart is on the wire, or another poll is;
     * - its answer is dropped when such a call started (or the viewer changed) after it left.
     *
     * @returns A promise resolving with the cart it stored, or nothing when it yielded.
     */
    const pollCart = (): Promise<CartResponse | undefined> => {
        if (writesInFlight > 0 || pollInFlight || signInRead !== undefined)
            return Promise.resolve(undefined);
        const issuedAt = cartEpoch;
        const store = takeCartSlot();
        pollInFlight = true;
        return getCart()
            .then((response) => {
                if (issuedAt !== cartEpoch) return undefined;
                store(response);
                return response;
            })
            .finally(() => {
                pollInFlight = false;
            });
    };

    /**
     * `Idempotency-Key`s for `addCartItem`, one per product and quantity: a lost response resends
     * the SAME key, so a retry never grows the line twice; any answer mints a fresh one, so a second
     * click is a new intent and adds again.
     */
    const addIdempotencyKeys = useIdempotencyKeys();

    /**
     * `Idempotency-Key`s for `reorder`, one per order, kept and settled the same way.
     */
    const reorderIdempotencyKeys = useIdempotencyKeys();

    /**
     * "Add to cart": a product with no line gets one, a line already there GROWS by `quantity` —
     * the server does the arithmetic, so the caller never reads the cart first to increment it.
     * `updateCartItem` is the door that sets an exact quantity.
     *
     * @param productId - Product to add.
     * @param quantity - How many to add.
     * @returns A promise resolving with the updated cart response.
     */
    const addCartItemAction = (productId: string, quantity: number) =>
        replaceCart(() =>
            sendKeyed(addIdempotencyKeys.forSubject(`${productId}\n${quantity}`), (options) =>
                addCartItem({ productId, quantity }, options)
            )
        ).then((answer) => {
            if (answer) noteWarnings([productId], answer.warnings);
            return answer;
        });

    /**
     * Sets the exact quantity of an item already in the cart.
     *
     * @param productId - Product whose line is updated.
     * @param quantity - New quantity.
     * @returns A promise resolving with the updated cart response.
     */
    const updateCartItem = (productId: string, quantity: number) =>
        replaceCart(() => updateCartItemByProductId(productId, { quantity })).then((answer) => {
            if (answer) noteWarnings([productId], answer.warnings);
            return answer;
        });

    /**
     * Chooses, or clears (`null`), the shipping method the cart plans to ship by ahead of
     * checkout — priced and validated server-side against the basket as it stands right now.
     * Replaces `cart` wholesale like every other write here, so `cartSummary`'s
     * `shippingCost`/`totalPrice` are current the moment this resolves.
     *
     * @param shippingMethodId - The chosen method's id, or `null` to clear the choice.
     * @returns A promise resolving with the updated cart response.
     */
    const setShippingMethod = (shippingMethodId: string | null) =>
        replaceCart(() => setCartShippingMethod({ shippingMethodId }));

    /**
     * Removes a product's line from the cart entirely.
     *
     * @param productId - Product to remove.
     * @returns A promise resolving with the updated cart response.
     */
    const removeCartItemAction = (productId: string) =>
        replaceCart(() => deleteCartItemByProductId(productId)).then((answer) => {
            noteWarnings([productId], undefined);
            return answer;
        });

    /**
     * Empties the cart entirely. `DELETE /cart/items` — the line collection's own URL, apart from
     * `DELETE /cart/items/{productId}`, so a missing id can never mean "clear everything".
     *
     * @returns A promise resolving with the updated (empty) cart response.
     */
    const clearCartAction = () =>
        replaceCart(() => clearCart()).then((answer) => {
            lineWarnings.value = {};
            return answer;
        });

    /**
     * What a failed checkout does to the attempt, and to the cart the page shows.
     *
     * - Nothing conclusive (no answer, a body-less 502/503/504 from a proxy, or the first attempt
     *   still running): the key is kept, so the next press is the SAME call and replays whatever
     *   the server did.
     * - A bare 500, or the API's own 503 (it stores and replays that to the same key): the cart is
     *   read again. Still full means no order was written (the order and the
     *   cart's clearing commit together), so the attempt ends; empty means the order exists.
     * - Anything else is a verdict on this order: the attempt ends.
     *
     * @param error - What the checkout call rejected with.
     * @returns A promise settling once the attempt has been dealt with.
     */
    const settleFailedCheckout = (error: unknown): Promise<void> => {
        const verdict = classifyCheckoutError(error).kind;
        if (verdict === 'in-flight') return Promise.resolve();
        // The server wrote nothing and the screen was out of date: read the cart again, so the
        // page shows the total the next press will confirm.
        if (verdict === 'total-changed') {
            endCheckoutAttempt();
            return fetchCart().then(
                () => undefined,
                () => undefined
            );
        }
        if (verdict === 'server-error')
            return fetchCart().then(
                (fresh) => {
                    if ((fresh?.items.length ?? 0) > 0) endCheckoutAttempt();
                },
                () => undefined
            );
        if (!isRetryableFailure(error)) endCheckoutAttempt();
        return Promise.resolve();
    };

    /**
     * Settles a failed checkout, then rethrows it. A refusal (a product pulled from sale, a changed
     * price or basket) is the server saying what the cached product details said differently, so
     * their cache goes too. Stock is not among them: it is the availability read, never cached here.
     *
     * @param error - What the checkout call rejected with.
     * @returns A promise that always rejects with `error`.
     * @throws The same `error`, once the attempt is settled.
     */
    const rejectFailedCheckout = (error: unknown) =>
        settleFailedCheckout(error).then(() => {
            if (!isRetryableFailure(error)) invalidateProductsCache();
            throw error;
        });

    /**
     * Turns the authenticated user's cart into an order.
     *
     * Emits nothing: every checkout outcome the API saw is reported by the backend from the
     * handler that decided it, and a request that never arrived is already a failed span in Faro.
     *
     * Sends the attempt's key ({@link checkoutKeyFor}) on every call: a retry of the same order after
     * a lost answer reuses it, any other order gets a fresh one, and a verdict ends the attempt
     * ({@link settleFailedCheckout}).
     *
     * Always names the total the cart on screen shows (`expectedTotal`: the summary's `totalPrice`
     * and `currency`, echoed as the server wrote them): the server
     * refuses with 409 `CART_TOTAL_CHANGED` when it would charge anything else, and the total is
     * part of the attempt's fingerprint, so a different shown total is a different call with a new
     * key. A refusal for that reason reads the cart again before it rejects.
     *
     * @param checkoutData - Optional checkout payload (address, payment method, order notes).
     * @returns A promise resolving with the created order.
     */
    const checkout = (checkoutData?: CheckoutBody) =>
        fetchTracked(() => {
            const store = takeCartSlot();
            const shown = cart.value?.summary;
            if (shown === undefined)
                return Promise.reject(
                    new Error('checkout: no cart has been read, so no total was shown')
                );
            const body: CheckoutRequest = {
                ...checkoutData,
                expectedTotal: { amount: shown.totalPrice, currency: shown.currency }
            };
            const key = checkoutKeyFor(body, cart.value, useSessionStore().viewer?.id ?? '');
            return sendCheckout(body, key)
                .then((response) => {
                    // The server empties the cart on success: setting it to the known-empty
                    // shape, rather than dropping it to `undefined`, is what keeps the header badge
                    // from falling back to `summarySeed`'s stale count from before checkout ran.
                    // The currency survives the empty: the order was just frozen from this basket.
                    store(
                        emptyCart(
                            shown.currency,
                            // Zero at the places the server just wrote, so the badge shows "0.00".
                            zeroDecimal(decimalScale(shown.totalPrice))
                        )
                    );
                    endCheckoutAttempt();
                    return response;
                })
                .catch(rejectFailedCheckout);
        });

    /**
     * Copies one of the caller's own orders back into the cart. The answer holds the updated cart,
     * which replaces the local copy, and one result per order line (what each became).
     *
     * @param orderId - One of the caller's own orders.
     * @returns A promise resolving with the updated cart and the per-line results.
     */
    const reorder = (orderId: string) =>
        replaceCartFrom(
            () =>
                sendKeyed(reorderIdempotencyKeys.forSubject(orderId), (options) =>
                    apiReorder({ orderId }, options)
                ),
            ({ cart: updated }) => updated
        );

    /**
     * One `POST /cart/merge` of these lines under this key: the cart takes the answer, exactly the
     * lines that were sent leave the guest list, and a failure that may still be running or may have
     * been applied (no answer, a gateway's 5xx, or `409 IDEMPOTENCY_IN_FLIGHT`) keeps the attempt.
     *
     * @param sent - The lines this call carries.
     * @param key - The `Idempotency-Key` it travels under.
     * @returns A promise resolving with the merged cart and the per-line results.
     */
    const sendMerge = (sent: readonly GuestCartLine[], key: string) =>
        fetchTracked(() => {
            const claim = cartTickets.take();
            return mergeCart({ lines: [...sent] }, { headers: { [IDEMPOTENCY_KEY_HEADER]: key } })
                .then((response) => {
                    if (claim()) cart.value = response.cart;
                    // The guest list is device-scoped only until the session ends: what the call
                    // carried left it either way.
                    guestLines.value = subtractGuestLines(guestLines.value, sent);
                    writeMergeAttempt(undefined);
                    return response;
                })
                .catch((error: unknown) => {
                    /**
                     * The API's own 5xx is stored for the key and means nothing was written (the
                     * merge is one write), so it ends the attempt. A gateway's 5xx may be a merge
                     * the server applied whose answer was lost: the key stays, and the retry
                     * replays the stored success instead of adding the lines twice.
                     */
                    if (!keepsIdempotencyKey(error) && !isGatewayFailure(error))
                        writeMergeAttempt(undefined);
                    // The list itself is what the server refused: carrying it to the next
                    // sign-in would only refuse again, with a toast each time.
                    if (isMergeRefusedForGood(error))
                        guestLines.value = subtractGuestLines(guestLines.value, sent);
                    throw error;
                });
        });

    /**
     * The lines of a merge that never got an answer and are no longer what the guest cart holds,
     * with the key they travelled under. The server may have applied that call, so sending
     * the current lines under a new key would add the same units again.
     *
     * @returns The unanswered call to replay, or nothing when there is none or it is the same call.
     */
    const lostMergeToReplay = (): { lines: GuestCartLine[]; key: string } | undefined => {
        const pending = readMergeAttempt();
        if (!pending || pending.body === JSON.stringify(guestLines.value)) return undefined;
        const lines = linesOfMergeAttempt(pending);
        return lines.length > 0 ? { lines, key: pending.key } : undefined;
    };

    /**
     * Sends the guest cart to the server, which adds every line by the rule of `POST /cart/items` and
     * answers with the merged cart and one result per line.
     *
     * A merge whose answer was lost, followed by an edit of the guest cart, is replayed first
     * under its own key (the server then answers from its record instead of adding again), and
     * only what the guest added since goes in a second call under a fresh key.
     *
     * On an answer, exactly the lines that were sent leave the guest cart: anything the guest
     * added while the call was out stays for the next merge. A failure leaves it as it was, to be
     * tried again at the next sign-in; a failure that may still be running (no answer, or the API's
     * `IDEMPOTENCY_IN_FLIGHT`) also keeps the key, any other outcome, a 5xx included, ends the
     * attempt.
     *
     * The lines that are not what was asked, that are short of stock or that could not be added
     * become {@link mergeReport}. A line the cart could not take at all also becomes one
     * notification, which the bell shows.
     *
     * @returns A promise resolving with the merged cart and the per-line results of the last call.
     */
    const mergeGuestCart = (): Promise<MergeCartResponse | undefined> => {
        // The report is the previous person's once the tab has moved on, so it lands only for the
        // one who asked.
        const sameEra = cartTickets.take().isSameEra;
        const lost = lostMergeToReplay();
        if (!lost) {
            const lines = guestLines.value;
            return sendMerge(lines, mergeKeyFor(lines)).then((answer) => {
                if (answer && sameEra())
                    mergeReport.value = changedMergeLines(answer.lines, answer.warnings);
                return answer;
            });
        }
        return sendMerge(lost.lines, lost.key).then((first) => {
            // What the guest added since the lost call: the lost lines just left the list.
            const rest = guestLines.value;
            const second =
                rest.length === 0
                    ? Promise.resolve<MergeCartResponse | undefined>(undefined)
                    : sendMerge(rest, mergeKeyFor(rest));
            return second.then((last) => {
                if (sameEra())
                    mergeReport.value = changedMergeLines(
                        [...(first?.lines ?? []), ...(last?.lines ?? [])],
                        [...(first?.warnings ?? []), ...(last?.warnings ?? [])]
                    );
                return last ?? first;
            });
        });
    };

    /**
     * What the shell does once a session that may shop appears: merge the guest cart in when there
     * is one, otherwise read the lightweight summary for the badge.
     *
     * A merge that fails is not an error the visitor can fix by looking at it, so it becomes one
     * toast saying the cart is kept, or, when the server refused the list itself, dropped; the
     * badge's summary is still read, so the header is not blank.
     * Only the first full read waits for this ({@link fetchCart}).
     *
     * @returns A promise settling once the header has what it needs.
     */
    const seedAfterSignIn = (): Promise<unknown> => {
        // A second ask in the same breath joins the first: the guest cart is sent once.
        if (seeding) return seeding;
        const read = hasGuestLines.value
            ? mergeGuestCart().catch((error: unknown) => {
                  useNotificationsStore().addMessage(
                      translate(
                          isMergeRefusedForGood(error)
                              ? 'cart-page.error-guest-merge-dropped'
                              : 'cart-page.error-guest-merge'
                      ),
                      EToastType.WARNING
                  );
                  return fetchSummary();
              })
            : fetchSummary();
        // What `fetchCart` waits for: the read settling either way, never its failure.
        const settled = read.then(
            () => undefined,
            () => undefined
        );
        signInRead = settled;
        seeding = read;
        settled
            .then(() => {
                if (signInRead === settled) signInRead = undefined;
                if (seeding === read) seeding = undefined;
            })
            .catch((error: unknown) => {
                logger.error('[Cart] Could not release the sign-in read:', error);
            });
        return read;
    };

    return {
        cart,
        cartItems,
        cartSummary,
        cartShipping,
        badgeQuantity,
        badgeMoney,
        fetchSummary,

        guestLines,
        hasGuestLines,
        guestQuantity,
        addGuestItem,
        updateGuestItem,
        removeGuestItems,
        clearGuestCart,
        mergeGuestCart,
        mergeReport,
        dismissMergeReport,
        lineWarnings,
        seedAfterSignIn,

        loading,
        fetchCart,
        pollCart,
        checkout,
        reorder,
        addCartItem: addCartItemAction,
        updateCartItem,
        removeCartItem: removeCartItemAction,
        clearCart: clearCartAction,
        setShippingMethod
    };
});
