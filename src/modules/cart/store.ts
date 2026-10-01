/**
 * @module
 * Pinia store for the cart module. Every mutating action replaces the local cart
 * wholesale with the payload the API returned, rather than patching it locally — the
 * getters below are all derived from that one `cart` ref.
 */
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useStructureRestApi } from '@guebbit/vue-toolkit';
import { queryClient } from '@/infrastructure/query-client.ts';
import { shopCurrency } from '@/infrastructure/shop-currency.ts';
import {
    getCart,
    getCartSummary,
    addCartItem,
    updateCartItemById,
    removeCartItem,
    clearCart,
    setCartShippingMethod,
    checkout as apiCheckout,
    reorder as apiReorder
} from '@api';
import type {
    CartItem,
    CartResponse,
    CartShipping,
    CartSummaryResponse,
    CheckoutRequest
} from '@types';
import { rethrowUnlessAbsent, isRetryableFailure } from '@/infrastructure/utils/errors';
import { useResetOnViewerChange } from '@/infrastructure/utils/use-reset-on-viewer-change.ts';

/**
 * The header the paired backend's `idempotency` middleware reads off `POST /cart/checkout` — see
 * `IdempotencyKeyHeader` in the contract.
 */
const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

/**
 * Owns the authenticated user's shopping cart: every action replaces the local
 * cart with the authoritative payload returned by the API.
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
     * answer (FA-D6/B3), replacing a client-computed basket weight and free-above math.
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
     * What the header badge wears: every unit in the cart (`totalQuantity`, not the number of
     * distinct lines) — three of one product is a badge saying 3.
     */
    const badgeQuantity = computed(() => liveSummary.value?.totalQuantity);

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
     * `POST /cart/checkout`'s `Idempotency-Key` for the checkout attempt under way (B19). Minted
     * once here and again by {@link mintCheckoutIdempotencyKey} — never read directly outside
     * {@link checkout}, which is the only caller that sends it.
     */
    const checkoutIdempotencyKey = ref(crypto.randomUUID());

    /**
     * Starts a fresh checkout attempt: a new key for the NEXT `checkout()` call.
     *
     * Called after a definitive answer (success, or a 4xx `checkout()` itself classifies as
     * final) and after every cart-content mutation below — a changed basket is a genuinely
     * different attempt, even if nobody has clicked "place order" yet.
     */
    const mintCheckoutIdempotencyKey = () => {
        checkoutIdempotencyKey.value = crypto.randomUUID();
    };

    /**
     * Drops everything held for the previous person: the cart, the badge's seed and any pending
     * checkout attempt. Runs when the viewer signs out or another account takes the tab over.
     */
    useResetOnViewerChange(() => {
        cart.value = undefined;
        summarySeed.value = undefined;
        mintCheckoutIdempotencyKey();
    });

    /**
     * Fetches the lightweight summary. Resolves with nothing for a guest — a 401 here means "no
     * cart", which is an ordinary state for a header, not an error worth a toast.
     *
     * @returns A promise resolving with the summary, or nothing.
     */
    const fetchSummary = () =>
        getCartSummary()
            .then((response) => {
                summarySeed.value = response.data;
                return response.data;
            })
            .catch((error: unknown) => {
                // 401 only — a guest has no cart. Anything else is a real failure, and swallowing
                // it would empty the header badge for someone whose cart is full.
                rethrowUnlessAbsent(error, 401);
                summarySeed.value = undefined;
                return undefined;
            });

    /**
     * Fetches the full cart (items + summary) and stores it.
     *
     * @returns A promise resolving with the cart response.
     */
    const fetchCart = () =>
        fetchAny(() =>
            getCart().then((response) => {
                cart.value = response.data;
                return response.data;
            })
        );

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
        fetchAny(() =>
            addCartItem({ productId, quantity }).then((response) => {
                cart.value = response.data;
                // The basket just changed — any checkout attempt still pending is now stale (B19).
                mintCheckoutIdempotencyKey();
                return response.data;
            })
        );

    /**
     * Sets the exact quantity of an item already in the cart.
     *
     * @param productId - Product whose line is updated.
     * @param quantity - New quantity.
     * @returns A promise resolving with the updated cart response.
     */
    const updateCartItem = (productId: string, quantity: number) =>
        fetchAny(() =>
            updateCartItemById(productId, { quantity }).then((response) => {
                cart.value = response.data;
                // See addCartItemAction — a changed line means a new checkout attempt (B19).
                mintCheckoutIdempotencyKey();
                return response.data;
            })
        );

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
        fetchAny(() =>
            setCartShippingMethod({ shippingMethodId }).then((response) => {
                cart.value = response.data;
                // The cart's own choice, part of what checkout charges — a change here is a new
                // checkout attempt too (B19).
                mintCheckoutIdempotencyKey();
                return response.data;
            })
        );

    /**
     * Removes a product's line from the cart entirely.
     *
     * @param productId - Product to remove.
     * @returns A promise resolving with the updated cart response.
     */
    const removeCartItemAction = (productId: string) =>
        fetchAny(() =>
            removeCartItem(productId).then((response) => {
                cart.value = response.data;
                // See addCartItemAction — a changed basket means a new checkout attempt (B19).
                mintCheckoutIdempotencyKey();
                return response.data;
            })
        );

    /**
     * Empties the cart entirely. `DELETE /cart/all` — its own URL, not what `removeCartItem`
     * falls back to when a product id goes missing.
     *
     * @returns A promise resolving with the updated (empty) cart response.
     */
    const clearCartAction = () =>
        fetchAny(() =>
            clearCart().then((response) => {
                cart.value = response.data;
                // See addCartItemAction — an emptied basket means a new checkout attempt (B19).
                mintCheckoutIdempotencyKey();
                return response.data;
            })
        );

    /**
     * What the local cart becomes once checkout empties it server-side (FA33) — a known state,
     * not a guess, since the server always empties the cart on a successful checkout. Takes the
     * currency as an argument rather than hardcoding one: the shop's currency does not change
     * just because the basket emptied (FA37).
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
     * Turns the authenticated user's cart into an order.
     *
     * Emits nothing: every checkout outcome the API saw is reported by the backend from the
     * handler that decided it, and a request that never arrived is already a failed span in Faro.
     *
     * Sends {@link checkoutIdempotencyKey} on every attempt (B19): a retry after a network error
     * or a 5xx reuses it, since neither answer is conclusive; any other outcome mints a fresh one
     * for whatever the caller tries next.
     *
     * @param checkoutData - Optional checkout payload (address, payment method, order notes).
     * @returns A promise resolving with the created order.
     */
    const checkout = (checkoutData?: CheckoutRequest) =>
        fetchAny(() =>
            apiCheckout(checkoutData, {
                headers: { [IDEMPOTENCY_KEY_HEADER]: checkoutIdempotencyKey.value }
            })
                .then((response) => {
                    // The server empties the cart on success (FA33): setting it to the known-empty
                    // shape, rather than dropping it to `undefined`, is what keeps the header badge
                    // from falling back to `summarySeed`'s stale count from before checkout ran.
                    // The currency itself survives the empty — the order was just frozen from the
                    // same basket this cart is still showing, so its own is the same one; the shop's
                    // only reads for a cart the caller never `fetchCart`/`fetchSummary`'d.
                    cart.value = emptyCart(liveSummary.value?.currency ?? shopCurrency.value);
                    mintCheckoutIdempotencyKey();
                    return response.data;
                })
                .catch((error: unknown) => {
                    // Nothing conclusive happened (no answer, or the server's own failure): keep
                    // the key so a retry is still the SAME attempt. Anything else — a 4xx like
                    // `CART_EMPTY`/`CART_CHANGED` — is a definitive answer, so the caller's next
                    // attempt needs a fresh one.
                    if (!isRetryableFailure(error)) mintCheckoutIdempotencyKey();
                    throw error;
                })
        );

    /**
     * Copies one of the caller's own orders back into the cart. The response is the updated
     * cart — products that left the catalogue were skipped server-side, so replacing the local
     * copy with it is also what makes the skip visible.
     *
     * @param orderId - One of the caller's own orders.
     * @returns A promise resolving with the updated cart response.
     */
    const reorder = (orderId: string) =>
        fetchAny(() =>
            apiReorder(orderId).then((response) => {
                cart.value = response.data;
                // See addCartItemAction — a refilled basket means a new checkout attempt (B19).
                mintCheckoutIdempotencyKey();
                return response.data;
            })
        );

    return {
        cart,
        cartItems,
        cartSummary,
        cartShipping,
        badgeQuantity,
        badgeMoney,
        fetchSummary,

        loading,
        fetchCart,
        checkout,
        reorder,
        addCartItem: addCartItemAction,
        updateCartItem,
        removeCartItem: removeCartItemAction,
        clearCart: clearCartAction,
        setShippingMethod
    };
});
