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
import { shopCurrency } from '@/infrastructure/shop.ts';
import { translate } from '@/i18n';
import {
    getCart,
    getCartSummary,
    addCartItem,
    updateCartItemById,
    removeCartItem,
    clearCart,
    mergeCart,
    setCartShippingMethod,
    checkout as apiCheckout,
    reorder as apiReorder
} from '@api';
import type {
    CartItem,
    CartResponse,
    CartShipping,
    CartSummaryResponse,
    CheckoutRequest,
    MergeCartResponse
} from '@types';
import {
    rethrowUnlessAbsent,
    isRetryableFailure,
    isTransportFailure
} from '@/infrastructure/utils/errors';
import { useResetOnViewerChange } from '@/infrastructure/utils/use-reset-on-viewer-change.ts';
import { createRequestTickets } from '@/infrastructure/utils/request-ticket.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { currencyDigits } from '@/infrastructure/utils/formatters.ts';
import { invalidateProductsCache } from '@/modules/products';
import {
    changedMergeLines,
    checkoutFingerprint,
    classifyCheckoutError,
    expectedTotalOf,
    subtractGuestLines
} from './domain';
import type { GuestCartLine, MergeReportLine } from './domain';
import { readCheckoutAttempt, writeCheckoutAttempt } from './composables/checkout-attempt-storage';
import {
    linesOfMergeAttempt,
    readMergeAttempt,
    writeMergeAttempt
} from './composables/guest-cart-storage';
import { useGuestCart } from './composables/use-guest-cart';

/**
 * What a caller of {@link useCartStore}'s `checkout` supplies: the request without the total,
 * which the store reads off the cart it holds.
 */
export type CheckoutBody = Omit<CheckoutRequest, 'expectedTotal'>;

/**
 * The header the paired backend's `idempotency` middleware reads off `POST /cart/checkout` — see
 * `IdempotencyKeyHeader` in the contract.
 */
const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

/**
 * How long a checkout waits before asking again, one entry per retry, when the server answers
 * `IDEMPOTENCY_IN_FLIGHT`: the first attempt is still running, so the same key is sent again until
 * it replays the order. A 409 here means "not yet", never "no".
 */
export const IN_FLIGHT_RETRY_DELAYS_MS: readonly number[] = [1000, 2000, 4000];

/**
 * The statuses that say the stored guest list itself is bad (malformed, too many lines, too big):
 * the same request will never succeed, so it is not kept for the next sign-in.
 */
const MERGE_REFUSED_FOR_GOOD: ReadonlySet<number> = new Set([400, 413, 422]);

/**
 * Whether the server refused a merge in a way a retry cannot fix.
 *
 * @param error - What the merge call rejected with.
 * @returns `true` for an answered 400, 413 or 422.
 */
const isMergeRefusedForGood = (error: unknown): boolean =>
    !isTransportFailure(error) && MERGE_REFUSED_FOR_GOOD.has((error as { status: number }).status);

/**
 * Ends the checkout attempt under way: the next checkout is a new call, with a new key.
 */
const endCheckoutAttempt = (): void => {
    writeCheckoutAttempt(undefined);
};

/**
 * Waits.
 * https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout
 *
 * @param milliseconds - How long to wait.
 * @returns A promise resolving after that long.
 */
const wait = (milliseconds: number): Promise<void> =>
    new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });

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
    const { loading, fetchAny } = useStructureRestApi<CartItem, string>({
        resourceKey: 'cart',
        queryClient
    });

    /**
     * Counts every start and end of a call that replaces `cart`, and every viewer change. A
     * background
     * read ({@link pollCart}) remembers the count when it leaves and drops its answer if the count
     * moved: something fresher, or someone else's, has happened since.
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
     * Cart summary
     */
    const cartSummary = computed<CartSummaryResponse | undefined>(() => cart.value?.summary);

    /**
     * What this basket needs from shipping, and what it may choose from — the server's own
     * answer, replacing a client-computed basket weight and free-above math.
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
        addGuestItem,
        updateGuestItem,
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
     * that has not loaded yet (`formatCurrency` now takes currency as a required argument).
     */
    const badgeMoney = computed(() =>
        liveSummary.value === undefined
            ? undefined
            : { total: liveSummary.value.itemsTotal, currency: liveSummary.value.currency }
    );

    /**
     * The key of the checkout attempt under way, or a new one when the order is not the one the
     * saved attempt was made for.
     *
     * The key follows a fingerprint of the order (body, cart lines, shipping choice) and the person:
     * the same order asked again is the same call, so the server replays it; anything else is a
     * different call and gets a fresh key. Saved in the tab's storage, so a reload keeps it.
     *
     * @param body - The checkout request body about to be sent, total included.
     * @returns The `Idempotency-Key` to send it under.
     */
    const checkoutKeyFor = (body: CheckoutRequest): string => {
        const viewerId = useSessionStore().viewer?.id ?? '';
        const fingerprint = checkoutFingerprint(body, cart.value);
        const saved = readCheckoutAttempt();
        if (saved?.viewerId === viewerId && saved.fingerprint === fingerprint) return saved.key;
        const attempt = { viewerId, fingerprint, key: crypto.randomUUID() };
        writeCheckoutAttempt(attempt);
        return attempt.key;
    };

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
                if (claim()) summarySeed.value = response.data;
                return response.data;
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
     * @param call - The generated client call, answering with the whole cart.
     * @param invalidateProducts - Whether the write makes cached products stale: the shopper's own
     *  write does, a shipping pick or a read does not.
     * @returns A promise resolving with the answer's cart, as `fetchAny` does.
     */
    const replaceCart = (
        call: () => Promise<{ data: CartResponse }>,
        invalidateProducts = true
    ): Promise<CartResponse | undefined> =>
        fetchTracked(() => {
            const store = takeCartSlot();
            return call().then(({ data }) => {
                store(data);
                // The shopper's own write: cached products are stale now, not in five minutes.
                if (invalidateProducts) invalidateProductsCache();
                return data;
            });
        });

    /**
     * Fetches the full cart (items + summary) and stores it.
     *
     * @returns A promise resolving with the cart response.
     */
    const fetchCart = () =>
        (signInRead ?? Promise.resolve()).then(() => replaceCart(() => getCart(), false));

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
                store(response.data);
                return response.data;
            })
            .finally(() => {
                pollInFlight = false;
            });
    };

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
        replaceCart(() => addCartItem({ productId, quantity }));

    /**
     * Sets the exact quantity of an item already in the cart.
     *
     * @param productId - Product whose line is updated.
     * @param quantity - New quantity.
     * @returns A promise resolving with the updated cart response.
     */
    const updateCartItem = (productId: string, quantity: number) =>
        replaceCart(() => updateCartItemById(productId, { quantity }));

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
        replaceCart(() => setCartShippingMethod({ shippingMethodId }), false);

    /**
     * Removes a product's line from the cart entirely.
     *
     * @param productId - Product to remove.
     * @returns A promise resolving with the updated cart response.
     */
    const removeCartItemAction = (productId: string) =>
        replaceCart(() => removeCartItem(productId));

    /**
     * Empties the cart entirely. `DELETE /cart/all` — its own URL, not what `removeCartItem`
     * falls back to when a product id goes missing.
     *
     * @returns A promise resolving with the updated (empty) cart response.
     */
    const clearCartAction = () => replaceCart(() => clearCart());

    /**
     * What the local cart becomes once checkout empties it server-side — a known state,
     * not a guess, since the server always empties the cart on a successful checkout. Takes the
     * currency as an argument rather than hardcoding one: the shop's currency does not change
     * just because the basket emptied.
     *
     * @param currency - ISO-4217 code the emptied cart's zeroed summary should still carry.
     * @returns The known-empty cart shape.
     */
    const emptyCart = (currency: string): CartResponse => ({
        items: [],
        summary: {
            itemsCount: 0,
            totalQuantity: 0,
            itemsTotal: 0,
            shippingCost: 0,
            totalPrice: 0,
            currency
        },
        shipping: { required: false, selected: null, options: [] }
    });

    /**
     * Sends the checkout under its key, asking again with the SAME key while the server says the
     * first attempt is still running ({@link IN_FLIGHT_RETRY_DELAYS_MS}): the retry then replays the
     * order instead of making a second one.
     *
     * @param checkoutData - The checkout request body.
     * @param key - The `Idempotency-Key` this attempt travels under.
     * @param delays - The waits still left, one per remaining retry.
     * @returns A promise resolving with the API's answer.
     */
    const sendCheckout = (
        checkoutData: CheckoutRequest,
        key: string,
        delays: readonly number[]
    ): ReturnType<typeof apiCheckout> =>
        apiCheckout(checkoutData, { headers: { [IDEMPOTENCY_KEY_HEADER]: key } }).catch(
            (error: unknown) => {
                const next = delays.at(0);
                if (next === undefined || classifyCheckoutError(error).kind !== 'in-flight')
                    throw error;
                return wait(next).then(() => sendCheckout(checkoutData, key, delays.slice(1)));
            }
        );

    /**
     * What a failed checkout does to the attempt, and to the cart the page shows.
     *
     * - Nothing conclusive (no answer, 502/503/504, or the first attempt still running): the key is
     *   kept, so the next press is the SAME call and replays whatever the server did.
     * - A bare 500: the cart is read again. Still full means no order was written (the order and the
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
     * Turns the authenticated user's cart into an order.
     *
     * Emits nothing: every checkout outcome the API saw is reported by the backend from the
     * handler that decided it, and a request that never arrived is already a failed span in Faro.
     *
     * Sends the attempt's key ({@link checkoutKeyFor}) on every call: a retry of the same order after
     * a lost answer reuses it, any other order gets a fresh one, and a verdict ends the attempt
     * ({@link settleFailedCheckout}).
     *
     * Always names the total the cart on screen shows (`expectedTotal`, in minor units): the server
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
                expectedTotal: expectedTotalOf(shown, currencyDigits(shown.currency))
            };
            const key = checkoutKeyFor(body);
            return sendCheckout(body, key, IN_FLIGHT_RETRY_DELAYS_MS)
                .then((response) => {
                    // The server empties the cart on success: setting it to the known-empty
                    // shape, rather than dropping it to `undefined`, is what keeps the header badge
                    // from falling back to `summarySeed`'s stale count from before checkout ran.
                    // The currency itself survives the empty — the order was just frozen from the
                    // same basket this cart is still showing, so its own is the same one; the shop's
                    // only reads for a cart the caller never `fetchCart`/`fetchSummary`'d.
                    store(emptyCart(liveSummary.value?.currency ?? shopCurrency.value));
                    endCheckoutAttempt();
                    // The order reserved stock: every cached `available` is out of date.
                    invalidateProductsCache();
                    return response.data;
                })
                .catch((error: unknown) =>
                    settleFailedCheckout(error).then(() => {
                        // A refusal (out of stock, a changed basket) is the server saying what the
                        // cached products said differently.
                        if (!isRetryableFailure(error)) invalidateProductsCache();
                        throw error;
                    })
                );
        });

    /**
     * Copies one of the caller's own orders back into the cart. The response is the updated
     * cart — products that left the catalogue were skipped server-side, so replacing the local
     * copy with it is also what makes the skip visible.
     *
     * @param orderId - One of the caller's own orders.
     * @returns A promise resolving with the updated cart response.
     */
    const reorder = (orderId: string) => replaceCart(() => apiReorder(orderId));

    /**
     * One `POST /cart/merge` of these lines under this key: the cart takes the answer, exactly the
     * lines that were sent leave the guest list, and a retryable failure keeps the attempt.
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
                    if (claim()) cart.value = response.data.cart;
                    // The guest list is device-scoped only until the session ends: what the call
                    // carried left it either way.
                    guestLines.value = subtractGuestLines(guestLines.value, sent);
                    writeMergeAttempt(undefined);
                    return response.data;
                })
                .catch((error: unknown) => {
                    if (!isRetryableFailure(error)) writeMergeAttempt(undefined);
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
     * Sends the guest cart to the server, which adds every line by the rule of `POST /cart` and
     * answers with the merged cart and one result per line.
     *
     * A merge whose answer was lost, followed by an edit of the guest cart, is replayed first
     * under its own key (the server then answers from its record instead of adding again), and
     * only what the guest added since goes in a second call under a fresh key.
     *
     * On an answer, exactly the lines that were sent leave the guest cart: anything the guest
     * added while the call was out stays for the next merge. A failure leaves it as it was, to be
     * tried again at the next sign-in; a retryable one (no answer, a 5xx) also keeps the key, any
     * other outcome ends the attempt.
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
                if (answer && sameEra()) mergeReport.value = changedMergeLines(answer.lines);
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
                    mergeReport.value = changedMergeLines([
                        ...(first?.lines ?? []),
                        ...(last?.lines ?? [])
                    ]);
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
        void settled.then(() => {
            if (signInRead === settled) signInRead = undefined;
            if (seeding === read) seeding = undefined;
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
