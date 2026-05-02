<template>
    <LayoutDefault id="order-edit-page" class="item-detail-page item-detail-page-order">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('order-edit-page.page-title') }}</span>
            </h1>
        </template>

        <section class="item-detail-page-content">
            <div class="item-detail-page-grid-top">
                <article class="theme-card theme-card-detail item-detail-page-hero animate-on-hover">
                    <div class="item-detail-page-hero-icon" aria-hidden="true">✏️</div>
                    <div>
                        <p v-if="id" class="item-detail-page-eyebrow">{{ id }}</p>
                        <h2 class="item-detail-page-hero-title">{{ heroTitle }}</h2>
                        <p class="item-detail-page-hero-description">{{ heroDescription }}</p>
                    </div>
                </article>

                <div class="item-detail-page-stats">
                    <MaterialStatCard :title="t('order-target-page.label-order-id')" :value="id ?? emptyValue" />
                    <MaterialStatCard :title="t('order-target-page.label-status')" :value="orderStatus" accent="secondary" />
                    <MaterialStatCard
                        :title="t('order-target-page.label-total')"
                        :value="formatNumber(currentOrder?.total, priceFormat)"
                        accent="tertiary"
                    />
                </div>
            </div>

            <div class="item-detail-page-grid-main item-detail-page-grid-main-with-aside">
                <article class="theme-card theme-card-detail item-detail-page-main">
                    <div class="item-detail-page-section-header">
                        <h3>{{ t('generic.details') }}</h3>
                        <p>{{ t('order-edit-page.page-title') }}</p>
                    </div>

                    <form class="theme-form item-detail-page-form" @submit.prevent="submitForm">
                        <BaseSelect
                            v-model="form.status"
                            :label="t('order-edit-page.label-status')"
                            :options="statusOptions"
                            :errors="formErrors.status"
                            :show-errors="showErrors"
                        />
                        <BaseInput
                            v-model="form.email"
                            type="email"
                            :label="t('order-edit-page.label-email')"
                            :errors="formErrors.email"
                            :show-errors="showErrors"
                        />

                        <div class="item-detail-page-form-actions">
                            <BaseButton type="submit" :disabled="isSubmitting || loading">
                                {{ t('order-edit-page.button-submit') }}
                            </BaseButton>
                            <BaseButton type="button" @click="resetForm">
                                {{ t('order-edit-page.reset-form') }}
                            </BaseButton>
                        </div>
                    </form>
                </article>

                <aside class="theme-card theme-card-detail item-detail-page-aside">
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
                    <ItemDetailField
                        :label="t('order-target-page.label-items')"
                        :value="currentOrder?.items?.length ?? 0"
                        icon="📦"
                    />
                </aside>
            </div>

            <div class="item-detail-page-actions">
                <RouterLink v-if="id" :to="routerLinkI18n({ name: 'OrderTarget', params: { id } })" class="theme-button">
                    {{ t('order-edit-page.button-go-to-details') }}
                </RouterLink>
                <RouterLink :to="routerLinkI18n({ name: 'OrdersList' })" class="theme-button">
                    {{ t('order-edit-page.button-go-to-list') }}
                </RouterLink>
            </div>
        </section>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'OrderEditPage'
};
</script>

<script setup lang="ts">
import '@/styles/pages/itemDetail.scss';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useOrdersStore } from '@/stores/orders.ts';
import { z } from 'zod';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';
import BaseSelect from '@/components/atoms/BaseSelect.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import ItemDetailField from '@/components/molecules/ItemDetailField.vue';
import MaterialGraphicCard from '@/components/molecules/MaterialGraphicCard.vue';
import MaterialStatCard from '@/components/molecules/MaterialStatCard.vue';
import { useItemDetailRecord } from '@/composables/useItemDetailRecord.ts';
import { useItemDetailForm } from '@/composables/useItemDetailForm.ts';
import { useItemDetailDisplay } from '@/composables/useItemDetailDisplay.ts';
import { notifyErrorMessages } from '@/utils/helperErrors.ts';

/**
 * Generic utility hooks.
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
 * Orders store APIs and references.
 */
const { fetchOrder, updateOrder, zodSchemaOrderStatus } = useOrdersStore();
const { currentOrder, selectedOrderId, loading } = storeToRefs(useOrdersStore());

/**
 * Shared detail formatters.
 */
const { emptyValue, formatText, formatDateTime, formatNumber } = useItemDetailDisplay();

/**
 * Select options for status updates.
 */
const statusOptions = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'].map(
    (value) => ({
        value,
        label: t(`orders-form.status-${value}`)
    })
);

/**
 * Order edit form model.
 */
interface IOrderEditForm {
    status?: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    email?: string;
}

/**
 * Validation schema for order updates.
 */
const editSchema = z.object({
    status: zodSchemaOrderStatus.optional(),
    email: z.preprocess((v) => (v === '' ? undefined : v), z.email(t('orders-form.email-invalid')).optional())
});

/**
 * Toolkit-managed form state.
 */
const { form, formErrors, isSubmitting, handleSubmit } = useStructureFormValidation<IOrderEditForm>(
    {},
    editSchema
);

/**
 * Auto-hydration watcher and reset helper.
 */
const { showErrors, resetForm } = useItemDetailForm({
    currentItem: currentOrder,
    form,
    mapToForm: (order) => ({
        status: order?.status,
        email: order?.email ?? ''
    })
});

/**
 * Money formatting configuration.
 */
const priceFormat = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
} satisfies Intl.NumberFormatOptions;

/**
 * Hero texts and status label.
 */
const heroTitle = computed(() => currentOrder.value?.id ?? id ?? t('order-edit-page.page-title'));
const heroDescription = computed(() => formatText(currentOrder.value?.notes || currentOrder.value?.email));
const orderStatus = computed(() => {
    const status = currentOrder.value?.status;
    return status ? t(`orders-form.status-${status}`) : '—';
});

/**
 * Validates and persists order updates.
 */
const submitForm = () =>
    handleSubmit(async () => {
        if (!id) return;
        await updateOrder(id, {
            status: form.value.status,
            email: form.value.email || undefined
        });
        addMessage(t('order-edit-page.success-update'));
        showErrors.value = false;
    })
        .then((success) => {
            if (!success) showErrors.value = true;
        })
        .catch((error) => notifyErrorMessages(addMessage, error));

/**
 * Activates mount-time order loading.
 */
useItemDetailRecord({
    id,
    selectedId: selectedOrderId,
    fetchRecord: fetchOrder
});
</script>
