<template>
    <LayoutDefault id="order-edit-page" class="item-detail-page item-detail-page-order">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('order-edit-page.page-title') }}</span>
            </h1>
        </template>

        <section class="item-detail-page-content">
            <div class="item-detail-page-grid-top">
                <ItemDetailHero :title="heroTitle" :description="heroDescription" :eyebrow="id">
                    <template #icon><Pencil :size="32" /></template>
                </ItemDetailHero>

                <div class="item-detail-page-stats">
                    <CardMaterialStat
                        :title="t('order-target-page.label-order-id')"
                        :value="id ?? EMPTY_VALUE"
                    />
                    <CardMaterialStat
                        :title="t('order-target-page.label-status')"
                        :value="orderStatus"
                        accent="secondary"
                    />
                    <CardMaterialStat
                        :title="t('order-target-page.label-total')"
                        :value="formatCurrency(currentOrder?.total)"
                        accent="tertiary"
                    />
                </div>
            </div>

            <div class="item-detail-page-grid-main item-detail-page-grid-main-with-aside">
                <CardDetail class="item-detail-page-main">
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
                            :show-errors="showFormErrors"
                        />
                        <BaseInput
                            v-model="form.email"
                            type="email"
                            :label="t('order-edit-page.label-email')"
                            :errors="formErrors.email"
                            :show-errors="showFormErrors"
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
                </CardDetail>

                <CardDetail as="aside" class="item-detail-page-aside">
                    <CardInfo :title="heroTitle" :description="heroDescription" variant="tertiary">
                        <template #icon><ShoppingCart :size="28" /></template>
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
                        icon="📦"
                    />
                </CardDetail>
            </div>

            <div class="item-detail-page-actions">
                <RouterLink
                    v-if="id"
                    :to="routerLinkI18n({ name: 'OrderTarget', params: { id } })"
                    class="theme-button"
                >
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
import '@/styles/features/itemDetail.scss';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useOrdersStore } from '@/features/orders/store.ts';
import { createOrderStatusSchema } from '@/features/orders/schemas.ts';
import { z } from 'zod';
import { OrderStatus } from '@types';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';
import BaseSelect from '@/components/atoms/BaseSelect.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import { Pencil, ShoppingCart } from 'lucide-vue-next';
import ItemDetailField from '@/components/molecules/ItemDetailField.vue';
import CardDetail from '@/components/organisms/CardDetail.vue';
import CardInfo from '@/components/organisms/CardInfo.vue';
import ItemDetailHero from '@/components/organisms/ItemDetailHero.vue';
import CardMaterialStat from '@/components/organisms/CardMaterialStat.vue';
import { formatText, formatDateTime, formatCurrency } from '@/utils/formatters.ts';
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
const { watchOrder, updateOrder } = useOrdersStore();
const zodSchemaOrderStatus = createOrderStatusSchema(t);
const { currentOrder, loading } = storeToRefs(useOrdersStore());

/**
 * Select options for status updates.
 */
const statusOptions = computed(() =>
    Object.values(OrderStatus).map((value) => ({
        value,
        label: t(`orders-form.status-${value}`)
    }))
);

/**
 * Order edit form model.
 */
interface IOrderEditForm {
    status?: OrderStatus;
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
const {
    form,
    formErrors,
    showFormErrors,
    isSubmitting,
    resetForm,
    handleSubmit,
    activateAutoHydrate
} = useStructureFormValidation<IOrderEditForm>({}, editSchema);

/**
 * Auto-hydrate the form from the fetched record once it resolves.
 */
activateAutoHydrate(
    computed(() =>
        currentOrder.value
            ? {
                  status: currentOrder.value.status,
                  email: currentOrder.value.email ?? ''
              }
            : undefined
    )
);

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
        showFormErrors.value = false;
    })
        .then((success) => {
            if (!success) showFormErrors.value = true;
        })
        .catch((error) => notifyErrorMessages(addMessage, error));

/**
 * Selects and (re)fetches the order whenever the route id changes.
 */
watchOrder(() => id);
</script>
