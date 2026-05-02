<template>
    <ItemDetailPage
        page-id="order-target"
        page-class="order-detail"
        :page-title="t('order-target-page.page-title')"
        :hero-eyebrow="currentOrder?.id"
        :hero-title="heroTitle"
        :hero-description="heroDescription"
        hero-icon="🧾"
        :section-title="t('generic.details')"
    >
        <template #stats>
            <MaterialStatCard :title="t('order-target-page.label-status')" :value="orderStatus" />
            <MaterialStatCard
                :title="t('order-target-page.label-total')"
                :value="formatNumber(currentOrder?.total, priceFormat)"
                accent="secondary"
            />
            <MaterialStatCard
                :title="t('order-target-page.label-items')"
                :value="currentOrder?.items?.length ?? 0"
                accent="tertiary"
            />
        </template>

        <template v-if="currentOrder">
            <ItemDetailField :label="t('order-target-page.label-order-id')" :value="currentOrder.id" icon="#" />
            <ItemDetailField :label="t('order-target-page.label-status')" icon="●">
                <span class="item-detail__status-chip">{{ orderStatus }}</span>
            </ItemDetailField>
            <ItemDetailField
                :label="t('order-target-page.label-total')"
                :value="formatNumber(currentOrder.total, priceFormat)"
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
        </template>
        <p v-else class="item-detail__empty">{{ t('order-target-page.loading') }}</p>

        <template #aside>
            <MaterialGraphicCard :title="heroTitle" :description="heroDescription" variant="tertiary" />
            <ItemDetailField
                :label="t('order-target-page.label-date')"
                :value="formatDateTime(currentOrder?.createdAt)"
                icon="📅"
            />
            <ItemDetailField
                :label="t('product-target-page.label-updated-at')"
                :value="formatDateTime(currentOrder?.updatedAt)"
                icon="🕘"
            />

            <div>
                <h3 class="item-detail__aside-title">{{ t('order-target-page.label-items') }}</h3>
                <div v-if="currentOrder?.items?.length" class="item-detail__item-list">
                    <article
                        v-for="item in currentOrder.items"
                        :key="'order-item-' + item.product.id"
                        class="item-detail__item-card"
                    >
                        <div class="item-detail__item-card-header">
                            <span>{{ item.product.title || item.product.id }}</span>
                            <span class="item-detail__status-chip">× {{ item.quantity }}</span>
                        </div>
                        <div class="item-detail__inline-pair">
                            <p>{{ t('order-target-page.label-product-id') }}</p>
                            <strong>{{ item.product.id }}</strong>
                        </div>
                    </article>
                </div>
                <p v-else class="item-detail__aside-text">{{ t('generic.no-data') }}</p>
            </div>
        </template>

        <template #actions>
            <RouterLink
                v-if="currentOrder"
                :to="routerLinkI18n({ name: 'OrderEdit', params: { id: currentOrder.id } })"
                class="theme-button"
            >
                {{ t('order-target-page.button-go-to-edit') }}
            </RouterLink>
            <button v-if="currentOrder" class="theme-button" :disabled="loading" @click="downloadInvoice">
                {{ t('order-target-page.button-download-invoice') }}
            </button>
            <RouterLink :to="routerLinkI18n({ name: 'OrdersList' })" class="theme-button">
                {{ t('order-target-page.button-go-to-list') }}
            </RouterLink>
        </template>
    </ItemDetailPage>
</template>

<script lang="ts">
export default {
    name: 'OrderTargetPage'
};
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useOrdersStore } from '@/stores/orders.ts';
import ItemDetailPage from '@/components/organisms/ItemDetailPage.vue';
import ItemDetailField from '@/components/molecules/ItemDetailField.vue';
import MaterialGraphicCard from '@/components/molecules/MaterialGraphicCard.vue';
import MaterialStatCard from '@/components/molecules/MaterialStatCard.vue';
import { useItemDetailRecord } from '@/composables/useItemDetailRecord.ts';
import { useItemDetailDisplay } from '@/composables/useItemDetailDisplay.ts';
import { notifyErrorMessages } from '@/utils/helperErrors.ts';

const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const { id } = defineProps<{
    id?: string;
}>();

const { fetchOrder, getOrderInvoice } = useOrdersStore();
const { currentOrder, selectedOrderId, loading } = storeToRefs(useOrdersStore());
const { formatText, formatDateTime, formatNumber, formatEnumLabel } = useItemDetailDisplay();

const priceFormat = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
} satisfies Intl.NumberFormatOptions;

const heroTitle = computed(() => currentOrder.value?.id ?? id ?? t('order-target-page.page-title'));
const heroDescription = computed(() => formatText(currentOrder.value?.notes || currentOrder.value?.email));
const orderStatus = computed(() => {
    const status = currentOrder.value?.status;
    return status ? t(`orders-form.status-${status}`) : formatEnumLabel(status);
});

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

useItemDetailRecord({
    id,
    selectedId: selectedOrderId,
    fetchRecord: fetchOrder
});
</script>
