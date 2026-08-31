<script lang="ts">
export default {
    name: 'WishlistPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Wishlist page. Renders the store's saved lines, joined against the cart store's
 * product-title cache, with the two exits: move-to-cart and remove.
 */
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Heart, ShoppingCart } from 'lucide-vue-next';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useWishlistStore } from '@/modules/wishlist/store.ts';
import { useCartStore } from '@/modules/cart';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';

import LayoutDefault from '@/app/layouts/LayoutDefault.vue';

/**
 * The saved products, rendered from their ids exactly as the cart page renders its lines — the
 * id links to the product page, which is where the full record lives.
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const { fetchWishlist, removeFromWishlist, moveToCart } = useWishlistStore();
const { items } = storeToRefs(useWishlistStore());

/**
 * The saved products' titles — the wishlist answers ids only, and the cart store holds the join.
 */
const { titleOf, resolveTitles } = useCartStore();

/**
 * Moves one saved product into the cart.
 *
 * @param productId - The saved product.
 * @returns Nothing; the outcome is reported as a toast.
 */
const handleMoveToCart = (productId: string) => {
    moveToCart(productId)
        .then(() => addMessage(t('wishlist-page.success-moved')))
        .catch((error) => notifyErrorMessages(addMessage, error));
};

/**
 * Removes one saved product.
 *
 * @param productId - The saved product.
 * @returns Nothing; the outcome is reported as a toast.
 */
const handleRemove = (productId: string) => {
    removeFromWishlist(productId)
        .then(() => addMessage(t('wishlist-page.success-removed')))
        .catch((error) => notifyErrorMessages(addMessage, error));
};

/**
 * Loads the wishlist on mount, then resolves the saved products' titles from the cart store's
 * cache so each line has a name to render.
 */
onMounted(() =>
    fetchWishlist().then((lines) => resolveTitles((lines ?? []).map(({ productId }) => productId)))
);
</script>

<template>
    <LayoutDefault id="wishlist-page" :title="t('wishlist-page.page-title')">
        <v-empty-state v-if="items.length === 0" :title="t('wishlist-page.empty')">
            <template #media>
                <Heart :size="64" class="text-secondary" aria-hidden="true" />
            </template>
            <template #actions>
                <v-btn color="primary" :to="routerLinkI18n({ name: 'ProductsList' })">
                    {{ t('wishlist-page.button-go-to-products') }}
                </v-btn>
            </template>
        </v-empty-state>

        <div v-else class="mx-auto flex w-full max-w-3xl flex-col gap-4">
            <v-card
                v-for="item in items"
                :key="'wishlist-item-' + item.productId"
                data-test="wishlist-item"
                class="p-5"
            >
                <h2 class="text-lg font-semibold">
                    <router-link
                        class="underline"
                        :to="
                            routerLinkI18n({
                                name: 'ProductTarget',
                                params: { id: item.productId }
                            })
                        "
                    >
                        {{ titleOf(item.productId) }}
                    </router-link>
                </h2>
                <div class="mt-3 flex flex-wrap items-center gap-2">
                    <v-btn
                        color="primary"
                        variant="tonal"
                        size="small"
                        data-test="wishlist-move-to-cart"
                        :aria-label="
                            t('wishlist-page.button-move-to-cart-named', {
                                id: titleOf(item.productId)
                            })
                        "
                        @click="handleMoveToCart(item.productId)"
                    >
                        <ShoppingCart :size="16" class="mr-1" aria-hidden="true" />
                        {{ t('wishlist-page.button-move-to-cart') }}
                    </v-btn>
                    <v-btn
                        variant="text"
                        color="error"
                        size="small"
                        data-test="wishlist-remove"
                        :aria-label="
                            t('wishlist-page.button-remove-named', { id: titleOf(item.productId) })
                        "
                        @click="handleRemove(item.productId)"
                    >
                        {{ t('wishlist-page.button-remove') }}
                    </v-btn>
                </div>
            </v-card>
        </div>
    </LayoutDefault>
</template>
