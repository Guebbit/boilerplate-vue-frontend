<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
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
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { Heart, ShoppingCart } from 'lucide-vue-next';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { linkIfRouted } from '@/kernel/route-link.ts';
import { useWishlistStore } from '@/modules/wishlist/store.ts';
import { useProductLines } from '@/modules/products';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';

import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';

/**
 * The saved products, rendered from their ids exactly as the cart page renders its lines — the
 * id links to the product page, which is where the full record lives.
 */
const { t } = useI18n();

/**
 * Router instance, for the `hasRoute` checks below — `products` is not a coupling this module's
 * `MODULE_EDGES` entry declares, so both its route names are guarded rather than assumed.
 */
const router = useRouter();

/**
 * The catalogue link the empty state offers — `undefined`, hiding the button entirely, on a
 * build with no `products` module.
 */
const productsListTo = computed(() => linkIfRouted(router, 'ProductsList'));

/**
 * A saved product's own page, or `undefined` when this build ships no `products` module — the
 * title then renders as plain text instead of a dead link.
 *
 * @param productId - The saved product.
 */
const productTargetTo = (productId: string) =>
    linkIfRouted(router, 'ProductTarget', { id: productId });

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * The session, asked whether this role may use a cart at all — staff may keep a wishlist but have
 * no basket to move a line into.
 */
const session = useSessionStore();

/**
 * The wishlist's three actions: load it, drop a line, and move a line into the cart.
 */
const { fetchWishlist, removeFromWishlist, moveToCart } = useWishlistStore();

/**
 * The wishlist's lines, and whether a move-to-cart or remove is already in flight — both actions
 * share the store's one loading flag, so either blocks the other.
 */
const { items, loading } = storeToRefs(useWishlistStore());

/**
 * The saved products' titles — the wishlist answers ids only, and the products store holds the
 * records.
 */
const { titleOf, loadProducts } = useProductLines();

/**
 * The saved lines' own blocked state — moving a line to the cart or removing it has no per-line
 * slot for an alert, and the list keeps working regardless, so both actions share ONE instance
 * rendered above the lines, the same reasoning `ProductsList.vue`'s row actions use.
 */
const {
    message: lineActionError,
    report: reportLineActionError,
    clear: clearLineActionError
} = useBlockingError();

/**
 * Moves one saved product into the cart.
 *
 * @param productId - The saved product.
 * @returns Nothing; a failure blocks the line actions in place ({@link lineActionError}).
 */
const handleMoveToCart = (productId: string) => {
    clearLineActionError();
    moveToCart(productId)
        .then(() => addMessage(t('wishlist-page.success-moved')))
        .catch((error) => reportLineActionError(error));
};

/**
 * Removes one saved product.
 *
 * @param productId - The saved product.
 * @returns Nothing; a failure blocks the line actions in place ({@link lineActionError}).
 */
const handleRemove = (productId: string) => {
    clearLineActionError();
    removeFromWishlist(productId)
        .then(() => addMessage(t('wishlist-page.success-removed')))
        .catch((error) => reportLineActionError(error));
};

/**
 * Loads the wishlist on mount, then the saved products in one batch so each line has a name to
 * render.
 */
onMounted(() =>
    fetchWishlist().then((lines) => loadProducts((lines ?? []).map(({ productId }) => productId)))
);
</script>

<template>
    <div id="wishlist-page">
        <v-empty-state v-if="items.length === 0" :title="t('wishlist-page.empty')">
            <template #media>
                <Heart :size="64" class="text-secondary" aria-hidden="true" />
            </template>
            <template v-if="productsListTo" #actions>
                <v-btn color="primary" :to="routerLinkI18n(productsListTo)">
                    {{ t('wishlist-page.button-go-to-products') }}
                </v-btn>
            </template>
        </v-empty-state>

        <div v-else class="mx-auto flex w-full max-w-3xl flex-col gap-4">
            <InlineErrorAlert :message="lineActionError" data-test="wishlist-line-action-error" />

            <v-card
                v-for="item in items"
                :key="'wishlist-item-' + item.productId"
                data-test="wishlist-item"
                class="p-5"
            >
                <h2 class="text-lg font-semibold">
                    <router-link
                        v-if="productTargetTo(item.productId)"
                        class="underline"
                        :to="routerLinkI18n(productTargetTo(item.productId)!)"
                    >
                        {{ titleOf(item.productId) }}
                    </router-link>
                    <span v-else>{{ titleOf(item.productId) }}</span>
                </h2>
                <div class="mt-3 flex flex-wrap items-center gap-2">
                    <v-btn
                        v-if="session.can('update', 'Cart')"
                        color="primary"
                        variant="tonal"
                        size="small"
                        data-test="wishlist-move-to-cart"
                        :disabled="loading"
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
                        :disabled="loading"
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
    </div>
</template>
