import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import { getCart, upsertCartItem, updateCartItemById, removeCartItem, clearCart } from '@api';
import type { CartItem, CartResponse, CartSummaryResponse } from '@types';
import { useObservabilityStore, analyticsEvents } from '@/stores/observability';
import {
    buildCartItemAddedPayload,
    buildCartItemRemovedPayload,
    buildCartItemUpdatedPayload
} from '@/entities/cart';

/**
 * Owns the authenticated user's shopping cart: every action replaces the local
 * cart with the authoritative payload returned by the API.
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
                obs.track(
                    analyticsEvents.CART_ITEM_ADDED,
                    buildCartItemAddedPayload(productId, quantity)
                );
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
                const obs = useObservabilityStore();
                obs.track(
                    analyticsEvents.CART_ITEM_UPDATED,
                    buildCartItemUpdatedPayload(productId, quantity)
                );
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
                obs.track(
                    analyticsEvents.CART_ITEM_REMOVED,
                    buildCartItemRemovedPayload(productId)
                );
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

    return {
        cart,
        cartItems,
        cartSummary,
        cartCount,

        loading,
        fetchCart,
        upsertCartItem: upsertCartItemAction,
        updateCartItem,
        removeCartItem: removeCartItemAction,
        clearCart: clearCartAction
    };
});
