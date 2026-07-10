import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import {
    getCart,
    upsertCartItem,
    updateCartItemById,
    removeCartItem,
    clearCart
} from '@/utils/api.ts';
import type { CartItem, CartResponse, CartSummaryResponse } from '@types';
import { useObservabilityStore, analyticsEvents } from '@/stores/observability';

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
     * Fetch the full cart
     */
    const fetchCart = () =>
        fetchAny(() =>
            getCart().then((response) => {
                cart.value = response.data;
                return response.data;
            })
        );

    /**
     * Add or update a cart item (upserts the item, creating it if absent)
     *
     * @param productId
     * @param quantity
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
     * Set the exact quantity for an existing cart item
     *
     * @param productId
     * @param quantity
     */
    const updateCartItem = (productId: string, quantity: number) =>
        fetchAny(() =>
            updateCartItemById(productId, { quantity }).then((response) => {
                cart.value = response.data;
                return response.data;
            })
        );

    /**
     * Remove a specific product from the cart
     *
     * @param productId
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
     * Empty the cart entirely, or remove a single item if productId is supplied.
     * Delegates to DELETE /cart (body: { productId }) for single-item removal
     * and DELETE /cart (no body) to clear all items.
     *
     * @param productId  When provided, only this product's line is removed
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
