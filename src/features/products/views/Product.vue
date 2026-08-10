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

<script lang="ts">
export default {
    name: 'ProductTargetPage'
};
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useProductsStore } from '../store';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import { Package } from 'lucide-vue-next';
import ItemDetailField from '@/components/molecules/ItemDetailField.vue';
import ItemDetailLayout from '@/components/organisms/ItemDetailLayout.vue';
import CardDetail from '@/components/organisms/CardDetail.vue';
import CardInfo from '@/components/organisms/CardInfo.vue';
import ItemDetailHero from '@/components/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/components/organisms/CardMaterialStat.vue';
import { formatText, formatDateTime, formatCurrency, formatFlag } from '@/utils/formatters.ts';

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
</script>
