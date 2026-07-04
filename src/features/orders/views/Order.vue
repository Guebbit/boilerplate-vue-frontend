<template>
    <LayoutDefault id="order-target">
        <template #header>
            <h1 class="text-h4 mb-6">
                <span>{{ t('order-target-page.page-title') }}</span>
            </h1>
        </template>

        <section class="d-flex flex-column ga-6">
            <VRow>
                <VCol cols="12" lg="6">
                    <ItemDetailHero
                        :title="heroTitle"
                        :description="heroDescription"
                        :eyebrow="currentOrder?.id"
                    >
                        <template #icon><VIcon icon="$cart" size="36" /></template>
                    </ItemDetailHero>
                </VCol>

                <VCol cols="12" lg="6">
                    <VRow>
                        <VCol cols="12" md="4">
                            <CardMaterialStat
                                :title="t('order-target-page.label-status')"
                                :value="orderStatus"
                            />
                        </VCol>
                        <VCol cols="12" md="4">
                            <CardMaterialStat
                                :title="t('order-target-page.label-total')"
                                :value="formatCurrency(currentOrder?.total)"
                                accent="secondary"
                            />
                        </VCol>
                        <VCol cols="12" md="4">
                            <CardMaterialStat
                                :title="t('order-target-page.label-items')"
                                :value="currentOrder?.items?.length ?? 0"
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

                        <VRow v-if="currentOrder">
                            <VCol cols="12" md="6">
                                <ItemDetailField
                                    :label="t('order-target-page.label-order-id')"
                                    :value="currentOrder.id"
                                    icon="#"
                                />
                            </VCol>
                            <VCol cols="12" md="6">
                                <ItemDetailField
                                    :label="t('order-target-page.label-status')"
                                    icon="●"
                                >
                                    <VChip color="primary" variant="tonal">{{ orderStatus }}</VChip>
                                </ItemDetailField>
                            </VCol>
                            <VCol cols="12" md="6">
                                <ItemDetailField
                                    :label="t('order-target-page.label-total')"
                                    :value="formatCurrency(currentOrder.total)"
                                    icon="💶"
                                />
                            </VCol>
                            <VCol cols="12" md="6">
                                <ItemDetailField
                                    :label="t('orders-list-page.filter-email')"
                                    :value="formatText(currentOrder.email)"
                                    icon="✉"
                                />
                            </VCol>
                            <VCol cols="12">
                                <ItemDetailField
                                    :label="t('order-target-page.label-notes')"
                                    :value="formatText(currentOrder.notes)"
                                    icon="📝"
                                    full-width
                                />
                            </VCol>
                        </VRow>
                        <p v-else class="text-body-1 mb-0">
                            {{ t('order-target-page.loading') }}
                        </p>
                    </CardDetail>
                </VCol>

                <VCol cols="12" lg="4">
                    <CardDetail as="aside" class="d-flex flex-column ga-4">
                        <CardInfo
                            :title="heroTitle"
                            :description="heroDescription"
                            variant="tertiary"
                        >
                            <template #icon><VIcon icon="$cart" size="32" /></template>
                        </CardInfo>
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
                            <h3 class="text-h6 mb-3">
                                {{ t('order-target-page.label-items') }}
                            </h3>
                            <div v-if="currentOrder?.items?.length" class="d-flex flex-column ga-3">
                                <VCard
                                    v-for="item in currentOrder.items"
                                    :key="'order-item-' + item.product.id"
                                    variant="tonal"
                                >
                                    <VCardText>
                                        <div
                                            class="d-flex align-center justify-space-between ga-3 mb-2"
                                        >
                                            <span class="font-weight-medium">
                                                {{ item.product.title || item.product.id }}
                                            </span>
                                            <VChip size="small" color="primary" variant="tonal">
                                                × {{ item.quantity }}
                                            </VChip>
                                        </div>
                                        <div class="d-flex align-center justify-space-between ga-3">
                                            <p class="text-body-2 mb-0">
                                                {{ t('order-target-page.label-product-id') }}
                                            </p>
                                            <strong>{{ item.product.id }}</strong>
                                        </div>
                                    </VCardText>
                                </VCard>
                            </div>
                            <p v-else class="text-body-2 mb-0">{{ t('generic.no-data') }}</p>
                        </div>
                    </CardDetail>
                </VCol>
            </VRow>

            <div class="d-flex flex-wrap ga-3">
                <VBtn
                    v-if="currentOrder"
                    :to="routerLinkI18n({ name: 'OrderEdit', params: { id: currentOrder.id } })"
                    color="primary"
                    prepend-icon="$pencil"
                >
                    {{ t('order-target-page.button-go-to-edit') }}
                </VBtn>
                <VBtn
                    v-if="currentOrder"
                    variant="tonal"
                    prepend-icon="$info"
                    :disabled="loading"
                    @click="downloadInvoice"
                >
                    {{ t('order-target-page.button-download-invoice') }}
                </VBtn>
                <VBtn :to="routerLinkI18n({ name: 'OrdersList' })" variant="tonal">
                    {{ t('order-target-page.button-go-to-list') }}
                </VBtn>
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
import { computed } from 'vue';
import { VBtn, VCard, VCardText, VChip, VCol, VIcon, VRow } from 'vuetify/components';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useOrdersStore } from '@/features/orders/store.ts';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import ItemDetailField from '@/components/molecules/ItemDetailField.vue';
import CardDetail from '@/components/organisms/CardDetail.vue';
import CardInfo from '@/components/organisms/CardInfo.vue';
import ItemDetailHero from '@/components/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/components/organisms/CardMaterialStat.vue';
import { useItemDetailRecord } from '@/composables/useItemDetailRecord.ts';
import { useItemDetailDisplay } from '@/composables/useItemDetailDisplay.ts';
import { notifyErrorMessages } from '@/utils/errors.ts';
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
