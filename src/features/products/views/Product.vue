<template>
    <LayoutDefault id="product-target">
        <template #header>
            <h1 class="text-h4 mb-6">
                <span>{{ t('product-target-page.page-title') }}</span>
            </h1>
        </template>

        <section class="d-flex flex-column ga-6">
            <VRow>
                <VCol cols="12" lg="6">
                    <ItemDetailHero
                        :title="heroTitle"
                        :description="heroDescription"
                        :eyebrow="currentProduct?.id"
                    >
                        <template #icon><VIcon icon="$package" size="36" /></template>
                    </ItemDetailHero>
                </VCol>

                <VCol cols="12" lg="6">
                    <VRow>
                        <VCol cols="12" md="4">
                            <CardMaterialStat
                                :title="t('product-target-page.label-price')"
                                :value="formatCurrency(currentProduct?.price)"
                            />
                        </VCol>
                        <VCol cols="12" md="4">
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
                        </VCol>
                        <VCol cols="12" md="4">
                            <CardMaterialStat
                                :title="t('product-target-page.label-created-at')"
                                :value="formatDateTime(currentProduct?.createdAt)"
                                accent="tertiary"
                            />
                        </VCol>
                    </VRow>
                </VCol>
            </VRow>

            <VRow>
                <VCol cols="12" lg="8">
                    <CardDetail>
                        <h3 class="text-h6 mb-4">{{ t('generic.details') }}</h3>

                        <VRow v-if="currentProduct">
                            <VCol cols="12" md="6">
                                <ItemDetailField
                                    :label="t('product-target-page.label-id')"
                                    :value="currentProduct.id"
                                    icon="#"
                                />
                            </VCol>
                            <VCol cols="12" md="6">
                                <ItemDetailField
                                    :label="t('product-target-page.label-title')"
                                    :value="currentProduct.title"
                                    icon="$tag"
                                />
                            </VCol>
                            <VCol cols="12" md="6">
                                <ItemDetailField
                                    :label="t('product-target-page.label-price')"
                                    :value="formatCurrency(currentProduct.price)"
                                    icon="💶"
                                />
                            </VCol>
                            <VCol cols="12" md="6">
                                <ItemDetailField
                                    :label="t('product-target-page.label-active')"
                                    icon="●"
                                >
                                    <VChip color="primary" variant="tonal">{{
                                        productStatus
                                    }}</VChip>
                                </ItemDetailField>
                            </VCol>
                            <VCol cols="12">
                                <ItemDetailField
                                    :label="t('product-target-page.label-description')"
                                    :value="formatText(currentProduct.description)"
                                    icon="📝"
                                    full-width
                                />
                            </VCol>
                            <VCol cols="12">
                                <ItemDetailField
                                    :label="t('product-target-page.label-updated-at')"
                                    :value="formatDateTime(currentProduct.updatedAt)"
                                    icon="🕒"
                                    full-width
                                />
                            </VCol>
                        </VRow>
                        <p v-else class="text-body-1 mb-0">{{ t('generic.loading-state') }}</p>
                    </CardDetail>
                </VCol>

                <VCol cols="12" lg="4">
                    <CardDetail as="aside" class="d-flex flex-column ga-4">
                        <CardInfo
                            :title="heroTitle"
                            :description="heroDescription"
                            variant="primary"
                        >
                            <template #icon><VIcon icon="$package" size="32" /></template>
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
                </VCol>
            </VRow>

            <div class="d-flex flex-wrap ga-3">
                <VBtn
                    v-if="currentProduct"
                    :to="routerLinkI18n({ name: 'ProductEdit', params: { id: currentProduct.id } })"
                    color="primary"
                    prepend-icon="$pencil"
                >
                    {{ t('product-target-page.button-go-to-edit') }}
                </VBtn>
                <VBtn :to="routerLinkI18n({ name: 'ProductsList' })" variant="tonal">
                    {{ t('product-target-page.button-go-to-list') }}
                </VBtn>
            </div>
        </section>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'ProductTargetPage'
};
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { VBtn, VChip, VCol, VIcon, VRow } from 'vuetify/components';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useProductsStore } from '@/features/products/store';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import ItemDetailField from '@/components/molecules/ItemDetailField.vue';
import CardDetail from '@/components/organisms/CardDetail.vue';
import CardInfo from '@/components/organisms/CardInfo.vue';
import ItemDetailHero from '@/components/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/components/organisms/CardMaterialStat.vue';
import { useItemDetailRecord } from '@/composables/useItemDetailRecord.ts';
import { useItemDetailDisplay } from '@/composables/useItemDetailDisplay.ts';

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
const { fetchProduct } = useProductsStore();
const { currentProduct, selectedProductId } = storeToRefs(useProductsStore());

/**
 * Shared value formatters for detail pages.
 */
const { formatText, formatDateTime, formatCurrency, formatFlag } = useItemDetailDisplay();

/**
 * Hero title fallback chain.
 */
const heroTitle = computed(
    () => currentProduct.value?.title ?? id ?? t('product-target-page.page-title')
);

/**
 * Hero secondary text.
 */
const heroDescription = computed(() => formatText(currentProduct.value?.description));

/**
 * Human-readable active/inactive status chip label.
 */
const productStatus = computed(() =>
    formatFlag(currentProduct.value?.active, t('generic.enabled'), t('generic.disabled'))
);

/**
 * Activates record selection + onBeforeMount record fetch.
 */
useItemDetailRecord({
    id,
    selectedId: selectedProductId,
    fetchRecord: fetchProduct
});
</script>
