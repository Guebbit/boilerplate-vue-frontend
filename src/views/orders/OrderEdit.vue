<template>
    <ItemDetailPage
        page-id="order-edit-page"
        page-class="order-detail"
        :page-title="t('order-edit-page.page-title')"
        :hero-eyebrow="id"
        :hero-title="heroTitle"
        :hero-description="heroDescription"
        hero-icon="✏️"
        :section-title="t('generic.details')"
        :section-description="t('order-edit-page.page-title')"
        edit-mode
        @submit="submitForm"
    >
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

        <div class="item-detail__form-actions">
            <BaseButton type="submit" :disabled="isSubmitting || loading">
                {{ t('order-edit-page.button-submit') }}
            </BaseButton>
            <BaseButton type="button" @click="resetForm">
                {{ t('order-edit-page.reset-form') }}
            </BaseButton>
        </div>

        <template #stats>
            <MaterialStatCard :title="t('order-target-page.label-order-id')" :value="id ?? emptyValue" />
            <MaterialStatCard :title="t('order-target-page.label-status')" :value="orderStatus" accent="secondary" />
            <MaterialStatCard
                :title="t('order-target-page.label-total')"
                :value="formatNumber(currentOrder?.total, priceFormat)"
                accent="tertiary"
            />
        </template>

        <template #aside>
            <MaterialGraphicCard :title="heroTitle" :description="heroDescription" variant="tertiary" />
            <ItemDetailField
                :label="t('order-target-page.label-date')"
                :value="formatDateTime(currentOrder?.createdAt)"
                icon="��"
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
        </template>

        <template #actions>
            <RouterLink v-if="id" :to="routerLinkI18n({ name: 'OrderTarget', params: { id } })" class="theme-button">
                {{ t('order-edit-page.button-go-to-details') }}
            </RouterLink>
            <RouterLink :to="routerLinkI18n({ name: 'OrdersList' })" class="theme-button">
                {{ t('order-edit-page.button-go-to-list') }}
            </RouterLink>
        </template>
    </ItemDetailPage>
</template>

<script lang="ts">
export default {
    name: 'OrderEditPage'
};
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useOrdersStore } from '@/stores/orders.ts';
import { z } from 'zod';
import BaseInput from '@/components/atoms/BaseInput.vue';
import BaseSelect from '@/components/atoms/BaseSelect.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import ItemDetailPage from '@/components/organisms/ItemDetailPage.vue';
import ItemDetailField from '@/components/molecules/ItemDetailField.vue';
import MaterialGraphicCard from '@/components/molecules/MaterialGraphicCard.vue';
import MaterialStatCard from '@/components/molecules/MaterialStatCard.vue';
import { useItemDetailRecord } from '@/composables/useItemDetailRecord.ts';
import { useItemDetailForm } from '@/composables/useItemDetailForm.ts';
import { useItemDetailDisplay } from '@/composables/useItemDetailDisplay.ts';
import { notifyErrorMessages } from '@/utils/helperErrors.ts';

const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const { id } = defineProps<{
    id?: string;
}>();

const { fetchOrder, updateOrder, zodSchemaOrderStatus } = useOrdersStore();
const { currentOrder, selectedOrderId, loading } = storeToRefs(useOrdersStore());
const { emptyValue, formatText, formatDateTime, formatNumber, formatEnumLabel } = useItemDetailDisplay();

const statusOptions = [
    'pending',
    'paid',
    'processing',
    'shipped',
    'delivered',
    'cancelled'
].map((value) => ({
    value,
    label: t(`orders-form.status-${value}`)
}));

interface IOrderEditForm {
    status?: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    email?: string;
}

const editSchema = z.object({
    status: zodSchemaOrderStatus.optional(),
    email: z.preprocess((v) => (v === '' ? undefined : v), z.email(t('orders-form.email-invalid')).optional())
});

const { form, formErrors, isSubmitting, handleSubmit } = useStructureFormValidation<IOrderEditForm>(
    {},
    editSchema
);

const { showErrors, resetForm } = useItemDetailForm({
    currentItem: currentOrder,
    form,
    mapToForm: (order) => ({
        status: order?.status,
        email: order?.email ?? ''
    })
});

const priceFormat = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
} satisfies Intl.NumberFormatOptions;

const heroTitle = computed(() => currentOrder.value?.id ?? id ?? t('order-edit-page.page-title'));
const heroDescription = computed(() => formatText(currentOrder.value?.notes || currentOrder.value?.email));
const orderStatus = computed(() => {
    const status = currentOrder.value?.status;
    return status ? t(`orders-form.status-${status}`) : formatEnumLabel(status);
});

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

useItemDetailRecord({
    id,
    selectedId: selectedOrderId,
    fetchRecord: fetchOrder
});
</script>
