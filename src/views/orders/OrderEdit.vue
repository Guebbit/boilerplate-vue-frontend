<template>
    <LayoutDefault id="order-edit-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('order-edit-page.page-title') }}</span>
            </h1>
        </template>

        <div class="theme-card theme-form-container">
            <form class="theme-form" @submit.prevent="submitForm">
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
                <BaseButton type="submit" :disabled="isSubmitting || loading">
                    {{ t('order-edit-page.button-submit') }}
                </BaseButton>
                <BaseButton type="button" @click="resetToCurrentOrder">
                    {{ t('order-edit-page.reset-form') }}
                </BaseButton>
            </form>
        </div>

        <div class="order-edit-actions">
            <RouterLink v-if="id" :to="routerLinkI18n({ name: 'OrderTarget', params: { id } })">
                {{ t('order-edit-page.button-go-to-details') }}
            </RouterLink>
            <RouterLink :to="routerLinkI18n({ name: 'OrdersList' })">
                {{ t('order-edit-page.button-go-to-list') }}
            </RouterLink>
        </div>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'OrderEditPage'
};
</script>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import {
    useNotificationsStore,
    useStructureFormManagement as useStructureFormValidation
} from '@guebbit/vue-toolkit';
import { useOrdersStore } from '@/stores/orders.ts';
import { z } from 'zod';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';
import BaseSelect from '@/components/atoms/BaseSelect.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import { notifyErrorMessages } from '@/utils/helperErrors.ts';

/**
 * Generics
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();

/**
 * Props
 */
const { id } = defineProps<{
    id?: string;
}>();

/**
 * Orders store
 */
const { fetchOrder, updateOrder, zodSchemaOrderStatus } = useOrdersStore();
const { currentOrder, selectedOrderId, loading } = storeToRefs(useOrdersStore());

/**
 * Available status options for the select field
 */
const statusOptions = [
    { value: 'pending', label: 'pending' },
    { value: 'paid', label: 'paid' },
    { value: 'processing', label: 'processing' },
    { value: 'shipped', label: 'shipped' },
    { value: 'delivered', label: 'delivered' },
    { value: 'cancelled', label: 'cancelled' }
];

/**
 * Form definition
 */
interface IOrderEditForm {
    status?: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    email?: string;
}

const editSchema = z.object({
    status: zodSchemaOrderStatus.optional(),
    email: z.preprocess(
        (v) => (v === '' ? undefined : v),
        z.email(t('orders-form.email-invalid')).optional()
    )
});

const { form, formErrors, isSubmitting, handleSubmit } = useStructureFormValidation<IOrderEditForm>(
    {},
    editSchema
);

/**
 * Whether to display validation errors in the UI
 */
const showErrors = ref(false);

/**
 * Reset form to the current order's data
 */
const resetToCurrentOrder = () => {
    form.value = {
        status: currentOrder.value?.status,
        email: currentOrder.value?.email ?? ''
    };
    showErrors.value = false;
};

/**
 * When the order data is loaded, pre-fill the form
 */
watch(
    currentOrder,
    (order) => {
        if (order) resetToCurrentOrder();
    },
    { immediate: true }
);

/**
 * Submit form and update the order
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
 * Load order data on mount
 */
if (id) {
    selectedOrderId.value = id;
    fetchOrder(id);
}
</script>

<style lang="scss">
#order-edit-page {
    .theme-form-container {
        max-width: 600px;
        margin: 100px auto;
        padding: 2rem;
    }

    .order-edit-actions {
        display: flex;
        gap: 12px;
        margin-top: 16px;
    }
}
</style>
