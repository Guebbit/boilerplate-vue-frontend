<template>
    <ItemDetailPage
        page-id="product-target"
        page-class="product-detail"
        :page-title="t('product-target-page.page-title')"
        :hero-eyebrow="currentProduct?.id"
        :hero-title="heroTitle"
        :hero-description="heroDescription"
        hero-icon="📦"
        :section-title="t('generic.details')"
    >
        <template #stats>
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
        </template>

        <template v-if="currentProduct">
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
                <span class="item-detail__status-chip">{{ productStatus }}</span>
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
        </template>
        <p v-else class="item-detail__empty">{{ t('generic.loading-state') }}</p>

        <template #aside>
            <MaterialGraphicCard
                :title="heroTitle"
                :description="heroDescription"
                variant="primary"
            />
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
        </template>

        <template #actions>
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
        </template>
    </ItemDetailPage>
</template>

<script lang="ts">
export default {
    name: 'ProductTargetPage'
};
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useProductsStore } from '@/stores/products';
import ItemDetailPage from '@/components/organisms/ItemDetailPage.vue';
import ItemDetailField from '@/components/molecules/ItemDetailField.vue';
import MaterialGraphicCard from '@/components/molecules/MaterialGraphicCard.vue';
import MaterialStatCard from '@/components/molecules/MaterialStatCard.vue';
import { useItemDetailRecord } from '@/composables/useItemDetailRecord.ts';
import { useItemDetailDisplay } from '@/composables/useItemDetailDisplay.ts';

const { t } = useI18n();
const { id } = defineProps<{
    id?: string;
}>();

const { fetchProduct } = useProductsStore();
const { currentProduct, selectedProductId } = storeToRefs(useProductsStore());
const { formatText, formatDateTime, formatNumber, formatFlag } = useItemDetailDisplay();

const priceFormat = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
} satisfies Intl.NumberFormatOptions;

const heroTitle = computed(() => currentProduct.value?.title ?? id ?? t('product-target-page.page-title'));
const heroDescription = computed(() => formatText(currentProduct.value?.description));
const productStatus = computed(() =>
    formatFlag(currentProduct.value?.active, t('generic.enabled'), t('generic.disabled'))
);

useItemDetailRecord({
    id,
    selectedId: selectedProductId,
    fetchRecord: fetchProduct
});
</script>
