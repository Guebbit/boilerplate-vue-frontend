import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useStructureRestApi } from '@guebbit/vue-toolkit';
import { cartApi } from '@/utils/api.ts';
import type { CartItem, CartResponse, CartSummaryResponse } from '@types';

export const useCartStore = defineStore('cart', () => {
    const { loading, fetchAny } = useStructureRestApi<CartItem, string>();

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
            cartApi.getCart().then(({ data }) => {
                cart.value = data as CartResponse;
            })
        );

    /**
     * Add or update a cart item (upserts the item, creating it if absent)
     *
     * @param productId
     * @param quantity
     */
    const upsertCartItem = (productId: string, quantity: number) =>
        fetchAny(() =>
            cartApi.upsertCartItem({ productId, quantity }).then(({ data }) => {
                cart.value = data as CartResponse;
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
            cartApi.updateCartItemById(productId, { quantity }).then(({ data }) => {
                cart.value = data as CartResponse;
            })
        );

    /**
     * Remove a specific product from the cart
     *
     * @param productId
     */
    const removeCartItem = (productId: string) =>
        fetchAny(() =>
            cartApi.removeCartItem(productId).then(({ data }) => {
                cart.value = data as CartResponse;
            })
        );

    /**
     * Empty the cart entirely, or remove a single item if productId is supplied.
     * Delegates to DELETE /cart (body: { productId }) for single-item removal
     * and DELETE /cart (no body) to clear all items.
     *
     * @param productId  When provided, only this product's line is removed
     */
    const clearCart = (productId?: string) =>
        fetchAny(() =>
            cartApi.clearCart(productId ? { productId } : undefined).then(({ data }) => {
                cart.value = data as CartResponse;
            })
        );

    return {
        cart,
        cartItems,
        cartSummary,
        cartCount,

        loading,
        fetchCart,
        upsertCartItem,
        updateCartItem,
        removeCartItem,
        clearCart
    };
});
