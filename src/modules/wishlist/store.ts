/**
 * @module
 * Pinia store for the wishlist module. Every mutating action replaces the local list
 * wholesale with the payload the API returned; `moveToCart` additionally refetches the
 * cart store so the header badge cannot lag the write it just caused.
 */
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useStructureRestApi } from '@guebbit/vue-toolkit';
import { getWishlist, addWishlistItem, removeWishlistItem, moveWishlistItemToCart } from '@api';
import type { WishlistItem } from '@types';
import { useCartStore } from '@/modules/cart';
import { queryClient } from '@/infrastructure/query-client.ts';
import { useResetOnViewerChange } from '@/infrastructure/utils/use-reset-on-viewer-change.ts';

/**
 * The visitor's saved products — ids only, like the cart's lines: the view joins them against
 * whatever product data it holds, and every action replaces the local list with the payload the
 * API answered with.
 *
 * Depends on cart for exactly one thing: move-to-cart changes the cart server-side, and the
 * header's badge must not lag behind a write this store initiated.
 */
export const useWishlistStore = defineStore('wishlist', () => {
    /**
     * The toolkit's REST slice for this store: the loading flag and the `fetchAny` wrapper
     * every action below goes through.
     */
    const { loading, fetchAny } = useStructureRestApi<WishlistItem, string>({
        resourceKey: 'wishlist',
        queryClient
    });

    /**
     * The saved lines.
     */
    const items = ref<WishlistItem[]>([]);

    /**
     * The one wishlist read in flight, or already answered for this person — what lets fifty
     * hearts on one grid cost a single `GET /wishlist`. `undefined` until the first ask, and again
     * after a failure or a change of person, so the next ask reads afresh.
     */
    let shared: Promise<WishlistItem[] | undefined> | undefined;

    /**
     * Saved product ids, for O(1) "is this saved" reads.
     */
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
                items.value = response.data.items;
                return items.value;
            })
        );

    /**
     * The wishlist for a heart that only needs to know what is saved: the first call reads it, every
     * later call reuses that read. {@link fetchWishlist} stays the door that always asks the server.
     *
     * @returns A promise resolving with the saved lines.
     */
    const ensureWishlist = () => {
        shared ??= fetchWishlist().catch((error: unknown) => {
            shared = undefined;
            throw error;
        });
        return shared;
    };

    /**
     * Saves a product: `PUT /wishlist/{productId}`, no body. Idempotent server-side, so a
     * double-clicked heart answers the same list.
     *
     * @param productId - The product to save.
     * @returns A promise resolving with the updated lines.
     */
    const addToWishlist = (productId: string) =>
        fetchAny(() =>
            addWishlistItem(productId).then((response) => {
                items.value = response.data.items;
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
                items.value = response.data.items;
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
                items.value = response.data.items;
                return useCartStore()
                    .fetchCart()
                    .then(() => items.value);
            })
        );

    /**
     * Forgets the previous person's saved lines and the read that fetched them, so the next
     * person's heart asks the server rather than trusting someone else's answer.
     */
    useResetOnViewerChange(() => {
        items.value = [];
        shared = undefined;
    });

    return {
        items,
        isSaved,

        loading,
        fetchWishlist,
        ensureWishlist,
        addToWishlist,
        removeFromWishlist,
        moveToCart
    };
});
