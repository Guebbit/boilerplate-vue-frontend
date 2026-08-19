import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import { getWishlist, addWishlistItem, removeWishlistItem, moveWishlistItemToCart } from '@api';
import type { WishlistItem } from '@types';
import { useCartStore } from '@/modules/cart';

/**
 * The visitor's saved products — ids only, like the cart's lines: the view joins them against
 * whatever product data it holds, and every action replaces the local list with the payload the
 * API answered with.
 *
 * Depends on cart for exactly one thing: move-to-cart changes the cart server-side, and the
 * header's badge must not lag behind a write this store initiated.
 */
export const useWishlistStore = defineStore('wishlist', () => {
    const { getLoading, setLoading } = useCoreStore();
    const { loading, fetchAny } = useStructureRestApi<WishlistItem, string>({
        getLoading,
        setLoading
    });

    /** The saved lines. */
    const items = ref<WishlistItem[]>([]);

    /** Saved product ids, for O(1) "is this saved" reads. */
    const savedProductIds = computed(() => new Set(items.value.map(({ productId }) => productId)));

    /**
     * Whether one product is saved — what a heart icon reads.
     *
     * @param productId - The product in question.
     * @returns `true` when it is on the wishlist.
     */
    const isSaved = (productId: string) => savedProductIds.value.has(productId);

    /**
     * Loads the wishlist.
     *
     * @returns A promise resolving with the saved lines.
     */
    const fetchWishlist = () =>
        fetchAny(() =>
            getWishlist().then((response) => {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- the generated envelope types promise `data`; the wire does not, and the store spec pins "a bare payload is empty, not a crash"
                items.value = response.data?.items ?? [];
                return items.value;
            })
        );

    /**
     * Saves a product. Idempotent server-side, so a double-clicked heart answers the same list.
     *
     * @param productId - The product to save.
     * @returns A promise resolving with the updated lines.
     */
    const addToWishlist = (productId: string) =>
        fetchAny(() =>
            addWishlistItem({ productId }).then((response) => {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- the generated envelope types promise `data`; the wire does not, and the store spec pins "a bare payload is empty, not a crash"
                items.value = response.data?.items ?? [];
                return items.value;
            })
        );

    /**
     * Removes a saved product.
     *
     * @param productId - The product to unsave.
     * @returns A promise resolving with the updated lines.
     */
    const removeFromWishlist = (productId: string) =>
        fetchAny(() =>
            removeWishlistItem(productId).then((response) => {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- the generated envelope types promise `data`; the wire does not, and the store spec pins "a bare payload is empty, not a crash"
                items.value = response.data?.items ?? [];
                return items.value;
            })
        );

    /**
     * The wishlist's exit: the saved line becomes a cart line server-side, so afterwards the
     * cart is refetched rather than guessed at — the cart store never invents a payload the API
     * did not send, and neither does this one on its behalf.
     *
     * @param productId - The saved product to move.
     * @returns A promise resolving with the updated saved lines.
     */
    const moveToCart = (productId: string) =>
        fetchAny(() =>
            moveWishlistItemToCart(productId).then((response) => {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- the generated envelope types promise `data`; the wire does not, and the store spec pins "a bare payload is empty, not a crash"
                items.value = response.data?.items ?? [];
                return useCartStore()
                    .fetchCart()
                    .then(() => items.value);
            })
        );

    return {
        items,
        savedProductIds,
        isSaved,

        loading,
        fetchWishlist,
        addToWishlist,
        removeFromWishlist,
        moveToCart
    };
});
