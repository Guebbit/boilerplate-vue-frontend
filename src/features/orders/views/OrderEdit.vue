<template>
    <LayoutDefault id="order-edit-page">
        <template #header>
            <h1 class="text-h4 mb-6">
                <span>{{ t('order-edit-page.page-title') }}</span>
            </h1>
        </template>

        <section class="d-flex flex-column ga-6">
            <VRow>
                <VCol cols="12" lg="6">
                    <ItemDetailHero :title="heroTitle" :description="heroDescription" :eyebrow="id">
                        <template #icon><VIcon icon="$pencil" size="36" /></template>
                    </ItemDetailHero>
                </VCol>

                <VCol cols="12" lg="6">
                    <VRow>
                        <VCol cols="12" md="4">
                            <CardMaterialStat
                                :title="t('order-target-page.label-order-id')"
                                :value="id ?? EMPTY_VALUE"
                            />
                        </VCol>
                        <VCol cols="12" md="4">
                            <CardMaterialStat
                                :title="t('order-target-page.label-status')"
                                :value="orderStatus"
                                accent="secondary"
                            />
                        </VCol>
                        <VCol cols="12" md="4">
                            <CardMaterialStat
                                :title="t('order-target-page.label-total')"
                                :value="formatCurrency(currentOrder?.total)"
                                accent="tertiary"
                            />
                        </VCol>
                    </VRow>
                </VCol>
            </VRow>

            <VRow>
                <VCol cols="12" lg="8">
                    <CardDetail>
                        <div class="mb-4">
                            <h3 class="text-h6">{{ t('generic.details') }}</h3>
                            <p class="text-body-2 mb-0">{{ t('order-edit-page.page-title') }}</p>
                        </div>

                        <VCard class="pa-4" variant="tonal">
                            <form @submit.prevent="submitForm">
                                <VRow>
                                    <VCol cols="12" md="6">
                                        <BaseSelect
                                            v-model="form.status"
                                            :label="t('order-edit-page.label-status')"
                                            :options="statusOptions"
                                            :errors="formErrors.status"
                                            :show-errors="showErrors"
                                        />
                                    </VCol>
                                    <VCol cols="12" md="6">
                                        <BaseInput
                                            v-model="form.email"
                                            type="email"
                                            :label="t('order-edit-page.label-email')"
                                            :errors="formErrors.email"
                                            :show-errors="showErrors"
                                        />
                                    </VCol>
                                    <VCol cols="12">
                                        <div class="d-flex flex-wrap justify-end ga-3">
                                            <BaseButton
                                                type="submit"
                                                :disabled="isSubmitting || loading"
                                            >
                                                {{ t('order-edit-page.button-submit') }}
                                            </BaseButton>
                                            <BaseButton type="button" @click="resetForm">
                                                {{ t('order-edit-page.reset-form') }}
                                            </BaseButton>
                                        </div>
                                    </VCol>
                                </VRow>
                            </form>
                        </VCard>
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
                        <ItemDetailField
                            :label="t('order-target-page.label-items')"
                            :value="currentOrder?.items?.length ?? 0"
                            icon="$package"
                        />
                    </CardDetail>
                </VCol>
            </VRow>

            <div class="d-flex flex-wrap ga-3">
                <VBtn
                    v-if="id"
                    :to="routerLinkI18n({ name: 'OrderTarget', params: { id } })"
                    color="primary"
                    prepend-icon="$eye"
                >
                    {{ t('order-edit-page.button-go-to-details') }}
                </VBtn>
                <VBtn :to="routerLinkI18n({ name: 'OrdersList' })" variant="tonal">
                    {{ t('order-edit-page.button-go-to-list') }}
                </VBtn>
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
import { computed } from 'vue';
import { VBtn, VCard, VCol, VIcon, VRow } from 'vuetify/components';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useOrdersStore } from '@/features/orders/store.ts';
import { z } from 'zod';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';
import BaseSelect from '@/components/atoms/BaseSelect.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import ItemDetailField from '@/components/molecules/ItemDetailField.vue';
import CardDetail from '@/components/organisms/CardDetail.vue';
import CardInfo from '@/components/organisms/CardInfo.vue';
import ItemDetailHero from '@/components/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/components/organisms/CardMaterialStat.vue';
import { useItemDetailRecord } from '@/composables/useItemDetailRecord.ts';
import { useItemDetailForm } from '@/composables/useItemDetailForm.ts';
import { useItemDetailDisplay } from '@/composables/useItemDetailDisplay.ts';
import { notifyErrorMessages } from '@/utils/errors.ts';
import { EMPTY_VALUE } from '@/utils/constants.ts';

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
const { formatText, formatDateTime, formatCurrency } = useItemDetailDisplay();

/**
 * Select options for status updates.
 */
const statusOptions = computed(() =>
    ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'].map((value) => ({
        value,
        label: t(`orders-form.status-${value}`)
    }))
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
    email: z.preprocess(
        (v) => (v === '' ? undefined : v),
        z.email(t('orders-form.email-invalid')).optional()
    )
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
 * Hero texts and status label.
 */
const heroTitle = computed(() => currentOrder.value?.id ?? id ?? t('order-edit-page.page-title'));
const heroDescription = computed(() =>
    formatText(currentOrder.value?.notes || currentOrder.value?.email)
);
const orderStatus = computed(() => {
    const status = currentOrder.value?.status;
    return status ? t(`orders-form.status-${status}`) : EMPTY_VALUE;
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
