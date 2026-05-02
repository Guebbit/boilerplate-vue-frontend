<template>
    <LayoutDefault id="product-target" class="item-detail-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('product-target-page.page-title') }}</span>
            </h1>
        </template>

        <section class="item-detail-page-content">
            <div class="item-detail-page-grid-top">
                <article class="theme-card theme-card-detail item-detail-page-hero animate-on-hover">
                    <div class="item-detail-page-hero-icon" aria-hidden="true">📦</div>
                    <div>
                        <p v-if="currentProduct?.id" class="item-detail-page-eyebrow">{{ currentProduct.id }}</p>
                        <h2 class="item-detail-page-hero-title">{{ heroTitle }}</h2>
                        <p class="item-detail-page-hero-description">{{ heroDescription }}</p>
                    </div>
                </article>

                <div class="item-detail-page-stats">
                    <MaterialStatCard
                        :title="t('product-target-page.label-price')"
                        :value="formatNumber(currentProduct?.price, priceFormat)"
                    />
                    <MaterialStatCard
                        :title="t('product-target-page.label-active')"
                        :value="formatFlag(currentProduct?.active, t('generic.enabled'), t('generic.disabled'))"
                        accent="secondary"
                    />
                    <MaterialStatCard
                        :title="t('product-target-page.label-created-at')"
                        :value="formatDateTime(currentProduct?.createdAt)"
                        accent="tertiary"
                    />
                </div>
            </div>

            <div class="item-detail-page-grid-main item-detail-page-grid-main-with-aside">
                <article class="theme-card theme-card-detail item-detail-page-main">
                    <div class="item-detail-page-section-header">
                        <h3>{{ t('generic.details') }}</h3>
                    </div>

                    <div v-if="currentProduct" class="item-detail-page-grid-fields">
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
                            :value="formatNumber(currentProduct.price, priceFormat)"
                            icon="💶"
                        />
                        <ItemDetailField :label="t('product-target-page.label-active')" icon="●">
                            <span class="item-detail-page-status-chip">{{ productStatus }}</span>
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
                    <p v-else class="item-detail-page-empty">{{ t('generic.loading-state') }}</p>
                </article>

                <aside class="theme-card theme-card-detail item-detail-page-aside">
                    <MaterialGraphicCard :title="heroTitle" :description="heroDescription" variant="primary" />
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
                </aside>
            </div>

            <div class="item-detail-page-actions">
                <RouterLink
                    v-if="currentProduct"
                    :to="routerLinkI18n({ name: 'ProductEdit', params: { id: currentProduct.id } })"
                    class="theme-button"
                >
                    {{ t('product-target-page.button-go-to-edit') }}
                </RouterLink>
                <RouterLink :to="routerLinkI18n({ name: 'ProductsList' })" class="theme-button">
                    {{ t('product-target-page.button-go-to-list') }}
                </RouterLink>
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
import '@/styles/pages/itemDetail.scss';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useProductsStore } from '@/stores/products';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import ItemDetailField from '@/components/molecules/ItemDetailField.vue';
import MaterialGraphicCard from '@/components/molecules/MaterialGraphicCard.vue';
import MaterialStatCard from '@/components/molecules/MaterialStatCard.vue';
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
const { formatText, formatDateTime, formatNumber, formatFlag } = useItemDetailDisplay();

/**
 * Currency-like number format used for product prices.
 */
const priceFormat = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
} satisfies Intl.NumberFormatOptions;

/**
 * Hero title fallback chain.
 */
const heroTitle = computed(() => currentProduct.value?.title ?? id ?? t('product-target-page.page-title'));

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
