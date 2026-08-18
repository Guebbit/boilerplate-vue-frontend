import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import {
    getCart,
    getCartSummary,
    upsertCartItem,
    updateCartItemById,
    removeCartItem,
    clearCart,
    checkout as apiCheckout,
    reorder as apiReorder
} from '@api';
import type { CartItem, CartResponse, CartSummaryResponse, CheckoutRequest } from '@types';
import { useObservabilityStore } from '@/infrastructure/stores/observability.ts';
import { analyticsEvents } from '@/infrastructure/observability/events.ts';
import { apiErrorCode } from '@/infrastructure/utils/errors';

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
    const { getLoading, setLoading } = useCoreStore();
    const { loading, fetchAny } = useStructureRestApi<CartItem, string>({ getLoading, setLoading });

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
     * Number of distinct items in cart
     */
    const cartCount = computed(() => cartSummary.value?.itemsCount ?? 0);

    /**
     * The summary alone, as `GET /cart/summary` answers it — the lightweight read that exists so
     * a header badge does not cost the whole cart on every page. Only a SEED: every cart mutation
     * replaces `cart` wholesale, and the full response's summary is fresher from that moment on.
     */
    const summarySeed = ref<CartSummaryResponse | undefined>();

    /**
     * What the header badge wears: the loaded cart's count when one is loaded, the seed before.
     */
    const badgeQuantity = computed(() =>
        cart.value ? cart.value.summary.itemsCount : summarySeed.value?.itemsCount
    );

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
            .catch(() => {
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
     * Adds a product to the cart, or updates its quantity when already present.
     *
     * @param productId - Product to upsert.
     * @param quantity - Quantity to set for that product.
     * @returns A promise resolving with the updated cart response.
     */
    const upsertCartItemAction = (productId: string, quantity: number) =>
        fetchAny(() =>
            upsertCartItem({ productId, quantity }).then((response) => {
                const obs = useObservabilityStore();
                obs.track(analyticsEvents.CART_ITEM_ADDED, { product_id: productId, quantity });
                cart.value = response.data;
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
                const obs = useObservabilityStore();
                obs.track(analyticsEvents.CART_ITEM_REMOVED, { product_id: productId });
                cart.value = response.data;
                return response.data;
            })
        );

    /**
     * Empties the cart entirely, or removes a single item when a product is
     * supplied.
     *
     * Delegates to `DELETE /cart` with a `{ productId }` body for single-item
     * removal, and without a body to clear everything.
     *
     * @param productId - When provided, only this product's line is removed and
     *  no `cart_cleared` analytics event is emitted.
     * @returns A promise resolving with the updated cart response.
     */
    const clearCartAction = (productId?: string) =>
        fetchAny(() =>
            clearCart(productId ? { productId } : undefined).then((response) => {
                if (!productId) {
                    const obs = useObservabilityStore();
                    obs.track(analyticsEvents.CART_CLEARED);
                }
                cart.value = response.data;
                return response.data;
            })
        );

    /**
     * Turns the authenticated user's cart into an order.
     *
     * Reports BOTH outcomes. The backend emits `checkout_completed` and `checkout_failed` from the
     * same handler, and a funnel built across the two repos only balances if this side reports the
     * failures too — a drop-off that shows up on one side only reads as users abandoning checkout
     * rather than as checkout rejecting them.
     *
     * @param checkoutData - Optional checkout payload (email, order notes).
     * @returns A promise resolving with the checkout response, the created order included.
     */
    const checkout = (checkoutData?: CheckoutRequest) =>
        fetchAny(() =>
            apiCheckout(checkoutData).then(
                (response) => {
                    const obs = useObservabilityStore();
                    obs.track(analyticsEvents.CHECKOUT_COMPLETED, {
                        order_id: response.data?.order?.id,
                        total_price: response.data?.order?.totalPrice
                    });
                    /* The server empties the cart on success. The local copy is dropped rather
                     * than guessed at: this store never invents a payload the API did not send,
                     * and every getter already reads an unfetched cart as empty. */
                    cart.value = undefined;
                    return response.data;
                },
                (error: unknown) => {
                    const obs = useObservabilityStore();
                    obs.track(analyticsEvents.CHECKOUT_FAILED, { reason: apiErrorCode(error) });
                    throw error;
                }
            )
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
                const obs = useObservabilityStore();
                obs.track(analyticsEvents.CART_REORDERED, { order_id: orderId });
                cart.value = response.data;
                return response.data;
            })
        );

    return {
        cart,
        cartItems,
        cartSummary,
        cartCount,
        badgeQuantity,
        fetchSummary,

        loading,
        fetchCart,
        checkout,
        reorder,
        upsertCartItem: upsertCartItemAction,
        updateCartItem,
        removeCartItem: removeCartItemAction,
        clearCart: clearCartAction
    };
});
