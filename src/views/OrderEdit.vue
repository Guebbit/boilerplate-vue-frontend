<template>
    <LayoutDefault id="order-edit-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('order-edit-page.page-title') }}</span>
            </h1>
        </template>

        <div class="theme-card theme-form-container">
            <form class="theme-form" @submit.prevent="submitForm">
                <div
                    class="theme-form-input"
                    :class="{ 'form-error': showErrors && formErrors.status }"
                >
                    <label for="edit-status">{{ t('order-edit-page.label-status') }}</label>
                    <select
                        v-model="form.status"
                        id="edit-status"
                        class="theme-input"
                    >
                        <option value="pending">pending</option>
                        <option value="paid">paid</option>
                        <option value="processing">processing</option>
                        <option value="shipped">shipped</option>
                        <option value="delivered">delivered</option>
                        <option value="cancelled">cancelled</option>
                    </select>
                    <p v-if="showErrors && formErrors.status" class="form-error-message">
                        {{ formErrors.status.join(', ') }}
                    </p>
                </div>

                <div
                    class="theme-form-input"
                    :class="{ 'form-error': showErrors && formErrors.email }"
                >
                    <label for="edit-email">{{ t('order-edit-page.label-email') }}</label>
                    <input
                        v-model="form.email"
                        type="email"
                        id="edit-email"
                        class="theme-input"
                    />
                    <p v-if="showErrors && formErrors.email" class="form-error-message">
                        {{ formErrors.email.join(', ') }}
                    </p>
                </div>

                <br />

                <button type="submit" class="theme-button" :disabled="isSubmitting || loading">
                    {{ t('order-edit-page.button-submit') }}
                </button>
                <button type="button" class="theme-button" @click="resetToCurrentOrder">
                    {{ t('order-edit-page.reset-form') }}
                </button>
            </form>
        </div>

        <div class="order-edit-actions">
            <RouterLink
                v-if="id"
                :to="routerLinkI18n({ name: 'OrderTarget', params: { id } })"
            >
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
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useOrdersStore } from '@/stores/orders.ts';
import { z } from 'zod';

import LayoutDefault from '@/layouts/LayoutDefault.vue';

const { t } = useI18n();
const { addMessage } = useNotificationsStore();

const { id } = defineProps<{
    id?: string;
}>();

const { fetchOrder, updateOrder, zodSchemaOrderStatus } = useOrdersStore();
const { currentOrder, selectedOrderId, loading } = storeToRefs(useOrdersStore());

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

const { form, formErrors, isSubmitting, handleSubmit } =
    useStructureFormValidation<IOrderEditForm>({}, editSchema);

const showErrors = ref(false);

const resetToCurrentOrder = () => {
    form.value = {
        status: currentOrder.value?.status,
        email: currentOrder.value?.email ?? ''
    };
    showErrors.value = false;
};

watch(
    currentOrder,
    (order) => {
        if (order) resetToCurrentOrder();
    },
    { immediate: true }
);

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
        .catch(({ message }: { message: string }) => addMessage(message));

if (id) {
    selectedOrderId.value = id;
    fetchOrder(id);
}
</script>

<style lang="scss">
@use '@/assets/styles/components/forms';

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
