<template>
    <LayoutDefault id="order-target" class="item-detail-page item-detail-page-order">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('order-target-page.page-title') }}</span>
            </h1>
        </template>

        <section class="item-detail-page-content">
            <div class="item-detail-page-grid-top">
                <DetailCard class="item-detail-page-hero animate-on-hover">
                    <div class="item-detail-page-hero-icon" aria-hidden="true">🧾</div>
                    <div>
                        <p v-if="currentOrder?.id" class="item-detail-page-eyebrow">
                            {{ currentOrder.id }}
                        </p>
                        <h2 class="item-detail-page-hero-title">{{ heroTitle }}</h2>
                        <p class="item-detail-page-hero-description">{{ heroDescription }}</p>
                    </div>
                </DetailCard>

                <div class="item-detail-page-stats">
                    <MaterialStatCard
                        :title="t('order-target-page.label-status')"
                        :value="orderStatus"
                    />
                    <MaterialStatCard
                        :title="t('order-target-page.label-total')"
                        :value="formatCurrency(currentOrder?.total)"
                        accent="secondary"
                    />
                    <MaterialStatCard
                        :title="t('order-target-page.label-items')"
                        :value="currentOrder?.items?.length ?? 0"
                        accent="tertiary"
                    />
                </div>
            </div>

            <div class="item-detail-page-grid-main item-detail-page-grid-main-with-aside">
                <DetailCard class="item-detail-page-main">
                    <div class="item-detail-page-section-header">
                        <h3>{{ t('generic.details') }}</h3>
                    </div>

                    <div v-if="currentOrder" class="item-detail-page-grid-fields">
                        <ItemDetailField
                            :label="t('order-target-page.label-order-id')"
                            :value="currentOrder.id"
                            icon="#"
                        />
                        <ItemDetailField :label="t('order-target-page.label-status')" icon="●">
                            <span class="item-detail-page-status-chip">{{ orderStatus }}</span>
                        </ItemDetailField>
                        <ItemDetailField
                            :label="t('order-target-page.label-total')"
                            :value="formatCurrency(currentOrder.total)"
                            icon="💶"
                        />
                        <ItemDetailField
                            :label="t('orders-list-page.filter-email')"
                            :value="formatText(currentOrder.email)"
                            icon="✉"
                        />
                        <ItemDetailField
                            :label="t('order-target-page.label-notes')"
                            :value="formatText(currentOrder.notes)"
                            icon="📝"
                            full-width
                        />
                    </div>
                    <p v-else class="item-detail-page-empty">
                        {{ t('order-target-page.loading') }}
                    </p>
                </DetailCard>

                <DetailCard as="aside" class="item-detail-page-aside">
                    <MaterialGraphicCard
                        :title="heroTitle"
                        :description="heroDescription"
                        variant="tertiary"
                    />
                    <ItemDetailField
                        :label="t('order-target-page.label-date')"
                        :value="formatDateTime(currentOrder?.createdAt)"
                        icon="📅"
                    />
                    <ItemDetailField
                        :label="t('order-target-page.label-updated-at')"
                        :value="formatDateTime(currentOrder?.updatedAt)"
                        icon="🕘"
                    />

                    <div>
                        <h3 class="item-detail-page-aside-title">
                            {{ t('order-target-page.label-items') }}
                        </h3>
                        <div v-if="currentOrder?.items?.length" class="item-detail-page-item-list">
                            <article
                                v-for="item in currentOrder.items"
                                :key="'order-item-' + item.product.id"
                                class="item-detail-page-item-card"
                            >
                                <div class="item-detail-page-item-header">
                                    <span>{{ item.product.title || item.product.id }}</span>
                                    <span class="item-detail-page-status-chip"
                                        >× {{ item.quantity }}</span
                                    >
                                </div>
                                <div class="item-detail-page-item-row">
                                    <p>{{ t('order-target-page.label-product-id') }}</p>
                                    <strong>{{ item.product.id }}</strong>
                                </div>
                            </article>
                        </div>
                        <p v-else class="item-detail-page-aside-text">{{ t('generic.no-data') }}</p>
                    </div>
                </DetailCard>
            </div>

            <div class="item-detail-page-actions">
                <RouterLink
                    v-if="currentOrder"
                    :to="routerLinkI18n({ name: 'OrderEdit', params: { id: currentOrder.id } })"
                    class="theme-button"
                >
                    {{ t('order-target-page.button-go-to-edit') }}
                </RouterLink>
                <button
                    v-if="currentOrder"
                    class="theme-button"
                    :disabled="loading"
                    @click="downloadInvoice"
                >
                    {{ t('order-target-page.button-download-invoice') }}
                </button>
                <RouterLink :to="routerLinkI18n({ name: 'OrdersList' })" class="theme-button">
                    {{ t('order-target-page.button-go-to-list') }}
                </RouterLink>
            </div>
        </section>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'OrderTargetPage'
};
</script>

<script setup lang="ts">
import '@/styles/features/itemDetail.scss';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useOrdersStore } from '@/stores/orders.ts';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import ItemDetailField from '@/components/molecules/ItemDetailField.vue';
import DetailCard from '@/components/molecules/DetailCard.vue';
import MaterialGraphicCard from '@/components/molecules/MaterialGraphicCard.vue';
import MaterialStatCard from '@/components/molecules/MaterialStatCard.vue';
import { useItemDetailRecord } from '@/composables/useItemDetailRecord.ts';
import { useItemDetailDisplay } from '@/composables/useItemDetailDisplay.ts';
import { notifyErrorMessages } from '@/utils/helperErrors.ts';
import { EMPTY_VALUE } from '@/utils/constants.ts';

/**
 * Generic translation and notification accessors.
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();

/**
 * Route order id.
 */
const { id } = defineProps<{
    id?: string;
}>();

/**
 * Store API and reactive order references.
 */
const { fetchOrder, getOrderInvoice } = useOrdersStore();
const { currentOrder, selectedOrderId, loading } = storeToRefs(useOrdersStore());

/**
 * Shared value formatting helpers.
 */
const { formatText, formatDateTime, formatCurrency } = useItemDetailDisplay();

/**
 * Hero labels and localized status.
 */
const heroTitle = computed(() => currentOrder.value?.id ?? id ?? t('order-target-page.page-title'));
const heroDescription = computed(() =>
    formatText(currentOrder.value?.notes || currentOrder.value?.email)
);
const orderStatus = computed(() => {
    const status = currentOrder.value?.status;
    return status ? t(`orders-form.status-${status}`) : EMPTY_VALUE;
});

/**
 * Downloads the server-generated invoice as PDF.
 */
const downloadInvoice = async () => {
    if (!id) return;
    try {
        const response = await getOrderInvoice(id);
        const blob = response?.data as Blob | undefined;
        if (!blob) return;
        const url = globalThis.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `order-${id}-invoice.pdf`;
        document.body.append(link);
        link.click();
        link.remove();
        globalThis.URL.revokeObjectURL(url);
    } catch (error: unknown) {
        notifyErrorMessages(addMessage, error);
    }
};

/**
 * Activates mount-time order loading.
 */
useItemDetailRecord({
    id,
    selectedId: selectedOrderId,
    fetchRecord: fetchOrder
});
</script>
