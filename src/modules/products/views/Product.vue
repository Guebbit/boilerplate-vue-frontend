<script lang="ts">
export default {
    name: 'ProductTargetPage'
};
</script>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { routerLinkI18n } from '@/infrastructure/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useProductsStore } from '@/modules/products/store';
import { useCartStore } from '@/modules/cart';
import { useWishlistStore } from '@/modules/wishlist';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { notifyErrorMessages } from '@/infrastructure/errors.ts';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { Heart, Package, ShoppingCart } from 'lucide-vue-next';
import ItemDetailField from '@/ui/molecules/ItemDetailField.vue';
import ItemDetailLayout from '@/ui/organisms/ItemDetailLayout.vue';
import CardDetail from '@/ui/organisms/CardDetail.vue';
import CardInfo from '@/ui/organisms/CardInfo.vue';
import ItemDetailHero from '@/ui/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/ui/organisms/CardMaterialStat.vue';
import {
    formatText,
    formatDateTime,
    formatCurrency,
    formatFlag
} from '@/infrastructure/formatters.ts';

/**
 * Localized dictionary helper.
 */
const { t } = useI18n();

/**
 * Route-provided product id.
 */
const { id } = defineProps<{
    id?: string;
}>();

/**
 * Product store selectors and fetch API.
 */
const { watchProduct } = useProductsStore();
const { currentProduct } = storeToRefs(useProductsStore());

/**
 * Hero heading.
 *
 * @returns The loaded product title, the route id while loading, or the generic
 *  page title as a last resort.
 */
const heroTitle = computed(
    () => currentProduct.value?.title ?? id ?? t('product-target-page.page-title')
);

/**
 * Hero subheading.
 *
 * @returns The product description, or the empty-value glyph when blank.
 */
const heroDescription = computed(() => formatText(currentProduct.value?.description));

/**
 * Label of the status chip.
 *
 * @returns The localized enabled/disabled wording, or the empty-value glyph
 *  while the product is unknown.
 */
const productStatus = computed(() =>
    formatFlag(currentProduct.value?.active, t('generic.enabled'), t('generic.disabled'))
);

/**
 * Selects and (re)fetches the product whenever the route id changes.
 */
watchProduct(() => id);

/**
 * Storefront actions — the two writes a visitor makes from this page.
 */
const { addMessage } = useNotificationsStore();
const { isAuth } = storeToRefs(useSessionStore());
const { upsertCartItem } = useCartStore();
const { addToWishlist, removeFromWishlist, isSaved, fetchWishlist } = useWishlistStore();

/**
 * Whether the shelf still holds anything. An absent `stock` reads as unconstrained — rows that
 * predate the column must not all render as sold out, mirroring the checkout rule.
 *
 * @returns `true` when the product cannot currently be bought.
 */
const outOfStock = computed(() => currentProduct.value?.stock === 0);

/**
 * Puts one unit in the cart.
 *
 * @returns Nothing; the outcome is reported as a toast.
 */
const handleAddToCart = () => {
    if (!currentProduct.value) return;
    upsertCartItem(currentProduct.value.id, 1)
        .then(() => addMessage(t('product-target-page.success-add-to-cart')))
        .catch((error) => notifyErrorMessages(addMessage, error));
};

/**
 * Toggles the heart: saved products leave the wishlist, everything else joins it.
 *
 * @returns Nothing; the outcome is reported as a toast on failure only — the heart itself is
 *  the success feedback.
 */
const handleToggleWishlist = () => {
    if (!currentProduct.value) return;
    const productId = currentProduct.value.id;
    (isSaved(productId) ? removeFromWishlist(productId) : addToWishlist(productId)).catch((error) =>
        notifyErrorMessages(addMessage, error)
    );
};

// The heart needs to know what is already saved; guests have no wishlist to ask for.
onMounted(() => {
    if (isAuth.value) fetchWishlist();
});
</script>

<template>
    <LayoutDefault id="product-target" :title="t('product-target-page.page-title')">
        <ItemDetailLayout accent="primary">
            <template #hero>
                <ItemDetailHero
                    :title="heroTitle"
                    :description="heroDescription"
                    :eyebrow="currentProduct?.id"
                >
                    <template #icon><Package :size="32" /></template>
                </ItemDetailHero>
            </template>

            <template #stats>
                <CardMaterialStat
                    :title="t('product-target-page.label-price')"
                    :value="formatCurrency(currentProduct?.price)"
                />
                <CardMaterialStat
                    data-test="product-stock"
                    :title="t('product-target-page.label-stock')"
                    :value="
                        outOfStock
                            ? t('product-target-page.out-of-stock')
                            : formatText(currentProduct?.stock?.toString())
                    "
                    accent="secondary"
                />
                <CardMaterialStat
                    :title="t('product-target-page.label-active')"
                    :value="
                        formatFlag(
                            currentProduct?.active,
                            t('generic.enabled'),
                            t('generic.disabled')
                        )
                    "
                    accent="secondary"
                />
                <CardMaterialStat
                    :title="t('product-target-page.label-created-at')"
                    :value="formatDateTime(currentProduct?.createdAt)"
                    accent="tertiary"
                />
            </template>

            <v-card v-if="currentProduct" class="flex flex-wrap items-center gap-2 p-5">
                <v-btn
                    color="primary"
                    data-test="add-to-cart"
                    :disabled="!isAuth || outOfStock"
                    @click="handleAddToCart"
                >
                    <ShoppingCart :size="18" class="mr-1" aria-hidden="true" />
                    {{
                        outOfStock
                            ? t('product-target-page.out-of-stock')
                            : t('product-target-page.button-add-to-cart')
                    }}
                </v-btn>
                <v-btn
                    v-if="isAuth"
                    variant="tonal"
                    :color="isSaved(currentProduct.id) ? 'secondary' : undefined"
                    data-test="wishlist-toggle"
                    :aria-label="
                        isSaved(currentProduct.id)
                            ? t('product-target-page.button-unsave-wishlist')
                            : t('product-target-page.button-save-wishlist')
                    "
                    @click="handleToggleWishlist"
                >
                    <Heart
                        :size="18"
                        class="mr-1"
                        :fill="isSaved(currentProduct.id) ? 'currentColor' : 'none'"
                        aria-hidden="true"
                    />
                    {{
                        isSaved(currentProduct.id)
                            ? t('product-target-page.button-unsave-wishlist')
                            : t('product-target-page.button-save-wishlist')
                    }}
                </v-btn>
                <p v-if="!isAuth" class="text-sm opacity-70">
                    {{ t('product-target-page.login-to-buy') }}
                </p>
            </v-card>

            <CardDetail>
                <h3 class="mb-5 text-lg font-semibold">{{ t('generic.details') }}</h3>

                <div v-if="currentProduct" class="grid gap-4 sm:grid-cols-2">
                    <ItemDetailField
                        :label="t('product-target-page.label-id')"
                        :value="currentProduct.id"
                        icon="#"
                    />
                    <ItemDetailField
                        :label="t('product-target-page.label-title')"
                        :value="currentProduct.title"
                        icon="🏷"
                    />
                    <ItemDetailField
                        :label="t('product-target-page.label-price')"
                        :value="formatCurrency(currentProduct.price)"
                        icon="💶"
                    />
                    <ItemDetailField :label="t('product-target-page.label-active')" icon="●">
                        <v-chip variant="tonal" color="primary" class="font-semibold">
                            {{ productStatus }}
                        </v-chip>
                    </ItemDetailField>
                    <ItemDetailField
                        :label="t('product-target-page.label-description')"
                        :value="formatText(currentProduct.description)"
                        icon="📝"
                        full-width
                    />
                    <ItemDetailField
                        :label="t('product-target-page.label-updated-at')"
                        :value="formatDateTime(currentProduct.updatedAt)"
                        icon="🕒"
                        full-width
                    />
                </div>
                <p v-else class="m-0 opacity-75">{{ t('generic.loading-state') }}</p>
            </CardDetail>

            <template #aside>
                <CardDetail as="aside" class="flex flex-col gap-4">
                    <CardInfo :title="heroTitle" :description="heroDescription" variant="primary">
                        <template #icon><Package :size="28" /></template>
                    </CardInfo>
                    <ItemDetailField
                        :label="t('product-target-page.label-created-at')"
                        :value="formatDateTime(currentProduct?.createdAt)"
                        icon="📅"
                    />
                    <ItemDetailField
                        :label="t('product-target-page.label-updated-at')"
                        :value="formatDateTime(currentProduct?.updatedAt)"
                        icon="🕘"
                    />
                </CardDetail>
            </template>

            <template #actions>
                <v-btn
                    v-if="currentProduct"
                    color="secondary"
                    :to="routerLinkI18n({ name: 'ProductEdit', params: { id: currentProduct.id } })"
                >
                    {{ t('product-target-page.button-go-to-edit') }}
                </v-btn>
                <v-btn variant="tonal" :to="routerLinkI18n({ name: 'ProductsList' })">
                    {{ t('product-target-page.button-go-to-list') }}
                </v-btn>
            </template>
        </ItemDetailLayout>
    </LayoutDefault>
</template>
