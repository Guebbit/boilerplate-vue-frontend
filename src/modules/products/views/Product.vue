<script lang="ts">
export default {
    name: 'ProductTargetPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Public product detail page: renders the fetched record, and hosts the `product-actions` slot
 * where other modules put the storefront's visitor writes (add to cart, toggle wishlist).
 */
import { computed } from 'vue';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useProductsStore } from '@/modules/products/store';
import { useSlot } from '@/kernel/slots';
import { useSessionStore } from '@/infrastructure/session.ts';
import { Calendar, Circle, Clock, Euro, FileText, Hash, Package, Tag } from 'lucide-vue-next';
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
} from '@/infrastructure/utils/formatters.ts';

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
 * Product store's watch action.
 */
const { watchProduct } = useProductsStore();

/**
 * Product store's reactive current-record reference.
 */
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
 * Selects and (re)fetches the product whenever the route id changes — and whenever the language
 * does: the products store scopes its cache by locale (`dependsOn`), and the toolkit re-runs an
 * active watcher under the new scope, since the API resolves `title` and `description` against
 * the caller's language.
 */
watchProduct(() => id);

/**
 * Whether a visitor is signed in — a guest is told to sign in instead of being offered the
 * storefront actions.
 */
const session = useSessionStore();
const { isAuth } = storeToRefs(session);

/**
 * The storefront buttons other modules contribute (add to cart, save to wishlist). This page
 * owns the slot and hands each component the product; it never learns who they are.
 */
const productActions = useSlot('product-actions');

/**
 * Whether the shelf still holds anything. An absent `stock` reads as unconstrained — rows that
 * predate the column must not all render as sold out, mirroring the checkout rule.
 *
 * @returns `true` when the product cannot currently be bought.
 */
const outOfStock = computed(() => currentProduct.value?.available === 0);
</script>

<template>
    <div id="product-target">
        <ItemDetailLayout accent="primary">
            <template #hero>
                <ItemDetailHero
                    :title="heroTitle"
                    :description="heroDescription"
                    :eyebrow="currentProduct?.id"
                    :has-image="true"
                    :image-url="currentProduct?.imageUrl"
                    :thumbnail-url="currentProduct?.thumbnailUrl"
                    :image-alt="t('product-target-page.image-alt', { name: heroTitle })"
                />
            </template>

            <template #stats>
                <CardMaterialStat
                    :title="t('product-target-page.label-price')"
                    :value="formatCurrency(currentProduct?.price, currentProduct?.currency ?? '')"
                />
                <CardMaterialStat
                    data-test="product-stock"
                    :title="t('product-target-page.label-stock')"
                    :value="
                        outOfStock
                            ? t('product-target-page.out-of-stock')
                            : formatText(currentProduct?.available?.toString())
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

            <v-card v-if="currentProduct" class="flex flex-wrap items-start gap-4 p-5">
                <component
                    :is="action"
                    v-for="(action, index) in productActions"
                    :key="index"
                    :product="currentProduct"
                />
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
                        :icon="Hash"
                    />
                    <ItemDetailField
                        :label="t('product-target-page.label-title')"
                        :value="currentProduct.title"
                        :icon="Tag"
                    />
                    <ItemDetailField
                        :label="t('product-target-page.label-price')"
                        :value="formatCurrency(currentProduct.price, currentProduct.currency)"
                        :icon="Euro"
                    />
                    <ItemDetailField :label="t('product-target-page.label-active')" :icon="Circle">
                        <v-chip variant="tonal" color="primary" class="font-semibold">
                            {{ productStatus }}
                        </v-chip>
                    </ItemDetailField>
                    <ItemDetailField
                        :label="t('product-target-page.label-description')"
                        :value="formatText(currentProduct.description)"
                        :icon="FileText"
                        full-width
                    />
                    <ItemDetailField
                        :label="t('product-target-page.label-updated-at')"
                        :value="formatDateTime(currentProduct.updatedAt)"
                        :icon="Clock"
                        full-width
                    />
                </div>
                <p v-else class="m-0 opacity-75">{{ t('generic.loading-state') }}</p>
            </CardDetail>

            <template #aside>
                <CardDetail as="aside" class="flex flex-col gap-4">
                    <CardInfo :title="heroTitle" :description="heroDescription" accent="primary">
                        <template #icon><Package :size="28" /></template>
                    </CardInfo>
                    <ItemDetailField
                        :label="t('product-target-page.label-created-at')"
                        :value="formatDateTime(currentProduct?.createdAt)"
                        :icon="Calendar"
                    />
                    <ItemDetailField
                        :label="t('product-target-page.label-updated-at')"
                        :value="formatDateTime(currentProduct?.updatedAt)"
                        :icon="Clock"
                    />
                </CardDetail>
            </template>

            <template #actions>
                <v-btn
                    v-if="currentProduct && session.can('update', 'Product')"
                    color="secondary"
                    data-test="go-to-edit"
                    :to="routerLinkI18n({ name: 'ProductEdit', params: { id: currentProduct.id } })"
                >
                    {{ t('product-target-page.button-go-to-edit') }}
                </v-btn>
                <v-btn variant="tonal" :to="routerLinkI18n({ name: 'ProductsList' })">
                    {{ t('product-target-page.button-go-to-list') }}
                </v-btn>
            </template>
        </ItemDetailLayout>
    </div>
</template>
